import type { CategorySlug } from "@ntc/shared";
import type { Seed } from "../helpers";
import { AUTUMN_2026 } from "./autumn-2026";

export interface Drop {
  /** Monday (Lagos) the drop goes live, YYYY-MM-DD */
  release: string;
  questions: Partial<Record<CategorySlug, Seed[]>>;
}

/** Split a batch into weekly drops of `perCategory` questions per category, one Monday apart. */
function weekly(batch: Partial<Record<CategorySlug, Seed[]>>, firstMonday: string, perCategory: number): Drop[] {
  const weeks = Math.max(...Object.values(batch).map((qs) => Math.ceil((qs?.length ?? 0) / perCategory)));
  return Array.from({ length: weeks }, (_, w) => ({
    release: new Date(Date.parse(`${firstMonday}T00:00:00Z`) + w * 7 * 86_400_000).toISOString().slice(0, 10),
    questions: Object.fromEntries(Object.entries(batch).map(([cat, qs]) => [cat, (qs ?? []).slice(w * perCategory, (w + 1) * perCategory)])),
  }));
}

/** Weekly content drops, oldest first. Each aims for CONTENT_WEEKLY_TARGET (50) questions across categories. */
export const DROPS: Drop[] = [...weekly(AUTUMN_2026, "2026-10-19", 5)];
