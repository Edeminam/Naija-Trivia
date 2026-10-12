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

/**
 * Soft reset at season end. Nobody drops more than one league:
 *  - JJC: pulled halfway up to the Learner floor (1000).
 *  - Learner: back to 1000 (stays Learner).
 *  - Sharp and above: down one league, keeping their place in the band (Agba lands no higher than the top of Oga).
 */
export function seasonResetRating(rating: number): number {
  const r = Math.max(0, Math.round(rating));
  const idx = LEAGUES.indexOf(leagueForRating(r));
  const floor = LEAGUES[1]!.min;
  if (idx === 0) return Math.round(floor + (r - floor) * 0.5);
  if (idx === 1) return floor;
  const l = LEAGUES[idx]!;
  const below = LEAGUES[idx - 1]!;
  return Math.min(below.max! - 1, below.min + (r - l.min));
}

/** The same rule as a SQL expression over an integer rating column (used by the season rollover). */
export function seasonResetSql(col = "rating"): string {
  const floor = LEAGUES[1]!.min;
  const arms = [`when ${col} < ${LEAGUES[0]!.max} then round(${floor} + (${col} - ${floor}) * 0.5)::int`, `when ${col} < ${LEAGUES[1]!.max} then ${floor}`];
  for (let i = 2; i < LEAGUES.length; i++) {
    const l = LEAGUES[i]!;
    const below = LEAGUES[i - 1]!;
    const expr = `least(${below.max! - 1}, ${below.min} + (${col} - ${l.min}))`;
    arms.push(l.max === null ? `else ${expr}` : `when ${col} < ${l.max} then ${expr}`);
  }
  return `(case ${arms.join(" ")} end)`;
}

export function seasonEnd(startsAt: Date): Date {
  return new Date(startsAt.getTime() + SEASON_DAYS * 86_400_000);
}
