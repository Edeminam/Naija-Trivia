import { describe, it, expect, beforeAll } from "vitest";
import { PREMIUM_MONTHLY_COINS, FIRST_WIN_BONUS, COINS, STATE_WAR_PRIZES, QUESTIONS_PER_MATCH, addDays, lagosWeekStart, themeFor, lagosDate, themedWinCoins } from "@ntc/shared";
import { createTestDb, type Sql } from "../src/db";
import { createDevUser } from "../src/auth";
import { persistMatchResult, type MatchPlayerInput } from "../src/repo/matches";
import { completeDaily, getStreak, startOfflineDaily, submitOfflineDaily, dailyStatus, startDaily } from "../src/repo/daily";
import { getQuestions, shuffleSeeded } from "../src/repo/questions";
import { applyPremiumPerks } from "../src/repo/premium";
import { purchaseProduct } from "../src/repo/shop";
import { listAchievements, claimAchievement } from "../src/repo/achievements";
import { requestFriend, acceptFriend, listFriends, findRival, searchPlayers, removeFriend, friendStatus } from "../src/repo/friends";
import { createChallenge, incomingChallenges } from "../src/repo/challenges";
import { settleStateWeek, detectOvertakes, stateWars } from "../src/repo/leaderboards";

let sql: Sql;
let questions: { id: string; category_id: string }[];

beforeAll(async () => {
  sql = await createTestDb();
  questions = await sql.query("select id, category_id from questions where status = 'live' limit 7");
}, 60_000);

async function player(name: string, state = "LA") {
  const id = await createDevUser(sql, { guest: false, username: name });
  await sql.query("update profiles set state_code = $2, coins = 0 where id = $1", [id, state]);
  return id;
}

const seat = (id: string, score: number, allCorrect = false): MatchPlayerInput => ({
  id,
  isBot: false,
  isGuest: false,
  rating: 1000,
  score,
  totalMs: 20_000,
  shieldConsumed: false,
  answers: questions.map((q, i) => ({ round: i + 1, questionId: q.id, categoryId: q.category_id, optionIndex: 0, correct: allCorrect || i === 0, points: 100, ms: 2000 })),
});

const coinsOf = async (id: string) => (await sql.one<{ coins: number }>("select coins from profiles where id = $1", [id]))!.coins;

describe("first win of the day", () => {
  it("pays the bonus on the first win only, and reports it", async () => {
    const a = await player("fw_a");
    const b = await player("fw_b");
    const base = themedWinCoins(themeFor(lagosDate()));
    const r1 = await persistMatchResult(sql, { mode: "ranked", categories: [], a: seat(a, 900, true), b: seat(b, 100) });
    const win1 = r1.players[a]!;
    expect(win1.bonuses.map((x) => x.kind)).toContain("first_win");
    expect(win1.coins).toBe(base + FIRST_WIN_BONUS);
    expect(win1.achievements).toEqual(expect.arrayContaining(["first_win", "perfect_match"]));
    expect(r1.players[b]!.bonuses).toEqual([]);
    expect(r1.players[b]!.coins).toBe(COINS.loss);

    const r2 = await persistMatchResult(sql, { mode: "ranked", categories: [], a: seat(a, 900), b: seat(b, 100) });
    expect(r2.players[a]!.bonuses.some((x) => x.kind === "first_win")).toBe(false);
    expect(await coinsOf(a)).toBe(base + FIRST_WIN_BONUS + base);
  });
});

describe("achievements", () => {
  it("unlocks on the event, claims once for coins", async () => {
    const a = await player("ach_a");
    const b = await player("ach_b");
    await persistMatchResult(sql, { mode: "ranked", categories: [], a: seat(a, 900), b: seat(b, 100) });
    const list = await listAchievements(sql, a);
    const first = list.find((x) => x.slug === "first_win")!;
    expect(first).toMatchObject({ unlocked: true, claimed: false, progress: 1, target: 1 });
    expect(list.find((x) => x.slug === "wins_10")).toMatchObject({ unlocked: false, progress: 1, target: 10 });
    const before = await coinsOf(a);
    expect(await claimAchievement(sql, a, "first_win")).toMatchObject({ reward: 50, coins: before + 50 });
    expect(await claimAchievement(sql, a, "first_win")).toBeNull();
    expect(await claimAchievement(sql, a, "wins_10")).toBeNull();
  });
});

