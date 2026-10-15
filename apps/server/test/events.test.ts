import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { LIVE_EVENTS, LIVE_EVENT_FINISH_COINS, LIVE_EVENT_PRIZES, LIVE_EVENT_QUESTIONS, featuredLiveEvent, liveEventWindow } from "@ntc/shared";
import { createTestDb, type Sql } from "../src/db";
import { createDevUser } from "../src/auth";
import { startEvent, completeEvent, eventStatus, settleEvent, ensureEventSet, requireLive } from "../src/repo/events";
import { serveNext, submitAnswer } from "../src/repo/solo";
import { getQuestions, shuffleSeeded } from "../src/repo/questions";

let sql: Sql;
const event = LIVE_EVENTS.find((e) => e.category)!;
const { start, end } = liveEventWindow(event);

beforeAll(async () => {
  sql = await createTestDb();
}, 60_000);

afterEach(() => vi.useRealTimers());

async function player(name: string) {
  const id = await createDevUser(sql, { guest: false, username: name });
  await sql.query("update profiles set state_code = 'LA', coins = 0 where id = $1", [id]);
  return id;
}

const coinsOf = async (id: string) => (await sql.one<{ coins: number }>("select coins from profiles where id = $1", [id]))!.coins;

/** Play the whole event, getting the first `right` questions correct. */
async function play(userId: string, right: number) {
  const t = await startEvent(sql, userId, event.id);
  let rewards = null;
  for (let i = 0; i < LIVE_EVENT_QUESTIONS; i++) {
    const { question } = await serveNext(sql, t);
    const q = (await getQuestions(sql, [question!.questionId]))[0]!;
    const s = shuffleSeeded(q, `${userId}:event`);
    const wrong = s.options.find((o) => o.id !== s.correctOptionId)!.id;
    const r = await submitAnswer(sql, t, i, i < right ? s.correctOptionId : wrong);
    if (r.done) rewards = await completeEvent(sql, userId, r.totals.correct);
  }
  return rewards;
}

describe("live events", () => {
  it("are only playable while live, and featured a week ahead", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(start - 60_000);
    expect(() => requireLive(event.id)).toThrow(/hasn't started/);
    expect(featuredLiveEvent(start - 86_400_000)).toMatchObject({ live: false, event: { id: event.id } });
    vi.setSystemTime(end);
    expect(() => requireLive(event.id)).toThrow(/has ended/);
    expect(featuredLiveEvent(start + 1000)).toMatchObject({ live: true });
  });

  it("serves the same themed set to everyone, pays for finishing, and prizes once at the end", async () => {
    const ids = await ensureEventSet(sql, event.id);
    expect(ids).toHaveLength(LIVE_EVENT_QUESTIONS);
    expect(await ensureEventSet(sql, event.id)).toEqual(ids);
    const qs = await getQuestions(sql, ids);
    expect(qs.filter((q) => q.category === event.category).length).toBeGreaterThanOrEqual(LIVE_EVENT_QUESTIONS - 2);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(start + 5 * 60_000);
    const a = await player("ev_a");
    const b = await player("ev_b");
    expect(await play(a, 9)).toMatchObject({ coins: LIVE_EVENT_FINISH_COINS });
    await play(b, 4);
    const live = await eventStatus(sql, event.id, b);
    expect(live).toMatchObject({ phase: "live", players: 2, me: { played: true, rank: 2, prize: null } });
    expect(live.board.map((p) => p.id)).toEqual([a, b]);
    expect(await settleEvent(sql, event.id)).toBeNull(); // not over yet

    vi.setSystemTime(end + 1000);
    const settled = await settleEvent(sql, event.id);
    expect(settled?.paid).toEqual([
      { userId: a, rank: 1, coins: LIVE_EVENT_PRIZES[0] },
      { userId: b, rank: 2, coins: LIVE_EVENT_PRIZES[1] },
    ]);
    expect(await settleEvent(sql, event.id)).toBeNull();
    expect(await coinsOf(a)).toBe(LIVE_EVENT_FINISH_COINS + LIVE_EVENT_PRIZES[0]!);
    expect((await eventStatus(sql, event.id, a)).me).toMatchObject({ rank: 1, prize: LIVE_EVENT_PRIZES[0] });
  });
});
