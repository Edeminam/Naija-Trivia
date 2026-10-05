import { MATCHMAKING_TIMEOUT_MS } from "../constants";

export const BASE_WINDOW = 100;
export const WINDOW_STEP = 50;

/** Allowed rating gap for a player who has waited `waitedMs`: ±100, +50 per full second, capped at 5s. */
export function ratingWindow(waitedMs: number): number {
  const seconds = Math.floor(Math.min(Math.max(0, waitedMs), MATCHMAKING_TIMEOUT_MS) / 1000);
  return BASE_WINDOW + WINDOW_STEP * seconds;
}

export const shouldFallBackToBot = (waitedMs: number) => waitedMs >= MATCHMAKING_TIMEOUT_MS;

export interface QueueEntry {
  userId: string;
  rating: number;
  joinedAt: number;
}

/** Two players can be paired when their gap fits the wider of their two windows. */
export function canPair(a: QueueEntry, b: QueueEntry, now: number): boolean {
  if (a.userId === b.userId) return false;
  const window = Math.max(ratingWindow(now - a.joinedAt), ratingWindow(now - b.joinedAt));
  return Math.abs(a.rating - b.rating) <= window;
}

/**
 * Greedy pairing pass: longest waiting first, each takes the closest-rated eligible partner.
 * Returns pairs plus entries that have timed out (→ bot).
 */
export function pairQueue(entries: QueueEntry[], now: number): { pairs: [QueueEntry, QueueEntry][]; timedOut: QueueEntry[] } {
  const pool = [...entries].sort((x, y) => x.joinedAt - y.joinedAt);
  const used = new Set<string>();
  const pairs: [QueueEntry, QueueEntry][] = [];
  for (const a of pool) {
    if (used.has(a.userId)) continue;
    let best: QueueEntry | null = null;
    for (const b of pool) {
      if (b === a || used.has(b.userId) || !canPair(a, b, now)) continue;
      if (!best || Math.abs(b.rating - a.rating) < Math.abs(best.rating - a.rating)) best = b;
    }
    if (best) {
      used.add(a.userId);
      used.add(best.userId);
      pairs.push([a, best]);
    }
  }
  const timedOut = pool.filter((e) => !used.has(e.userId) && shouldFallBackToBot(now - e.joinedAt));
  return { pairs, timedOut };
}
