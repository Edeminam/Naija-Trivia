import { SEASON_DAYS, LEAGUES, leagueForRating, seasonResetRating } from "@ntc/shared";
import type { Sql } from "../db";

export interface Season {
  id: number;
  number: number;
  startsAt: Date;
  endsAt: Date;
}

const toSeason = (r: any): Season => ({ id: r.id, number: r.number, startsAt: new Date(r.starts_at), endsAt: new Date(r.ends_at) });

/**
 * Return the current season, rolling over (possibly several times) if the latest one has ended.
 * Rollover: pay league rewards for the finished season, then soft-reset every rating.
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
          "update profiles set coins = coins + $1 where ranked_games > 0 and rating >= $2 and ($3::int is null or rating < $3)",
          [l.rewardCoins, l.min, l.max],
        );
      }
      await tx.query("update profiles set rating = greatest(0, round(1000 + (rating - 1000) * 0.5)::int), updated_at = now()");
      for (const l of LEAGUES) {
        await tx.query("update profiles set league = $1 where rating >= $2 and ($3::int is null or rating < $3)", [l.id, l.min, l.max]);
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

// Keep the TS rule and the SQL in step (asserted in tests).
export const _resetRule = seasonResetRating;
export const _leagueRule = leagueForRating;
