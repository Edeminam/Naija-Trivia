import { createHash } from "node:crypto";
import {
  LIVE_EVENT_QUESTIONS,
  LIVE_EVENT_FINISH_COINS,
  LIVE_EVENT_PRIZES,
  LIVE_EVENTS,
  XP,
  liveEventById,
  liveEventWindow,
  leagueForRating,
  type LiveEventStatus,
  type LeaderboardPlayer,
} from "@ntc/shared";
import { pgArray, type Sql } from "../db";
import { HttpError } from "../api/http";
import { checkAchievements } from "./achievements";
import type { SoloTable } from "./solo";

/** The event's 10 questions, picked once (easy → hard) and the same for everyone. */
export async function ensureEventSet(sql: Sql, eventId: string): Promise<string[]> {
  const existing = await sql.one<{ question_ids: string[] }>("select question_ids from event_sets where event_id = $1", [eventId]);
  if (existing) return existing.question_ids;
  const e = liveEventById(eventId);
  if (!e) throw new HttpError(404, "No such event");
  // Keep away from recent Daily sets so regulars don't get repeats.
  const recent = new Set(
    (await sql.query<{ id: string }>("select unnest(question_ids) as id from daily_sets where daily_date > (current_date - 60)")).map((r) => r.id),
  );
  const pool = await sql.query<{ id: string; difficulty: number; slug: string }>(
    "select q.id, q.difficulty, c.slug from questions q join categories c on c.id = q.category_id where q.status = 'live' and (q.release_at is null or q.release_at <= now()) and c.active",
  );
  const h = (s: string) => createHash("sha1").update(`${eventId}:${s}`).digest("hex");
  const sorted = pool.filter((q) => !recent.has(q.id)).sort((a, b) => (h(a.id) < h(b.id) ? -1 : 1));
  const plan = [1, 2, 2, 3, 3, 3, 4, 4, 5, 5].slice(0, LIVE_EVENT_QUESTIONS);
  const picks: string[] = [];
  for (const d of plan) {
    const pick =
      sorted.find((q) => q.difficulty === d && (!e.category || q.slug === e.category) && !picks.includes(q.id)) ??
      sorted.find((q) => (!e.category || q.slug === e.category) && !picks.includes(q.id)) ??
      sorted.find((q) => !picks.includes(q.id));
    if (pick) picks.push(pick.id);
  }
  await sql.query("insert into event_sets (event_id, question_ids) values ($1, $2::uuid[]) on conflict (event_id) do nothing", [eventId, pgArray(picks)]);
  return (await sql.one<{ question_ids: string[] }>("select question_ids from event_sets where event_id = $1", [eventId]))!.question_ids;
}

export function eventTable(userId: string, eventId: string, questionIds: string[]): SoloTable {
  return { table: "event_entries", keyCol: "event_id", key: eventId, userId, questionIds, mode: "event", doubleLast: false };
}

/** Throws unless the event is on right now. */
export function requireLive(eventId: string, now = Date.now()) {
  const e = liveEventById(eventId);
  if (!e) throw new HttpError(404, "No such event");
  const w = liveEventWindow(e);
  if (now < w.start) throw new HttpError(409, `${e.name} hasn't started yet.`, "not_started");
  if (now >= w.end) throw new HttpError(410, `${e.name} has ended.`, "ended");
  return e;
}

/** Join the event (one attempt) and return the table to serve questions from. */
export async function startEvent(sql: Sql, userId: string, eventId: string) {
  requireLive(eventId);
  const ids = await ensureEventSet(sql, eventId);
  const p = await sql.one<{ state_code: string | null }>("select state_code from profiles where id = $1", [userId]);
  await sql.query("insert into event_entries (event_id, user_id, state_code) values ($1, $2, $3) on conflict do nothing", [eventId, userId, p?.state_code ?? null]);
  return eventTable(userId, eventId, ids);
}

/** Answers are still accepted for a question served before the end; new questions are not. */
export async function eventTableFor(sql: Sql, userId: string, eventId: string) {
  const e = liveEventById(eventId);
  if (!e) throw new HttpError(404, "No such event");
  return eventTable(userId, eventId, await ensureEventSet(sql, eventId));
}

export async function completeEvent(sql: Sql, userId: string, correct: number) {
  await sql.query("update profiles set coins = coins + $2, xp = xp + $3, updated_at = now() where id = $1", [userId, LIVE_EVENT_FINISH_COINS, XP.perCorrect * correct]);
  const achievements = await checkAchievements(sql, userId);
  return { coins: LIVE_EVENT_FINISH_COINS, xp: XP.perCorrect * correct, achievements };
}

