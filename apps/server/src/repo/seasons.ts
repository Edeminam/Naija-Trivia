import { SEASON_DAYS, LEAGUES, leagueForRating, seasonResetRating, seasonResetSql, type LeagueId } from "@ntc/shared";
import type { Sql } from "../db";

export interface Season {
  id: number;
  number: number;
  startsAt: Date;
  endsAt: Date;
}

const toSeason = (r: any): Season => ({ id: r.id, number: r.number, startsAt: new Date(r.starts_at), endsAt: new Date(r.ends_at) });

/** League band as SQL bounds: `rating >= $min and ($max is null or rating < $max)`. */
const IN_BAND = "rating >= $2 and ($3::int is null or rating < $3)";

/**
 * Return the current season, rolling over (possibly several times) if the latest one has ended.
 * Rollover, for every player with a ranked game: record their finish, pay their league's coins and
 * cosmetic, then soft-reset every rating (at most one league down) and reassign leagues.
 */
export async function currentSeason(sql: Sql, now = Date.now()): Promise<Season> {
  let latest: any = await sql.one("select id, number, starts_at, ends_at from seasons order by number desc limit 1");
  if (!latest) {
    const start = new Date(now);
    latest = await sql.one(
      "insert into seasons (number, starts_at, ends_at) values (1, $1, $2) returning id, number, starts_at, ends_at",
      [start.toISOString(), new Date(start.getTime() + SEASON_DAYS * 86_400_000).toISOString()],
    );
  }
  while (new Date(latest.ends_at).getTime() <= now) {
    latest = await sql.tx(async (tx) => {
      // Another process may have rolled over already.
      const again = await tx.one("select id, number, starts_at, ends_at from seasons where number = $1 + 1", [latest.number]);
      if (again) return again;
      for (const l of LEAGUES) {
        await tx.query(
          `insert into season_results (season_number, user_id, league, rating)
           select $4, id, $1, rating from profiles where ranked_games > 0 and ${IN_BAND}
           on conflict (season_number, user_id) do nothing`,
          [l.id, l.min, l.max, latest.number],
        );
        await tx.query(`update profiles set coins = coins + $1 where ranked_games > 0 and ${IN_BAND}`, [l.rewardCoins, l.min, l.max]);
        if (l.rewardCosmetic) {
          await tx.query(
            `insert into inventory (user_id, item_id, kind, quantity)
             select id, $1, 'cosmetic', 1 from profiles where ranked_games > 0 and ${IN_BAND}
             on conflict (user_id, item_id) do nothing`,
            [l.rewardCosmetic, l.min, l.max],
          );
        }
      }
      await tx.query(`update profiles set rating = ${seasonResetSql("rating")}, updated_at = now()`);
      for (const l of LEAGUES) {
        await tx.query(`update profiles set league = $1 where ${IN_BAND}`, [l.id, l.min, l.max]);
      }
      const start = new Date(latest.ends_at);
      return tx.one(
        "insert into seasons (number, starts_at, ends_at) values ($1, $2, $3) returning id, number, starts_at, ends_at",
        [latest.number + 1, start.toISOString(), new Date(start.getTime() + SEASON_DAYS * 86_400_000).toISOString()],
      );
    });
  }
  return toSeason(latest);
}

/** A player's finished seasons, newest first. */
export async function seasonHistory(sql: Sql, userId: string): Promise<{ season: number; league: LeagueId; rating: number }[]> {
  const rows = await sql.query<{ season_number: number; league: string; rating: number }>(
    "select season_number, league, rating from season_results where user_id = $1 order by season_number desc",
    [userId],
  );
  return rows.map((r) => ({ season: r.season_number, league: r.league as LeagueId, rating: r.rating }));
}

// Keep the TS rule and the SQL in step (asserted in tests).
export const _resetRule = seasonResetRating;
export const _leagueRule = leagueForRating;
