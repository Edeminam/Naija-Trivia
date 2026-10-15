import { describe, it, expect, beforeAll } from "vitest";
import { STREAK_FREEZE_COST, STREAK_FREEZE_MAX_OWNED, COSMETICS, featuredCosmetics, lagosWeekStart, addDays } from "@ntc/shared";
import { createTestDb, type Sql } from "../src/db";
import { createDevUser } from "../src/auth";
import { completeDaily, getStreak } from "../src/repo/daily";
import { buyItem, shopCatalog } from "../src/repo/shop";
import { createChallenge, startChallenge, getChallengeRow, completeChallenge, challengeSummary, settleDueStakes } from "../src/repo/challenges";

let sql: Sql;

beforeAll(async () => {
  sql = await createTestDb();
}, 60_000);

async function player(name: string, coins = 1000) {
  const id = await createDevUser(sql, { guest: false, username: name });
  await sql.query("update profiles set state_code = 'LA', coins = $2 where id = $1", [id, coins]);
  return id;
}

const coinsOf = async (id: string) => (await sql.one<{ coins: number }>("select coins from profiles where id = $1", [id]))!.coins;

describe("streak freezes bought with coins", () => {
  it("costs coins, caps how many you hold, and is used after the free one", async () => {
    const p = await player("buyfreeze", 1000);
    await buyItem(sql, p, { kind: "streak_freeze", itemId: "streak_freeze" });
    const r = await buyItem(sql, p, { kind: "streak_freeze", itemId: "streak_freeze" });
    expect(r).toMatchObject({ coins: 1000 - 2 * STREAK_FREEZE_COST, freezesOwned: 2 });
    await expect(buyItem(sql, p, { kind: "streak_freeze", itemId: "streak_freeze" })).rejects.toThrow(new RegExp(`${STREAK_FREEZE_MAX_OWNED} streak freezes`));

    // Mon 2026-03-02 played, Tue–Thu missed (3 days), Fri played: 1 free + 2 bought freezes bridge it.
    await sql.tx((tx) => completeDaily(tx, p, 5, "2026-03-02"));
    expect(await getStreak(sql, p, "2026-03-06")).toMatchObject({ current: 1, freezesLeft: 1, freezesOwned: 2 });
    const fri = await sql.tx((tx) => completeDaily(tx, p, 5, "2026-03-06"));
    expect(fri.streak).toMatchObject({ current: 2, freezesUsed: 3, boughtUsed: 2 });
    expect(await getStreak(sql, p, "2026-03-06")).toMatchObject({ freezesLeft: 0, freezesOwned: 0 });
  });

  it("keeps bought freezes when the free one is enough, and won't sell without coins", async () => {
    const p = await player("keepfreeze", STREAK_FREEZE_COST);
    await buyItem(sql, p, { kind: "streak_freeze", itemId: "streak_freeze" });
    await sql.tx((tx) => completeDaily(tx, p, 5, "2026-03-02"));
    const r = await sql.tx((tx) => completeDaily(tx, p, 5, "2026-03-04"));
    expect(r.streak).toMatchObject({ current: 2, freezesUsed: 1, boughtUsed: 0 });
    expect((await getStreak(sql, p, "2026-03-04")).freezesOwned).toBe(1);
    await expect(buyItem(sql, p, { kind: "streak_freeze", itemId: "streak_freeze" })).rejects.toThrow(/need/);
  });
});

