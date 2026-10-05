import { QUESTIONS_PER_MATCH } from "../constants";

/** Difficulty target from average rating: 1000→2, 1400→3, 1800→4, 2200+→5 (linear, clamped 1–5). */
export function targetDifficulty(avgRating: number): number {
  return Math.max(1, Math.min(5, Math.round(2 + (avgRating - 1000) / 400)));
}

export interface CandidateQuestion {
  id: string;
  categoryId: string;
  difficulty: number;
}

export interface SelectOptions {
  categories: string[];
  avgRating: number;
  /** question ids any participant saw in the last 30 days */
  recentlySeen: Set<string>;
  count?: number;
  rand?: () => number;
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Pick `count` questions spread evenly across the allowed categories, preferring the target
 * difficulty (then ±1, ±2 …) and unseen questions. Falls back to seen questions only when the
 * pool is exhausted. Never returns duplicates.
 */
export function selectQuestions<Q extends CandidateQuestion>(pool: Q[], opts: SelectOptions): Q[] {
  const rand = opts.rand ?? Math.random;
  const count = opts.count ?? QUESTIONS_PER_MATCH;
  const target = targetDifficulty(opts.avgRating);
  const allowed = new Set(opts.categories);
  const eligible = pool.filter((q) => allowed.has(q.categoryId));

  const rank = (q: Q) => (opts.recentlySeen.has(q.id) ? 100 : 0) + Math.abs(q.difficulty - target) * 10 + rand();
  const byCategory = new Map<string, Q[]>();
  for (const cat of opts.categories) {
    byCategory.set(
      cat,
      eligible.filter((q) => q.categoryId === cat).map((q) => ({ q, r: rank(q) })).sort((x, y) => x.r - y.r).map((x) => x.q),
    );
  }

  // Round-robin across categories in random order so the mix is even (e.g. 3/2/2).
  const order = shuffle(opts.categories, rand);
  const picked: Q[] = [];
  const taken = new Set<string>();
  let progress = true;
  while (picked.length < count && progress) {
    progress = false;
    for (const cat of order) {
      if (picked.length >= count) break;
      const list = byCategory.get(cat)!;
      const next = list.find((q) => !taken.has(q.id));
      if (next) {
        picked.push(next);
        taken.add(next.id);
        progress = true;
      }
    }
  }

  // Easier questions first, with Double Wahala (last) getting one of the harder picks.
  const sorted = shuffle(picked, rand).sort((a, b) => a.difficulty - b.difficulty);
  return sorted;
}