describe("Daily Naija streak milestones", () => {
  it("pays extra on day 3 and day 7", async () => {
    const a = await player("streak_a");
    const start = "2026-03-01";
    const coinsByDay: number[] = [];
    for (let d = 0; d < 7; d++) {
      await sql.tx(async (tx) => {
        const r = await completeDaily(tx, a, 5, addDays(start, d));
        coinsByDay.push(r.coins);
      });
    }
    expect(coinsByDay).toEqual([20, 20, 20 + 30, 20, 20, 20, 20 + 75]);
    expect((await listAchievements(sql, a)).find((x) => x.slug === "streak_7")?.unlocked).toBe(true);
  });
});

describe("friends", () => {
  it("request → accept → list with head-to-head → rival → remove", async () => {
    const a = await player("fr_alpha");
    const b = await player("fr_beta");
    expect((await searchPlayers(sql, a, "fr_be")).map((p) => [p.profile.username, p.status])).toEqual([["fr_beta", "none"]]);
    expect(await requestFriend(sql, a, b)).toMatchObject({ status: "outgoing", created: true });
    expect(await friendStatus(sql, b, a)).toBe("incoming");
    expect((await listFriends(sql, b)).incoming.map((x) => x.profile.id)).toEqual([a]);
    // Asking back accepts.
    expect(await requestFriend(sql, b, a)).toMatchObject({ status: "friends", accepted: true });
    await expect(acceptFriend(sql, b, a)).rejects.toThrow();

    await persistMatchResult(sql, { mode: "ranked", categories: [], a: seat(a, 900), b: seat(b, 100) });
    await persistMatchResult(sql, { mode: "ranked", categories: [], a: seat(a, 100), b: seat(b, 900) });
    await persistMatchResult(sql, { mode: "ranked", categories: [], a: seat(a, 900), b: seat(b, 100) });
    const mine = await listFriends(sql, a);
    expect(mine.friends).toHaveLength(1);
    expect(mine.friends[0]!.record).toEqual({ wins: 2, losses: 1, draws: 0 });
    expect(mine.friends[0]!.weekPoints).toBeGreaterThan(0);
    expect(await findRival(sql, a)).toMatchObject({ friend: { id: b }, record: { wins: 2, losses: 1 } });

    const code = await createChallenge(sql, a, b);
    // Not shown until the sender has played their round.
    expect(await incomingChallenges(sql, b)).toEqual([]);
    await sql.query("insert into challenge_entries (challenge_id, user_id, score, finished_at) select id, $2, 540, now() from challenges where code = $1", [code, a]);
    expect((await incomingChallenges(sql, b)).map((c) => [c.code, c.from.id, c.scoreToBeat])).toEqual([[code, a, 540]]);
    expect(await incomingChallenges(sql, a)).toEqual([]);

    await removeFriend(sql, b, a);
    expect(await friendStatus(sql, a, b)).toBe("none");
    expect(await findRival(sql, a)).toBeNull();
  });
});

describe("State Wars weekly settlement", () => {
  it("pays the top 3 states' scorers once and shows the podium", async () => {
    const week = addDays(lagosWeekStart(), -14);
    const users: Record<string, string> = {};
    const states = ["KN", "RI", "OY", "EN"];
    for (const [i, st] of states.entries()) {
      users[st] = await player(`sw_${st.toLowerCase()}`, st);
      await sql.query("insert into state_weekly_points (week_start, state_code, user_id, points, wins) values ($1, $2, $3, $4, 1)", [week, st, users[st], 100 - i * 10]);
    }
    const s = await settleStateWeek(sql, week);
    expect(s!.podium.map((p) => [p.code, p.prize])).toEqual([["KN", STATE_WAR_PRIZES[0]], ["RI", STATE_WAR_PRIZES[1]], ["OY", STATE_WAR_PRIZES[2]]]);
    expect(await coinsOf(users.KN!)).toBe(STATE_WAR_PRIZES[0]);
    expect(await coinsOf(users.EN!)).toBe(0);
    expect(await settleStateWeek(sql, week)).toBeNull();
    expect(await coinsOf(users.KN!)).toBe(STATE_WAR_PRIZES[0]);
    // The current week can't be settled early.
    expect(await settleStateWeek(sql, lagosWeekStart())).toBeNull();
    const view = await stateWars(sql, "KN", addDays(week, 7), users.KN!);
    expect(view.lastWeek).toMatchObject({ weekStart: week, myPrize: STATE_WAR_PRIZES[0] });
    expect(view.lastWeek!.podium[0]).toMatchObject({ code: "KN", name: "Kano", prize: STATE_WAR_PRIZES[0] });
  });

  it("detects when a state is overtaken", async () => {
    const week = addDays(lagosWeekStart(), 70);
    const x = await player("ov_x", "AB");
    const y = await player("ov_y", "BA");
    await sql.query("insert into state_weekly_points (week_start, state_code, user_id, points, wins) values ($1, 'AB', $2, 50, 1), ($1, 'BA', $3, 40, 1)", [week, x, y]);
    expect(await detectOvertakes(sql, week)).toEqual([]);
    await sql.query("update state_weekly_points set points = 60 where week_start = $1 and user_id = $2", [week, y]);
    expect(await detectOvertakes(sql, week)).toEqual([{ victim: "AB", by: "BA", rank: 2 }]);
    expect(await detectOvertakes(sql, week)).toEqual([]);
  });
});

