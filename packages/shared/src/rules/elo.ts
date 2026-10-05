export const K_NEW = 32;
export const K_ESTABLISHED = 20;
export const PROVISIONAL_GAMES = 30;

export function kFactor(rankedGames: number, vsBot = false): number {
  const k = rankedGames < PROVISIONAL_GAMES ? K_NEW : K_ESTABLISHED;
  return vsBot ? k / 2 : k;
}

export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

/** Rating change for one player. `score` is 1 win, 0.5 draw, 0 loss. */
export function ratingDelta(opts: {
  rating: number;
  opponentRating: number;
  score: 0 | 0.5 | 1;
  rankedGames: number;
  vsBot?: boolean;
  shieldConsumed?: boolean;
}): number {
  const k = kFactor(opts.rankedGames, opts.vsBot);
  const delta = Math.round(k * (opts.score - expectedScore(opts.rating, opts.opponentRating)));
  if (opts.shieldConsumed && delta < 0) return 0;
  return delta;
}

/** Bots sit within ±50 of the player they face. */
export function botRating(playerRating: number, rand: () => number = Math.random): number {
  return Math.max(0, Math.round(playerRating + (rand() * 100 - 50)));
}
