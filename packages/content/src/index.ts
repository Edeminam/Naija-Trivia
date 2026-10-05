import { createHash } from "node:crypto";
import type { CategoryBank, Seed } from "./bank/helpers";
import { nollywood } from "./bank/nollywood";
import { afrobeats } from "./bank/afrobeats";
import { football } from "./bank/football";
import { history } from "./bank/history";
import { geography } from "./bank/geography";
import { food } from "./bank/food";

export type { CategoryBank, Seed };
export const BANKS: CategoryBank[] = [nollywood, afrobeats, football, history, geography, food];

/** Stable UUID derived from a string (sha1-based, v5-style layout). */
export function stableUuid(input: string): string {
  const h = createHash("sha1").update(input).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

/** Deterministic PRNG so the seed file is reproducible. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface BuiltQuestion {
  id: string;
  category: string;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: number;
  fact: string;
  sourceUrl: string;
  status: "live" | "in_review";
}

/** Shuffle authored options (correct first) into a stable order and record the correct index. */
export function buildQuestions(): BuiltQuestion[] {
  const out: BuiltQuestion[] = [];
  for (const bank of BANKS) {
    for (const s of bank.questions) {
      const id = stableUuid(`${bank.category}:${s.text}`);
      const rand = mulberry32(parseInt(id.slice(0, 8), 16));
      const order = [0, 1, 2, 3];
      for (let i = 3; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j]!, order[i]!];
      }
      out.push({
        id,
        category: bank.category,
        text: s.text,
        options: order.map((i) => s.options[i]!),
        correctIndex: order.indexOf(0),
        difficulty: s.difficulty,
        fact: s.fact,
        sourceUrl: s.sourceUrl,
        status: s.status,
      });
    }
  }
  return out;
}