describe("themed weeks", () => {
  it("features one category per week and special weeks on their dates", () => {
    expect(themeFor("2026-10-01")).toMatchObject({ id: "independence", special: true, category: "history" });
    expect(themeFor("2026-12-25")).toMatchObject({ id: "detty-december", special: true });
    const w = themeFor("2026-10-14");
    expect(w.special).toBe(false);
    expect(w.startsOn).toBe("2026-10-12");
    expect(w.endsOn).toBe("2026-10-18");
    // Same theme all week, a different one the next week.
    expect(themeFor("2026-10-18").category).toBe(w.category);
    expect(themeFor("2026-10-19").category).not.toBe(w.category);
    expect(QUESTIONS_PER_MATCH).toBe(7);
  });
});

describe("Premium perks", () => {
  const makePremium = (id: string) => sql.query("update profiles set premium_until = now() + interval '30 days' where id = $1", [id]);

  it("pays monthly coins once per 30 days and the Season Pass once per season", async () => {
    const p = await player("prem_a");
    expect(await applyPremiumPerks(sql, p)).toBeNull(); // not Premium yet
    await makePremium(p);
    expect(await applyPremiumPerks(sql, p)).toEqual({ coins: PREMIUM_MONTHLY_COINS, seasonPass: true });
    expect(await applyPremiumPerks(sql, p)).toBeNull();
    expect(await coinsOf(p)).toBe(PREMIUM_MONTHLY_COINS);
    const inv = await sql.query<{ item_id: string; quantity: number }>("select item_id, quantity from inventory where user_id = $1 order by item_id", [p]);
    expect(inv.find((i) => i.item_id === "pu_fifty")?.quantity).toBe(3);
    expect(inv.some((i) => i.item_id === "frame_eko")).toBe(true);
    // A month later: coins again, but not a second pass in the same season.
    await sql.query("update profiles set premium_stipend_at = now() - interval '31 days' where id = $1", [p]);
    expect(await applyPremiumPerks(sql, p)).toEqual({ coins: PREMIUM_MONTHLY_COINS, seasonPass: false });
  });

  it("won't sell a Season Pass to someone who already has it through Premium", async () => {
    const p = await player("prem_b");
    await makePremium(p);
    await expect(purchaseProduct(sql, p, { productId: "season_pass", platform: "android" })).rejects.toThrow(/included with your Premium/);
  });

  it("buying Premium pays the perks straight away", async () => {
    const p = await player("prem_c");
    const r = await purchaseProduct(sql, p, { productId: "premium_monthly", platform: "android" });
    expect(r.premiumPerks).toEqual({ coins: PREMIUM_MONTHLY_COINS, seasonPass: true });
    expect(r.coins).toBe(PREMIUM_MONTHLY_COINS);
  });

  it("gives Premium two streak freezes a week (free players one)", async () => {
    const free = await player("freeze_free");
    const prem = await player("freeze_prem");
    await makePremium(prem);
    // Mon 2026-03-02 played, Tue+Wed missed, Thu played.
    for (const id of [free, prem]) {
      await sql.tx((tx) => completeDaily(tx, id, 5, "2026-03-02"));
    }
    expect((await getStreak(sql, prem, "2026-03-05")).current).toBe(1);
    expect((await getStreak(sql, free, "2026-03-05")).current).toBe(0);
    expect(await getStreak(sql, prem, "2026-03-05")).toMatchObject({ freezesLeft: 2, freezesPerWeek: 2 });
    const pr = await sql.tx((tx) => completeDaily(tx, prem, 5, "2026-03-05"));
    const fr = await sql.tx((tx) => completeDaily(tx, free, 5, "2026-03-05"));
    expect(pr.streak).toMatchObject({ current: 2, usedFreeze: true, freezesUsed: 2 });
    expect(fr.streak).toMatchObject({ current: 1, usedFreeze: false });
    expect(await getStreak(sql, prem, "2026-03-06")).toMatchObject({ freezesLeft: 0 });
    // A new week brings the freezes back.
    expect(await getStreak(sql, prem, "2026-03-09")).toMatchObject({ freezesLeft: 2 });
  });
});

