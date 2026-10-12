import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client, type Room } from "@colyseus/sdk";
import { ratingDelta, statePointsForWin, lagosWeekStart, lagosDate, themeFor, themedWinCoins, FIRST_WIN_BONUS, QUESTIONS_PER_MATCH, type QuestionMsg, type ResultMsg } from "@ntc/shared";
import { startServer } from "../src/index";
import type { Sql } from "../src/db";

const PORT = 29_567;
const BASE = `http://localhost:${PORT}`;
let sql: Sql;
let stop: () => Promise<void>;

async function api<T = any>(path: string, token: string | null, body?: unknown, method = body ? "POST" : "GET"): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json)}`);
  return json as T;
}

async function makePlayer(username: string, stateCode: string) {
  const { token, userId } = await api<{ token: string; userId: string }>("/auth/dev", null, { username });
  await api("/me/onboarding", token, { username, avatarId: "ada", stateCode });
  return { token, userId };
}

function waitFor<T>(room: Room, type: string, timeout = 20_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), timeout);
    room.onMessage(type, (m: T) => {
      clearTimeout(t);
      resolve(m);
    });
  });
}

async function queueAndMatch(token: string) {
  const client = new Client(`ws://localhost:${PORT}`);
  client.auth.token = token;
  const queue = await client.joinOrCreate("queue", { mode: "ranked" });
  for (const t of ["queued", "searching"]) queue.onMessage(t, () => {});
  const matched = await new Promise<any>((resolve) => queue.onMessage("matched", resolve));
  await queue.leave();
  const room = await client.consumeSeatReservation(matched.reservation);
  room.onMessage("hello", () => {});
  return { room, matched };
}

beforeAll(async () => {
  const s = await startServer(PORT, { jobs: false });
  sql = s.sql;
  stop = () => s.server.gracefullyShutdown(false);
}, 60_000);

afterAll(async () => {
  await stop?.();
});