describe("weekly shop drops", () => {
  it("rotates three items a week and brings each back", () => {
    const pool = COSMETICS.filter((c) => c.rotating);
    const week = lagosWeekStart(Date.parse("2026-10-14T12:00:00Z"));
    const seen = new Set<string>();
    for (let w = 0; w < pool.length / 3; w++) for (const c of featuredCosmetics(addDays(week, 7 * w))) seen.add(c.id);
    expect(seen.size).toBe(pool.length);
    expect(featuredCosmetics(week).map((c) => c.id)).toEqual(featuredCosmetics(addDays(week, 7 * (pool.length / 3))).map((c) => c.id));
  });

  it("only sells a rotating item in its week", async () => {
    const p = await player("drops", 5000);
    const featured = featuredCosmetics(lagosWeekStart());
    const off = COSMETICS.find((c) => c.rotating && !featured.some((f) => f.id === c.id))!;
    await expect(buyItem(sql, p, { kind: "cosmetic", itemId: off.id })).rejects.toThrow(/this week's drops/);
    await expect(buyItem(sql, p, { kind: "cosmetic", itemId: featured[0]!.id })).resolves.toMatchObject({ itemId: featured[0]!.id });
    const shop = await shopCatalog(sql, p);
    expect(shop.featured.ids).toEqual(featured.map((f) => f.id));
    expect(shop.cosmetics.find((c) => c.id === featured[0]!.id)?.owned).toBe(true);
  });
});

describe("challenge stakes", () => {
  /** Mark a player's run as finished with this score (as if they'd played all 7). */
  async function finish(code: string, userId: string, score: number, totalMs = 30_000) {
    const c = await startChallenge(sql, code, userId);
    await sql.query("update challenge_entries set score = $3, correct = 5, total_ms = $4, current_index = 7, finished_at = now() where challenge_id = $1 and user_id = $2", [c.id, userId, score, totalMs]);
    await completeChallenge(sql, c, userId, { score, correct: 5, total_ms: totalMs });
  }

  it("holds both stakes and pays the winner both", async () => {
    const a = await player("stake_a");
    const b = await player("stake_b");
    const code = await createChallenge(sql, a, b, 50);
    expect(await coinsOf(a)).toBe(950);
    await finish(code, a, 700);
    await finish(code, b, 900);
    // b: -50 stake +10 for finishing +100 pot; a: -50 +10.
    expect(await coinsOf(b)).toBe(1000 - 50 + 10 + 100);
    expect(await coinsOf(a)).toBe(1000 - 50 + 10);
    const s = await challengeSummary(sql, code, b);
    expect(s.stake).toMatchObject({ amount: 50, status: "won", winnerId: b, staked: true });
  });

  it("refunds both on a dead heat", async () => {
    const a = await player("stake_c");
    const b = await player("stake_d");
    const code = await createChallenge(sql, a, b, 25);
    await finish(code, a, 800, 20_000);
    await finish(code, b, 800, 20_000);
    expect(await coinsOf(a)).toBe(1010);
    expect(await coinsOf(b)).toBe(1010);
    expect((await challengeSummary(sql, code, a)).stake?.status).toBe("draw");
  });

  it("refunds the creator if the friend never accepts, and needs coins to accept", async () => {
    const a = await player("stake_e");
    const b = await player("stake_f", 10);
    const code = await createChallenge(sql, a, b, 100);
    await finish(code, a, 600);
    await expect(startChallenge(sql, code, b)).rejects.toThrow(/need 100 coins/);
    await sql.query("update challenges set expires_at = now() - interval '1 minute' where code = $1", [code]);
    await settleDueStakes(sql, a);
    expect(await coinsOf(a)).toBe(1010);
    expect((await getChallengeRow(sql, code)).stake_outcome).toBe("refunded");
    await settleDueStakes(sql, a); // idempotent
    expect(await coinsOf(a)).toBe(1010);
  });

  it("a friend who accepts but doesn't finish forfeits once it expires", async () => {
    const a = await player("stake_g");
    const b = await player("stake_h");
    const code = await createChallenge(sql, a, b, 50);
    await finish(code, a, 600);
    await startChallenge(sql, code, b);
    expect(await coinsOf(b)).toBe(950);
    await sql.query("update challenges set expires_at = now() - interval '1 minute' where code = $1", [code]);
    await settleDueStakes(sql, b);
    expect(await coinsOf(a)).toBe(1000 - 50 + 10 + 100);
    expect(await coinsOf(b)).toBe(950);
  });

  it("only direct challenges can carry a stake, and the creator needs the coins", async () => {
    const a = await player("stake_i", 20);
    const b = await player("stake_j");
    await expect(createChallenge(sql, a, null, 50)).rejects.toThrow(/sent to a friend/);
    await expect(createChallenge(sql, a, b, 50)).rejects.toThrow(/need 50 coins/);
  });
});
