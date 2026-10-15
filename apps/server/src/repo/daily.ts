import {
  DAILY_QUESTION_COUNT,
  COINS,
  XP,
  QUESTION_MS,
  OFFLINE_DAILY_GRACE_DAYS,
  STREAK_FREEZES_PER_WEEK,
  addDays,
  lagosDate,
  lagosWeekStart,
  nextLagosMidnight,
  pointsForAnswer,
  streakMilestone,
  themeFor,
  type CategorySlug,
  type DailyStatus,
  type OfflineDailyAnswer,
  type OfflineDailyPack,
  type OfflineDailyResult,
  type StreakInfo,
} from "@ntc/shared";
import { createHash } from "node:crypto";
import { pgArray, type Sql } from "../db";
import { bumpMissions } from "./missions";
import { checkAchievements } from "./achievements";
import { isPremium } from "./profiles";
import { getQuestions, shuffleSeeded, recordQuestionStats } from "./questions";
import { HttpError } from "../api/http";
import type { SoloTable } from "./solo";

/** Slots (0-based) that use the week's featured category; the rest rotate through every category. */
const THEME_SLOTS = new Set([1, 4, 7]);

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
  const featured = themeFor(date).category;
  const cats = [...new Set(sorted.map((q) => q.slug))].filter((c) => c !== featured);
  const plan = [1, 1, 2, 2, 3, 3, 3, 4, 4, 5];
  const picks: string[] = [];
  let rest = 0;
  for (let k = 0; k < DAILY_QUESTION_COUNT; k++) {
    const cat = THEME_SLOTS.has(k) ? featured : cats[rest++ % Math.max(1, cats.length)];
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

const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

type StreakRow = { current: number; best: number; last_date: string | null; freeze_used_week: string | null; freezes_used: number };

/** Freezes per week: Premium players get more. */
async function freezeAllowance(sql: Sql, userId: string) {
  const p = await sql.one("select premium_until from profiles where id = $1", [userId]);
  return p && isPremium(p) ? STREAK_FREEZES_PER_WEEK.premium : STREAK_FREEZES_PER_WEEK.free;
}

/** Freezes left in the Lagos week containing `today`. */
const freezesLeft = (s: StreakRow | null, week: string, allowance: number) => Math.max(0, allowance - (s?.freeze_used_week === week ? s.freezes_used : 0));

const STREAK_COLS = "current, best, last_date::text as last_date, freeze_used_week::text as freeze_used_week, freezes_used";

export async function getStreak(sql: Sql, userId: string, today = lagosDate()): Promise<StreakInfo> {
  const s = await sql.one<StreakRow>(`select ${STREAK_COLS} from streaks where user_id = $1`, [userId]);
  const week = lagosWeekStart(Date.parse(`${today}T12:00:00Z`));
  const allowance = await freezeAllowance(sql, userId);
  const left = freezesLeft(s, week, allowance);
  const base = { freezeAvailable: left > 0, freezesLeft: left, freezesPerWeek: allowance };
  if (!s) return { current: 0, best: 0, playedToday: false, ...base };
  // Still alive if played today or yesterday, or if the missed days can be covered by freezes left this week.
  const missed = s.last_date ? daysBetween(s.last_date, today) - 1 : Infinity;
  const alive = missed <= 0 || missed <= left;
  return { current: alive ? s.current : 0, best: s.best, playedToday: s.last_date === today, ...base };
}

/** Called when today's Daily Naija is completed. Freezes bridge missed days (one freeze per day). */
export async function advanceStreak(sql: Sql, userId: string, today = lagosDate()) {
  const s = await sql.one<StreakRow>(`select ${STREAK_COLS} from streaks where user_id = $1 for update`, [userId]);
  const week = lagosWeekStart(Date.parse(`${today}T12:00:00Z`));
  // Already played today, or a late-synced offline run for an earlier day: the streak doesn't move.
  if (s?.last_date && s.last_date >= today) return { current: s.current, usedFreeze: false, freezesUsed: 0, advanced: false };
  const left = freezesLeft(s, week, await freezeAllowance(sql, userId));
  const missed = s?.last_date ? daysBetween(s.last_date, today) - 1 : Infinity;
  let current = 1;
  let freezesUsed = 0;
  if (s && missed === 0) current = s.current + 1;
  else if (s && missed > 0 && missed <= left) {
    current = s.current + 1;
    freezesUsed = missed;
  }
  const usedThisWeek = (s?.freeze_used_week === week ? s.freezes_used : 0) + freezesUsed;
  const best = Math.max(current, s?.best ?? 0);
  await sql.query(
    `insert into streaks (user_id, current, best, last_date, freeze_used_week, freezes_used) values ($1, $2, $3, $4, $5, $6)
     on conflict (user_id) do update set current = $2, best = $3, last_date = $4, freeze_used_week = $5, freezes_used = $6, updated_at = now()`,
    [userId, current, best, today, usedThisWeek ? week : null, usedThisWeek],
  );
  return { current, usedFreeze: freezesUsed > 0, freezesUsed, advanced: true };
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

/** Rewards for finishing today's Daily Naija (inside the answer transaction). Streak milestones pay extra. */
export async function completeDaily(sql: Sql, userId: string, correct: number, date = lagosDate()) {
  const xp = XP.perCorrect * correct;
  const streak = await advanceStreak(sql, userId, date);
  const milestone = streak.advanced ? streakMilestone(streak.current) : null;
  const coins = COINS.dailyComplete + (milestone?.coins ?? 0);
  await sql.query("update profiles set coins = coins + $2, xp = xp + $3, updated_at = now() where id = $1", [userId, coins, xp]);
  await bumpMissions(sql, userId, { daily_played: 1, correct_answers: correct }, date);
  const achievements = await checkAchievements(sql, userId);
  return { coins, xp, streak, milestone, achievements };
}

export async function dailyStatus(sql: Sql, userId: string, date = lagosDate()): Promise<DailyStatus> {
  await ensureDailySet(sql, date);
  const e = await sql.one("select current_index, score, correct, finished_at, served_at, mode from daily_entries where daily_date = $1 and user_id = $2", [date, userId]);
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
    mode: e ? e.mode : null,
  };
}

// ── Offline Daily Naija ────────────────────────────────────────────────────

/**
 * Download today's set for offline play. This locks today's Daily to offline mode, so a player can't
 * preview the questions and then play online. Re-downloading an unfinished offline run is allowed.
 */
export async function startOfflineDaily(sql: Sql, userId: string, date = lagosDate()): Promise<OfflineDailyPack> {
  const ids = await ensureDailySet(sql, date);
  const e = await sql.one("select mode, finished_at from daily_entries where daily_date = $1 and user_id = $2", [date, userId]);
  if (e?.finished_at) throw new HttpError(409, "You've already played today's Daily Naija.", "already_played");
  if (e && e.mode !== "offline") throw new HttpError(409, "You've already started today's Daily online. Finish it there.", "started_online");
  if (!e) {
    const p = await sql.one<{ state_code: string | null }>("select state_code from profiles where id = $1", [userId]);
    await sql.query("insert into daily_entries (daily_date, user_id, state_code, mode) values ($1, $2, $3, 'offline') on conflict do nothing", [date, userId, p?.state_code ?? null]);
  }
  const qs = await getQuestions(sql, ids);
  const byId = new Map(qs.map((q) => [q.id, q]));
  return {
    date,
    durationMs: QUESTION_MS,
    submitBy: addDays(date, OFFLINE_DAILY_GRACE_DAYS),
    questions: ids.map((id, index) => {
      const q = byId.get(id)!;
      return { index, questionId: q.id, text: q.text, category: q.category as CategorySlug, options: shuffleSeeded(q, `${userId}:daily`).options };
    }),
  };
}

/**
 * Score an offline run. Correct answers earn the base points with no speed bonus (the phone's clock
 * can't be trusted), so offline play can't beat fast online play; client times only break ties.
 */
export async function submitOfflineDaily(sql: Sql, userId: string, date: string, answers: OfflineDailyAnswer[]): Promise<OfflineDailyResult> {
  const today = lagosDate();
  if (date > today || date < addDays(today, -OFFLINE_DAILY_GRACE_DAYS)) throw new HttpError(410, "This offline Daily is too old to submit.", "expired");
  return sql.tx(async (tx) => {
    const e = await tx.one("select mode, finished_at from daily_entries where daily_date = $1 and user_id = $2 for update", [date, userId]);
    if (!e || e.mode !== "offline") throw new HttpError(404, "No offline Daily to submit for that day.", "not_found");
    if (e.finished_at) throw new HttpError(409, "This offline Daily was already submitted.", "already_submitted");
    const ids = (await tx.one<{ question_ids: string[] }>("select question_ids from daily_sets where daily_date = $1", [date]))!.question_ids;
    const qs = new Map((await getQuestions(tx, ids)).map((q) => [q.id, q]));
    const given = new Map(answers.map((a) => [a.index, a]));
    let score = 0;
    let correctN = 0;
    let totalMs = 0;
    const results: OfflineDailyResult["results"] = [];
    const stored: unknown[] = [];
    for (const [index, id] of ids.entries()) {
      const q = qs.get(id)!;
      const sh = shuffleSeeded(q, `${userId}:daily`);
      const a = given.get(index);
      const optionIndex = a?.optionId ? (sh.indexById.get(a.optionId) ?? null) : null;
      const correct = optionIndex === q.correctIndex;
      const ms = optionIndex === null ? QUESTION_MS : Math.max(0, Math.min(QUESTION_MS, Math.round(a?.ms ?? QUESTION_MS)));
      const points = pointsForAnswer({ correct, remainingMs: 0, round: 1 });
      score += points;
      correctN += correct ? 1 : 0;
      totalMs += ms;
      stored.push({ index, questionId: q.id, optionId: optionIndex === null ? null : a!.optionId, correct, points, ms, offline: true });
      const correctText = sh.options.find((o) => o.id === sh.correctOptionId)?.text ?? "";
      results.push({ index, questionId: q.id, text: q.text, correct, correctOptionId: sh.correctOptionId, correctText, points, fact: q.fact });
      await tx.query(
        "insert into match_answers (mode, user_id, question_id, category_id, round, option_index, correct, points, ms) values ('daily', $1, $2, $3, $4, $5, $6, $7, $8)",
        [userId, q.id, q.categoryId, index + 1, optionIndex, correct, points, ms],
      );
      await recordQuestionStats(tx, q.id, optionIndex, correct, ms);
    }
    await tx.query(
      `update daily_entries set current_index = $3, score = $4, correct = $5, total_ms = $6, answers = $7::jsonb, finished_at = now()
        where daily_date = $1 and user_id = $2`,
      [date, userId, ids.length, score, correctN, totalMs, JSON.stringify(stored)],
    );
    const rewards = await completeDaily(tx, userId, correctN, date);
    return { date, score, correct: correctN, results, rewards };
  });
}