describe("free challenge limit", () => {
  it("lets free players send 2 challenges a day, Premium unlimited", async () => {
    const free = await player("lim_free");
    await createChallenge(sql, free);
    await createChallenge(sql, free);
    await expect(createChallenge(sql, free)).rejects.toThrow(/2 challenges a day/);
    await sql.query("update profiles set premium_until = now() + interval '30 days' where id = $1", [free]);
    await expect(createChallenge(sql, free)).resolves.toBeTruthy();
  });
});

describe("offline Daily Naija", () => {
  /** The option id the server considers correct for a question, as this player would see it. */
  async function correctOption(userId: string, questionId: string) {
    const q = (await getQuestions(sql, [questionId]))[0]!;
    return shuffleSeeded(q, `${userId}:daily`).correctOptionId;
  }

  it("downloads without answers, locks the day offline, and scores on submit with no speed bonus", async () => {
    const p = await player("off_a");
    const date = lagosDate();
    const pack = await startOfflineDaily(sql, p, date);
    expect(pack.questions).toHaveLength(10);
    expect(JSON.stringify(pack)).not.toMatch(/correct/i);
    expect((await dailyStatus(sql, p, date)).mode).toBe("offline");
    // Re-downloading an unfinished offline run is fine (e.g. after reinstalling).
    expect((await startOfflineDaily(sql, p, date)).questions.map((q) => q.questionId)).toEqual(pack.questions.map((q) => q.questionId));

    // Right on the first 6, wrong on the next 3, last one unanswered.
    const answers = [];
    for (const q of pack.questions.slice(0, 9)) {
      const right = await correctOption(p, q.questionId);
      answers.push({ index: q.index, optionId: q.index < 6 ? right : q.options.find((o) => o.id !== right)!.id, ms: 2500 });
    }
    const r = await submitOfflineDaily(sql, p, date, answers);
    expect(r).toMatchObject({ score: 600, correct: 6 });
    expect(r.results.filter((x) => x.correct)).toHaveLength(6);
    expect(r.rewards.coins).toBeGreaterThanOrEqual(20);
    expect(r.rewards.streak).toMatchObject({ current: 1, advanced: true });
    const st = await dailyStatus(sql, p, date);
    expect(st).toMatchObject({ played: true, score: 600, correct: 6, mode: "offline" });
    await expect(submitOfflineDaily(sql, p, date, answers)).rejects.toThrow(/already submitted/);
  });

  it("refuses offline mode once a day was started online, and stale submissions", async () => {
    const p = await player("off_b");
    const date = lagosDate();
    await startDaily(sql, p, date);
    await expect(startOfflineDaily(sql, p, date)).rejects.toThrow(/started today's Daily online/);
    await expect(submitOfflineDaily(sql, p, addDays(date, -5), [])).rejects.toThrow(/too old/);
  });

  it("a late-synced day pays coins but doesn't rewind a newer streak", async () => {
    const p = await player("off_c");
    const today = lagosDate();
    const yesterday = addDays(today, -1);
    await startOfflineDaily(sql, p, yesterday);
    // They played today online before their phone synced yesterday's offline run.
    await sql.tx((tx) => completeDaily(tx, p, 5, today));
    const r = await submitOfflineDaily(sql, p, yesterday, []);
    expect(r.rewards.streak).toMatchObject({ advanced: false, current: 1 });
    expect(r.rewards.milestone).toBeNull();
    expect((await getStreak(sql, p, today)).current).toBe(1);
  });
});

describe("matches against bots", () => {
  const bot = (score: number): MatchPlayerInput => ({ ...seat("bot:test", score), isBot: true, answers: [] });

  it("saves a bot win as a loss, not a draw", async () => {
    const p = await player("lost_to_bot");
    const r = await persistMatchResult(sql, { mode: "ranked", categories: [], a: seat(p, 0), b: bot(676), botName: "Ebi_Bot" });
    expect(r.winnerId).toBe("bot:test");
    expect(r.players[p]?.result).toBe("loss");
    const m = await sql.one<{ winner: string | null; bot_won: boolean }>("select winner, bot_won from matches where id = $1", [r.matchId]);
    expect(m).toEqual({ winner: null, bot_won: true });
  });

  it("still records a human win over a bot", async () => {
    const p = await player("beat_bot");
    const r = await persistMatchResult(sql, { mode: "ranked", categories: [], a: bot(100), b: seat(p, 900) });
    const m = await sql.one<{ winner: string | null; bot_won: boolean }>("select winner, bot_won from matches where id = $1", [r.matchId]);
    expect(m).toEqual({ winner: p, bot_won: false });
  });
});
