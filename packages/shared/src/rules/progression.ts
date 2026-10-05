import { COINS, XP } from "../constants";
import type { Outcome } from "./scoring";

export type PlayerResult = "win" | "draw" | "loss";

export function resultFor(outcome: Outcome, side: "a" | "b"): PlayerResult {
  if (outcome === "draw") return "draw";
  return outcome === side ? "win" : "loss";
}

export const scoreValue = (r: PlayerResult): 0 | 0.5 | 1 => (r === "win" ? 1 : r === "draw" ? 0.5 : 0);

export function coinsFor(result: PlayerResult): number {
  return COINS[result];
}

export function xpFor(result: PlayerResult, correctAnswers: number): number {
  return XP[result] + XP.perCorrect * correctAnswers;
}

/** XP needed to go from level n to n+1 is 100 × n. Cumulative XP to reach level L = 50·L·(L−1). */
export const xpToReachLevel = (level: number) => 50 * level * (level - 1);

export function levelFromXp(xp: number): { level: number; into: number; needed: number; progress: number } {
  let level = 1;
  while (xpToReachLevel(level + 1) <= xp) level++;
  const into = xp - xpToReachLevel(level);
  const needed = 100 * level;
  return { level, into, needed, progress: into / needed };
}

/** State points per ranked win = max(5, round(10 × opponentRating / 1500)). */
export function statePointsForWin(opponentRating: number): number {
  return Math.max(5, Math.round((10 * opponentRating) / 1500));
}

const TITLES: [number, string][] = [
  [1, "Fresh Face"],
  [5, "Quiz Hustler"],
  [10, "Sharp Guy"],
  [20, "Area Scholar"],
  [35, "Professor of Naija"],
  [50, "Living Legend"],
];

export function titleForLevel(level: number): string {
  let t = TITLES[0]![1];
  for (const [min, name] of TITLES) if (level >= min) t = name;
  return t;
}
