import { ANSWER_GRACE_MS, DOUBLE_WAHALA_ROUND, QUESTION_MS } from "../constants";

/**
 * Points for one answer. `remainingMs` is clamped to the base 10s window so that
 * Extra Time buys you time, not extra points. Round 7 ("Double Wahala") is doubled.
 */
export function pointsForAnswer(opts: { correct: boolean; remainingMs: number; round: number }): number {
  if (!opts.correct) return 0;
  const remaining = Math.max(0, Math.min(QUESTION_MS, opts.remainingMs));
  const base = 100 + Math.round((100 * remaining) / QUESTION_MS);
  return isDoubleWahala(opts.round) ? base * 2 : base;
}

export const isDoubleWahala = (round: number) => round === DOUBLE_WAHALA_ROUND;

/** Server-side deadline check: accept answers received up to deadline + grace. */
export function isAnswerAccepted(receivedAt: number, deadlineAt: number, graceMs = ANSWER_GRACE_MS): boolean {
  return receivedAt <= deadlineAt + graceMs;
}

export interface PlayerTally {
  score: number;
  /** Sum of answer times in ms; timeouts count as the full question window. */
  totalMs: number;
}

export type Outcome = "a" | "b" | "draw";

/** Higher score wins; ties broken by lower total answer time; else draw. */
export function decideWinner(a: PlayerTally, b: PlayerTally): Outcome {
  if (a.score !== b.score) return a.score > b.score ? "a" : "b";
  if (a.totalMs !== b.totalMs) return a.totalMs < b.totalMs ? "a" : "b";
  return "draw";
}
