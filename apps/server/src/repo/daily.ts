import { DAILY_QUESTION_COUNT, COINS, XP, lagosDate, lagosWeekStart, addDays, nextLagosMidnight, type DailyStatus, type StreakInfo } from "@ntc/shared";
import { createHash } from "node:crypto";
import { pgArray, type Sql } from "../db";
import { bumpMissions } from "./missions";
import type { SoloTable } from "./solo";

/** Make sure today's set exists: 10 live questions, easy → hard, spread across categories. Same for everyone. */
export async function ensureDailySet(sql: Sql, date = lagosDate()): Promise<string[]> {
  const existing = await sql.one<{ question_ids: string[] }>("select question_ids from daily_sets where daily_date = $1", [date]);
  if (existing) return existing.question_ids;
  const recent = await sql.query<{ id: string }>(
    "select unnest(question_ids) as id from daily_sets where daily_date > ($1::date - 60)",
    [date],
  );
  const exclude = new Set(recent.map((r) => r.id));
  const pool = await sql.query<{ id: string; difficulty: number; slug: string }>(
    "select q.id, q.difficulty, c.slug from questions q join categories c on c.id = q.category_id where q.status = 'live' and c.active",
  );
  const h = (s: string) => createHash("sha1").update(`${date}:${s}`).digest("hex");
  const sorted = pool.filter((q) => !exclude.has(q.id)).sort((a, b) => (h(a.id) < h(b.id) ? -1 : 1));
  const cats = [...new Set(sorted.map((q) => q.slug))];
  const plan = [1, 1, 2, 2, 3, 3, 3, 4, 4, 5];
  const picks: string[] = [];
  for (let k = 0; k < DAILY_QUESTION_COUNT; k++) {
    const cat = cats[k % cats.length];
    const pick =
      sorted.find((q) => q.slug === cat && q.difficulty === plan[k] && !picks.includes(q.id)) ??
      sorted.find((q) => q.difficulty === plan[k] && !picks.includes(q.id)) ??
      sorted.find((q) => !picks.includes(q.id));
    if (pick) picks.push(pick.id);
  }
  await sql.query("insert into daily_sets (daily_date, question_ids) values ($1, $2::uuid[]) on conflict (daily_date) do nothing", [date, pgArray(picks)]);
  const row = await sql.one<{ question_ids: string[] }>("select question_ids from daily_sets where daily_date = $1", [date]);
  return row!.question_ids;
}

export async function getStreak(sql: Sql, userId: string, today = lagosDate()): Promise<StreakInfo> {
  const s = await sql.one("select current, best, last_date::text as last_date, freeze_used_week::text as freeze_used_week from streaks where user_id = $1", [userId]);
  const week = lagosWeekStart(Date.parse(`${today}T12:00:00Z`));
  if (!s) return { current: 0, best: 0, freezeAvailable: true, playedToday: false };
  // A streak is still "alive" if last played yesterday, or the day before with a freeze still available.
  const yesterday = addDays(today, -1);
  const twoAgo = addDays(today, -2);
  const freezeAvailable = s.freeze_used_week !== week;
  const alive = s.last_date === today || s.last_date === yesterday || (s.last_date === twoAgo && freezeAvailable);
  return { current: alive ? s.current : 0, best: s.best, freezeAvailable, playedToday: s.last_date === today };
}

/** Called when today's Daily Naija is completed. Uses the weekly freeze to bridge one missed day. */
export async function advanceStreak(sql: Sql, userId: string, today = lagosDate()) {
  const s = await sql.one("select current, best, last_date::text as last_date, freeze_used_week::text as freeze_used_week from streaks where user_id = $1 for update", [userId]);
  const week = lagosWeekStart(Date.parse(`${today}T12:00:00Z`));
  let current = 1;
  let freezeWeek: string | null = s?.freeze_used_week ?? null;
  let usedFreeze = false;
  if (s?.last_date === today) return { current: s.current, usedFreeze };
  if (s?.last_date === addDays(today, -1)) current = s.current + 1;
  else if (s?.last_date === addDays(today, -2) && s.freeze_used_week !== week) {
    current = s.current + 1;
    freezeWeek = week;
    usedFreeze = true;
  }
  const best = Math.max(current, s?.best ?? 0);
  await sql.query(
    `insert into streaks (user_id, current, best, last_date, freeze_used_week) values ($1, $2, $3, $4, $5)
     on conflict (user_id) do update set current = $2, best = $3, last_date = $4, freeze_used_week = $5, updated_at = now()`,
    [userId, current, best, today, freezeWeek],
  );
  return { current, usedFreeze };
}

export function dailyTable(userId: string, date: string, questionIds: string[]): SoloTable {
  return { table: "daily_entries", keyCol: "daily_date", key: date, userId, questionIds, mode: "daily", doubleLast: false };
}

export async function startDaily(sql: Sql, userId: string, date = lagosDate()) {
  const ids = await ensureDailySet(sql, date);
  const p = await sql.one<{ state_code: string | null }>("select state_code from profiles where id = $1", [userId]);
  await sql.query("insert into daily_entries (daily_date, user_id, state_code) values ($1, $2, $3) on conflict do nothing", [date, userId, p?.state_code ?? null]);
  return ids;
}

/** Rewards for finishing today's Daily Naija (inside the answer transaction). */
export async function completeDaily(sql: Sql, userId: string, correct: number, date = lagosDate()) {
  const xp = XP.perCorrect * correct;
  await sql.query("update profiles set coins = coins + $2, xp = xp + $3, updated_at = now() where id = $1", [userId, COINS.dailyComplete, xp]);
  const streak = await advanceStreak(sql, userId, date);
  await bumpMissions(sql, userId, { daily_played: 1, correct_answers: correct }, date);
  return { coins: COINS.dailyComplete, xp, streak };
}

export async function dailyStatus(sql: Sql, userId: string, date = lagosDate()): Promise<DailyStatus> {
  await ensureDailySet(sql, date);
  const e = await sql.one("select current_index, score, correct, finished_at, served_at from daily_entries where daily_date = $1 and user_id = $2", [date, userId]);
  const rank = e?.finished_at ? await sql.one("select national_rank, state_rank, players from daily_rank($1, $2)", [date, userId]) : null;
  const players = await sql.one<{ n: number }>("select count(*)::int as n from daily_entries where daily_date = $1 and finished_at is not null", [date]);
  return {
    date,
    played: !!e?.finished_at,
    inProgress: !!e && !e.finished_at,
    nextIndex: e?.current_index ?? 0,
    score: e?.finished_at ? e.score : null,
    correct: e?.finished_at ? e.correct : null,
    resetsAt: nextLagosMidnight(),
    streak: await getStreak(sql, userId, date),
    nationalRank: rank?.national_rank ?? null,
    stateRank: rank?.state_rank ?? null,
    players: players?.n ?? 0,
  };
}