describe("ranked match end to end", () => {
  it("pairs two players, plays 7 rounds and persists correct scores, rating and state points", async () => {
    const a = await makePlayer("ada_test", "LA");
    const b = await makePlayer("bayo_test", "KN");

    const [ma, mb] = await Promise.all([queueAndMatch(a.token), queueAndMatch(b.token)]);
    expect(ma.matched.withBot).toBe(false);
    const ra = ma.room;
    const rb = mb.room;

    // Ban step: both ban the first option.
    const [phaseA] = await Promise.all([waitFor<any>(ra, "phase"), waitFor<any>(rb, "phase")]);
    expect(phaseA.phase).toBe("banning");
    expect(phaseA.options).toHaveLength(4);
    ra.send("ban", { categoryId: phaseA.options[0].categoryId });
    rb.send("ban", { categoryId: phaseA.options[1].categoryId });

    // A answers every question correctly and fast; B always picks a wrong option.
    const answerAll = (room: Room, correct: boolean) =>
      new Promise<ResultMsg>((resolve) => {
        room.onMessage("question", async (q: QuestionMsg) => {
          const row = await sql.one("select options, correct_index from questions where id = $1", [q.questionId]);
          const correctText = row!.options[row!.correct_index];
          const pick = correct ? q.options.find((o) => o.text === correctText)! : q.options.find((o) => o.text !== correctText)!;
          setTimeout(() => room.send("answer", { questionId: q.questionId, optionId: pick.id }), correct ? 450 : 900);
        });
        for (const t of ["roundIntro", "doubleWahala", "reveal", "phase", "hello", "rematchStatus"]) room.onMessage(t, () => {});
        room.onMessage("result", resolve);
      });

    const [resA, resB] = await Promise.all([answerAll(ra, true), answerAll(rb, false)]);
    expect(resA.matchId).toBe(resB.matchId);
    expect(resA.winnerId).toBe(a.userId);
    expect(resA.rounds).toHaveLength(QUESTIONS_PER_MATCH);

    const pa = resA.players[a.userId]!;
    const pb = resA.players[b.userId]!;
    expect(pa.result).toBe("win");
    expect(pb.result).toBe("loss");
    expect(pa.correct).toBe(7);
    expect(pb.correct).toBe(0);
    expect(pb.score).toBe(0);
    // Every correct answer is worth 100–200 (Double Wahala 200–400): ~0.45s each → ≥ 190 per question.
    expect(pa.score).toBeGreaterThan(6 * 180 + 360);
    expect(pa.score).toBeLessThanOrEqual(6 * 200 + 400);

    const expectedDelta = ratingDelta({ rating: 1000, opponentRating: 1000, score: 1, rankedGames: 0 });
    expect(pa.ratingDelta).toBe(expectedDelta);
    expect(pb.ratingDelta).toBe(-expectedDelta);
    expect(pa.statePoints).toBe(statePointsForWin(1000));
    expect(pb.statePoints).toBe(0);
    // Win coins (more during a special themed week) + first win of the day.
    const winCoins = themedWinCoins(themeFor(lagosDate())) + FIRST_WIN_BONUS;
    expect(pa.coins).toBe(winCoins);
    expect(pa.bonuses.map((b) => b.kind)).toContain("first_win");
    expect(pb.coins).toBe(5);

    // Database reflects the result.
    const dbA = await sql.one("select rating, coins, wins, ranked_games from profiles where id = $1", [a.userId]);
    const dbB = await sql.one("select rating, coins, losses from profiles where id = $1", [b.userId]);
    expect(dbA).toMatchObject({ rating: 1000 + expectedDelta, coins: 200 + winCoins, wins: 1, ranked_games: 1 });
    expect(dbB).toMatchObject({ rating: 1000 - expectedDelta, coins: 205, losses: 1 });
    const answers = await sql.one<{ n: number }>("select count(*)::int as n from match_answers where match_id = $1", [resA.matchId]);
    expect(answers!.n).toBe(14);
    const sp = await sql.one("select points from state_weekly_points where user_id = $1 and week_start = $2", [a.userId, lagosWeekStart()]);
    expect(sp!.points).toBe(statePointsForWin(1000));
    const wars = await api("/state-wars", a.token);
    expect(wars.rows.find((r: any) => r.code === "LA").rank).toBe(1);

    await ra.leave();
    await rb.leave();
  }, 90_000);

  it("falls back to a bot opponent after 5 seconds", async () => {
    const c = await makePlayer("solo_test", "OY");
    const started = Date.now();
    const { room, matched } = await queueAndMatch(c.token);
    const waited = Date.now() - started;
    expect(matched.withBot).toBe(true);
    expect(waited).toBeGreaterThanOrEqual(4_900);
    expect(waited).toBeLessThan(8_000);
    await new Promise((r) => setTimeout(r, 300));
    const players = [...((room.state as any).players.values() as Iterable<any>)];
    expect(players.some((p) => p.isBot)).toBe(true);
    await room.leave();
  }, 30_000);
});

describe("solo (Daily Naija) answer deadline", () => {
  it("rejects an answer received after deadline + 300ms grace", async () => {
    const p = await makePlayer("late_test", "EN");
    const first = await api("/daily/next", p.token, {});
    expect(first.question.index).toBe(0);
    // Pretend the question was served 10.5s ago.
    await sql.query("update daily_entries set served_at = now() - interval '10500 milliseconds' where user_id = $1", [p.userId]);
    const row = await sql.one("select options, correct_index from questions where id = $1", [first.question.questionId]);
    const correct = first.question.options.find((o: any) => o.text === row!.options[row!.correct_index]);
    const res = await api("/daily/answer", p.token, { index: 0, optionId: correct.id });
    expect(res.correct).toBe(false);
    expect(res.points).toBe(0);

    // A prompt correct answer on the next question scores normally.
    const second = await api("/daily/next", p.token, {});
    const row2 = await sql.one("select options, correct_index from questions where id = $1", [second.question.questionId]);
    const correct2 = second.question.options.find((o: any) => o.text === row2!.options[row2!.correct_index]);
    const res2 = await api("/daily/answer", p.token, { index: 1, optionId: correct2.id });
    expect(res2.correct).toBe(true);
    expect(res2.points).toBeGreaterThanOrEqual(190);
  }, 30_000);
});