async function board(sql: Sql, eventId: string, limit = 20): Promise<LeaderboardPlayer[]> {
  const rows = await sql.query(
    `select e.user_id, e.score, e.state_code, p.username, p.avatar_id, p.rating, p.frame_id,
            row_number() over (order by e.score desc, e.total_ms asc, e.finished_at asc)::int as rank
       from event_entries e join profiles p on p.id = e.user_id
      where e.event_id = $1 and e.finished_at is not null
      order by rank limit $2`,
    [eventId, limit],
  );
  return rows.map((r) => ({
    rank: r.rank,
    id: r.user_id,
    username: r.username ?? "Player",
    avatarId: r.avatar_id ?? "ada",
    stateCode: r.state_code ?? "DI",
    points: r.score,
    league: leagueForRating(r.rating ?? 1000).id,
    frameId: r.frame_id ?? null,
  }));
}

/**
 * Pay place prizes once an event has closed. Idempotent: the events_settled row is the guard.
 * Returns the paid prizes, or null if it was already settled or hasn't ended.
 */
export async function settleEvent(sql: Sql, eventId: string, now = Date.now()) {
  const e = liveEventById(eventId);
  if (!e || now < liveEventWindow(e).end) return null;
  return sql.tx(async (tx) => {
    const claimed = await tx.one("insert into events_settled (event_id) values ($1) on conflict do nothing returning event_id", [eventId]);
    if (!claimed) return null;
    const top = await tx.query<{ user_id: string }>(
      `select user_id from event_entries where event_id = $1 and finished_at is not null
        order by score desc, total_ms asc, finished_at asc limit $2`,
      [eventId, LIVE_EVENT_PRIZES.length],
    );
    const paid: { userId: string; rank: number; coins: number }[] = [];
    for (const [i, r] of top.entries()) {
      const coins = LIVE_EVENT_PRIZES[i]!;
      await tx.query("update profiles set coins = coins + $2 where id = $1", [r.user_id, coins]);
      await tx.query("update event_entries set prize = $3 where event_id = $1 and user_id = $2", [eventId, r.user_id, coins]);
      paid.push({ userId: r.user_id, rank: i + 1, coins });
    }
    return { eventId, paid };
  });
}

/** Settle every event that has ended (called from the background job and lazily on reads). */
export async function settleEndedEvents(sql: Sql, now = Date.now()) {
  const out = [];
  for (const e of LIVE_EVENTS) {
    if (now < liveEventWindow(e).end) continue;
    const r = await settleEvent(sql, e.id, now);
    if (r) out.push(r);
  }
  return out;
}

export async function eventStatus(sql: Sql, eventId: string, userId: string | null, now = Date.now()): Promise<LiveEventStatus> {
  const e = liveEventById(eventId);
  if (!e) throw new HttpError(404, "No such event");
  const w = liveEventWindow(e);
  const phase = now < w.start ? "upcoming" : now < w.end ? "live" : "ended";
  if (phase === "ended") await settleEvent(sql, eventId, now);
  const mine = userId
    ? await sql.one("select current_index, score, finished_at, prize, score, total_ms from event_entries where event_id = $1 and user_id = $2", [eventId, userId])
    : null;
  let rank: number | null = null;
  if (mine?.finished_at) {
    const r = await sql.one<{ n: number }>(
      `select count(*)::int + 1 as n from event_entries where event_id = $1 and finished_at is not null
          and (score > $2 or (score = $2 and total_ms < $3))`,
      [eventId, mine.score, mine.total_ms],
    );
    rank = r?.n ?? null;
  }
  const players = await sql.one<{ n: number }>("select count(*)::int as n from event_entries where event_id = $1 and finished_at is not null", [eventId]);
  return {
    id: e.id,
    name: e.name,
    tagline: e.tagline,
    category: e.category ?? null,
    startsAt: w.start,
    endsAt: w.end,
    phase,
    players: players?.n ?? 0,
    me: mine
      ? { played: !!mine.finished_at, inProgress: !mine.finished_at, nextIndex: mine.current_index, score: mine.finished_at ? mine.score : null, rank, prize: mine.prize ?? null }
      : null,
    board: phase === "upcoming" ? [] : await board(sql, eventId),
  };
}

