import { describe, it, expect, beforeAll } from "vitest";
import { LEAGUES, leagueForRating, seasonResetRating, seasonResetSql } from "@ntc/shared";
import { createTestDb, type Sql } from "../src/db";
import { createDevUser } from "../src/auth";
import { currentSeason, seasonHistory } from "../src/repo/seasons";

let sql: Sql;

beforeAll(async () => {
  sql = await createTestDb();
}, 60_000);

async function player(name: string, rating: number, rankedGames = 5) {
  const id = await createDevUser(sql, { guest: false, username: name });
  await sql.query("update profiles set rating = $2, league = $3, ranked_games = $4, coins = 100 where id = $1", [id, rating, leagueForRating(rating).id, rankedGames]);
  return id;
}

describe("season rollover", () => {
  it("the SQL reset matches the TypeScript rule for every rating", async () => {
    const rows = await sql.query<{ r: number; after: number }>(`select r, ${seasonResetSql("r")} as after from generate_series(0, 3600) as r`);
    for (const row of rows) expect(row.after, `rating ${row.r}`).toBe(seasonResetRating(row.r));
  });

  it("records finishes, pays coins and league frames, then drops at most one league", async () => {
    const agba = await player("agba_kid", 2350);
    const sharp = await player("sharp_kid", 1450);
    const jjc = await player("jjc_kid", 800);
    const idle = await player("idle_kid", 2000, 0);

    const s = await currentSeason(sql);
    await currentSeason(sql, s.endsAt.getTime() + 1);
    const next = await currentSeason(sql, s.endsAt.getTime() + 1);
    expect(next.number).toBe(s.number + 1);

    const prof = async (id: string) => (await sql.one("select rating, league, coins from profiles where id = $1", [id]))!;
    const frames = async (id: string) => (await sql.query<{ item_id: string }>("select item_id from inventory where user_id = $1 and kind = 'cosmetic'", [id])).map((r) => r.item_id);
    const reward = (id: string) => LEAGUES.find((l) => l.id === id)!;

    expect(await prof(agba)).toMatchObject({ rating: 2050, league: "oga", coins: 100 + reward("agba").rewardCoins });
    expect(await frames(agba)).toEqual(["frame_agba"]);
    expect(await seasonHistory(sql, agba)).toEqual([{ season: s.number, league: "agba", rating: 2350 }]);

    expect(await prof(sharp)).toMatchObject({ rating: 1150, league: "learner", coins: 100 + reward("sharp").rewardCoins });
    expect(await frames(sharp)).toEqual(["frame_sharp"]);

    expect(await prof(jjc)).toMatchObject({ rating: 900, league: "jjc", coins: 100 + reward("jjc").rewardCoins });
    expect(await frames(jjc)).toEqual([]);

    // No ranked games: no reward or recorded finish, but the reset still applies.
    expect(await prof(idle)).toMatchObject({ rating: 1700, league: "odogwu", coins: 100 });
    expect(await frames(idle)).toEqual([]);
    expect(await seasonHistory(sql, idle)).toEqual([]);
  });
});
