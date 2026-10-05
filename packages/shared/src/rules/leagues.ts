import { LEAGUES, SEASON_DAYS, type LeagueDef } from "../constants";

export function leagueForRating(rating: number): LeagueDef {
  const r = Math.max(0, rating);
  return LEAGUES.find((l) => r >= l.min && (l.max === null || r < l.max)) ?? LEAGUES[0]!;
}

export function nextLeague(rating: number): LeagueDef | null {
  const idx = LEAGUES.indexOf(leagueForRating(rating));
  return LEAGUES[idx + 1] ?? null;
}

/** 0..1 progress through the current league band (1 for the top league). */
export function leagueProgress(rating: number): number {
  const l = leagueForRating(rating);
  if (l.max === null) return 1;
  return Math.min(1, Math.max(0, (rating - l.min) / (l.max - l.min)));
}

/** Soft reset at season end: rating = 1000 + (rating − 1000) × 0.5, floored at 0. */
export function seasonResetRating(rating: number): number {
  return Math.max(0, Math.round(1000 + (rating - 1000) * 0.5));
}

export function seasonEnd(startsAt: Date): Date {
  return new Date(startsAt.getTime() + SEASON_DAYS * 86_400_000);
}
