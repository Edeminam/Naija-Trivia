import { createHash, randomBytes } from "node:crypto";
import { SEEN_QUESTION_WINDOW_DAYS, type CategorySlug, type WireOption } from "@ntc/shared";
import { pgArray, type Sql } from "../db";

export interface FullQuestion {
  id: string;
  categoryId: string;
  category: CategorySlug;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: number;
  fact: string;
  imageUrl: string | null;
  optionPicks: number[];
  timesShown: number;
}

export interface ActiveCategory {
  id: string;
  slug: CategorySlug;
  name: string;
  live: number;
}

/** Categories with enough live questions to be offered in the ban step. */
export async function activeCategories(sql: Sql, minLive = 20): Promise<ActiveCategory[]> {
  return sql.query<ActiveCategory>(
    `select c.id, c.slug, c.name, count(q.id)::int as live
       from categories c join questions q on q.category_id = c.id and q.status = 'live'
      where c.active
      group by c.id, c.slug, c.name, c.sort
     having count(q.id) >= $1
      order by c.sort`,
    [minLive],
  );
}

export async function questionPool(sql: Sql, categoryIds: string[]) {
  return sql.query<{ id: string; categoryId: string; difficulty: number }>(
    `select id, category_id as "categoryId", difficulty from questions where status = 'live' and category_id = any($1::uuid[])`,
    [pgArray(categoryIds)],
  );
}

export async function recentlySeen(sql: Sql, userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const rows = await sql.query<{ question_id: string }>(
    `select distinct question_id from seen_questions where user_id = any($1::uuid[]) and seen_at > now() - ($2 || ' days')::interval`,
    [pgArray(userIds), String(SEEN_QUESTION_WINDOW_DAYS)],
  );
  return new Set(rows.map((r) => r.question_id));
}

export async function markSeen(sql: Sql, userId: string, questionIds: string[]) {
  if (!questionIds.length) return;
  await sql.query(
    `insert into seen_questions (user_id, question_id, seen_at)
       select $1, unnest($2::uuid[]), now()
     on conflict (user_id, question_id) do update set seen_at = now()`,
    [userId, pgArray(questionIds)],
  );
}

export async function getQuestions(sql: Sql, ids: string[]): Promise<FullQuestion[]> {
  if (!ids.length) return [];
  const rows = await sql.query(
    `select q.id, q.category_id, c.slug, q.text, q.options, q.correct_index, q.difficulty, q.fact, q.image_url, q.option_picks, q.times_shown
       from questions q join categories c on c.id = q.category_id where q.id = any($1::uuid[])`,
    [pgArray(ids)],
  );
  const map = new Map(
    rows.map((r) => [
      r.id,
      {
        id: r.id,
        categoryId: r.category_id,
        category: r.slug,
        text: r.text,
        options: typeof r.options === "string" ? JSON.parse(r.options) : r.options,
        correctIndex: r.correct_index,
        difficulty: r.difficulty,
        fact: r.fact,
        imageUrl: r.image_url,
        optionPicks: (r.option_picks as number[]) ?? [0, 0, 0, 0],
        timesShown: r.times_shown,
      } satisfies FullQuestion,
    ]),
  );
  return ids.map((id) => map.get(id)).filter(Boolean) as FullQuestion[];
}

/** Record one answer against question stats (option picks feed Ask the Crowd). */
export async function recordQuestionStats(sql: Sql, questionId: string, optionIndex: number | null, correct: boolean, ms: number) {
  await sql.query(
    `update questions set
        times_shown = times_shown + 1,
        times_correct = times_correct + $2::int,
        avg_ms = ((avg_ms::bigint * times_shown + $3) / (times_shown + 1))::int,
        option_picks = case when $4::int is null then option_picks
                            else array[
                              option_picks[1] + (case when $4::int = 0 then 1 else 0 end),
                              option_picks[2] + (case when $4::int = 1 then 1 else 0 end),
                              option_picks[3] + (case when $4::int = 2 then 1 else 0 end),
                              option_picks[4] + (case when $4::int = 3 then 1 else 0 end)]
                       end
      where id = $1`,
    [questionId, correct ? 1 : 0, Math.round(ms), optionIndex],
  );
}

// ── Option shuffling & ids ────────────────────────────────────────────────

export interface ShuffledOptions {
  options: WireOption[];
  /** option id → original index */
  indexById: Map<string, number>;
  correctOptionId: string;
}

/** Random per-send ids (live matches): ids reveal nothing about position or correctness. */
export function shuffleRandom(q: FullQuestion): ShuffledOptions {
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  const indexById = new Map<string, number>();
  const options = order.map((i) => {
    const id = randomBytes(4).toString("hex");
    indexById.set(id, i);
    return { id, text: q.options[i]! };
  });
  return { options, indexById, correctOptionId: [...indexById].find(([, i]) => i === q.correctIndex)![0] };
}

/** Deterministic ids (solo modes) so the server can recompute the mapping statelessly. */
export function shuffleSeeded(q: FullQuestion, seed: string): ShuffledOptions {
  const h = (s: string) => createHash("sha1").update(s).digest("hex");
  const order = [0, 1, 2, 3].map((i) => ({ i, k: h(`${seed}:${q.id}:${i}`) })).sort((a, b) => (a.k < b.k ? -1 : 1));
  const indexById = new Map<string, number>();
  const options = order.map(({ i, k }) => {
    const id = k.slice(0, 8);
    indexById.set(id, i);
    return { id, text: q.options[i]! };
  });
  return { options, indexById, correctOptionId: [...indexById].find(([, i]) => i === q.correctIndex)![0] };
}

/** Ask the Crowd: historical picks when we have enough data, otherwise a difficulty-based estimate. */
export function crowdDistribution(q: FullQuestion, s: ShuffledOptions): Record<string, number> {
  const total = q.optionPicks.reduce((a, b) => a + b, 0);
  const raw = [0, 1, 2, 3].map((i) => {
    if (total >= 20) return q.optionPicks[i]!;
    const correctShare = Math.max(0.35, 0.85 - q.difficulty * 0.09);
    return i === q.correctIndex ? correctShare * 100 : ((1 - correctShare) * 100) / 3 + (Math.random() * 6 - 3);
  });
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const pct = raw.map((v) => Math.round((v / sum) * 100));
  const drift = 100 - pct.reduce((a, b) => a + b, 0);
  pct[q.correctIndex] = pct[q.correctIndex]! + drift;
  const out: Record<string, number> = {};
  for (const [id, idx] of s.indexById) out[id] = Math.max(0, pct[idx]!);
  return out;
}
