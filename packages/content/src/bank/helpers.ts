import type { CategorySlug } from "@ntc/shared";

export interface Seed {
  difficulty: 1 | 2 | 3 | 4 | 5;
  text: string;
  /** correct answer is always authored first; the generator shuffles */
  options: [string, string, string, string];
  fact: string;
  sourceUrl: string;
  status: "live" | "in_review";
  /** Weekly drop this question is scheduled into (Monday, YYYY-MM-DD, Lagos); unset = live now */
  release?: string;
}

export interface CategoryBank {
  category: CategorySlug;
  questions: Seed[];
}

export const W = "https://en.wikipedia.org/wiki/";

type D = Seed["difficulty"];
type O = Seed["options"];

/** A fact we are highly confident in → live. */
export const q = (difficulty: D, text: string, options: O, fact: string, sourceUrl: string): Seed => ({
  difficulty, text, options, fact, sourceUrl, status: "live",
});

/** Plausible but worth a human check → in_review. */
export const u = (difficulty: D, text: string, options: O, fact: string, sourceUrl: string): Seed => ({
  difficulty, text, options, fact, sourceUrl, status: "in_review",
});
