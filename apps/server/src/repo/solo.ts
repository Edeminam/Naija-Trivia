import { QUESTION_MS, ANSWER_GRACE_MS, pointsForAnswer, isAnswerAccepted, type SoloQuestion, type SoloAnswerResult, type CategorySlug } from "@ntc/shared";
import type { Sql } from "../db";
import { getQuestions, playerLocale, shuffleSeeded, recordQuestionStats, type FullQuestion } from "./questions";
import { HttpError } from "../api/http";

/**
 * Server-timed solo play shared by Daily Naija and Friend Challenges.
 * The server stamps `served_at` when it hands out a question and validates the answer against it,
 * so the client never controls the clock.
 */
export interface SoloTable {
  table: "daily_entries" | "challenge_entries" | "event_entries";
  keyCol: "daily_date" | "challenge_id" | "event_id";
  key: string;
  userId: string;
  questionIds: string[];
  mode: "daily" | "challenge" | "event";
  /** apply Double Wahala on the last question (challenge mirrors a ranked match) */
  doubleLast: boolean;
}

interface Entry {
  current_index: number;
  served_at: Date | null;
  score: number;
  correct: number;
  total_ms: number;
  answers: any[];
  finished_at: Date | null;
}

const lock = (sql: Sql, t: SoloTable) =>
  sql.one<Entry>(`select current_index, served_at, score, correct, total_ms, answers, finished_at from ${t.table} where ${t.keyCol} = $1 and user_id = $2 for update`, [t.key, t.userId]);

function toWire(t: SoloTable, q: FullQuestion, index: number, servedAt: number): SoloQuestion {
  const s = shuffleSeeded(q, `${t.userId}:${t.mode}`);
  return {
    index,
    total: t.questionIds.length,
    questionId: q.id,
    text: q.text,
    category: q.category as CategorySlug,
    options: s.options,
    durationMs: QUESTION_MS,
    deadlineAt: servedAt + QUESTION_MS,
    serverNow: Date.now(),
  };
}

async function recordAnswer(sql: Sql, t: SoloTable, e: Entry, q: FullQuestion, optionId: string | null, receivedAt: number) {
  const servedAt = e.served_at ? new Date(e.served_at).getTime() : receivedAt;
  const deadline = servedAt + QUESTION_MS;
  const accepted = optionId !== null && isAnswerAccepted(receivedAt, deadline, ANSWER_GRACE_MS);
  const s = shuffleSeeded(q, `${t.userId}:${t.mode}`);
  const optionIndex = accepted ? (s.indexById.get(optionId!) ?? null) : null;
  const correct = optionIndex === q.correctIndex;
  const ms = Math.max(0, Math.min(receivedAt, deadline) - servedAt);
  const round = t.doubleLast && e.current_index === t.questionIds.length - 1 ? 7 : 1;
  const points = pointsForAnswer({ correct, remainingMs: QUESTION_MS - ms, round });
  const index = e.current_index;
  const done = index + 1 >= t.questionIds.length;
  const answer = { index, questionId: q.id, optionId: accepted ? optionId : null, correct, points, ms };
  const updated = await sql.one<{ score: number; correct: number; total_ms: number }>(
    `update ${t.table} set current_index = current_index + 1, served_at = null,
        score = score + $3, correct = correct + $4::int, total_ms = total_ms + $5,
        answers = answers || $6::jsonb, finished_at = case when $7 then now() else null end
      where ${t.keyCol} = $1 and user_id = $2 returning score, correct, total_ms`,
    [t.key, t.userId, points, correct ? 1 : 0, ms, JSON.stringify([answer]), done],
  );
  await sql.query(
    `insert into match_answers (mode, user_id, question_id, category_id, round, option_index, correct, points, ms) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [t.mode, t.userId, q.id, q.categoryId, index + 1, optionIndex, correct, points, ms],
  );
  await recordQuestionStats(sql, q.id, optionIndex, correct, ms);
  const result: SoloAnswerResult = { index, correct, correctOptionId: s.correctOptionId, points, ms, fact: q.fact, totalScore: updated!.score, done };
  return { result, done, totals: updated! };
}

/** Return the current question (resuming if still live) or serve the next one. Timeouts are recorded automatically. */
export async function serveNext(sql: Sql, t: SoloTable): Promise<{ question: SoloQuestion | null; timedOut: SoloAnswerResult | null; finished: boolean }> {
  return sql.tx(async (tx) => {
    const e = await lock(tx, t);
    if (!e) throw new HttpError(404, "Start the session first");
    if (e.finished_at) return { question: null, timedOut: null, finished: true };
    const locale = await playerLocale(tx, t.userId);
    let timedOut: SoloAnswerResult | null = null;
    const now = Date.now();
    if (e.served_at) {
      const servedAt = new Date(e.served_at).getTime();
      const q = (await getQuestions(tx, [t.questionIds[e.current_index]!], locale))[0]!;
      if (now <= servedAt + QUESTION_MS + ANSWER_GRACE_MS) return { question: toWire(t, q, e.current_index, servedAt), timedOut: null, finished: false };
      const r = await recordAnswer(tx, t, e, q, null, now);
      timedOut = r.result;
      if (r.done) return { question: null, timedOut, finished: true };
      e.current_index += 1;
    }
    const q = (await getQuestions(tx, [t.questionIds[e.current_index]!], locale))[0];
    if (!q) throw new HttpError(500, "Question missing from set");
    await tx.query(`update ${t.table} set served_at = to_timestamp($3 / 1000.0) where ${t.keyCol} = $1 and user_id = $2`, [t.key, t.userId, now]);
    return { question: toWire(t, q, e.current_index, now), timedOut, finished: false };
  });
}

export async function submitAnswer(sql: Sql, t: SoloTable, index: number, optionId: string | null) {
  const receivedAt = Date.now();
  return sql.tx(async (tx) => {
    const e = await lock(tx, t);
    if (!e) throw new HttpError(404, "Start the session first");
    if (e.finished_at) throw new HttpError(409, "Already finished");
    if (e.current_index !== index || !e.served_at) throw new HttpError(409, "That question is no longer active");
    const q = (await getQuestions(tx, [t.questionIds[index]!], await playerLocale(tx, t.userId)))[0]!;
    return recordAnswer(tx, t, e, q, optionId, receivedAt);
  });
}
