import { STATES, lagosWeekStart, addDays, LAGOS_OFFSET_MS, type StateWarsResponse, type StateWarsRow, type LeaderboardPlayer, leagueForRating } from "@ntc/shared";
import type { Sql } from "../db";

export async function stateWars(sql: Sql, myState: string | null, week = lagosWeekStart()): Promise<StateWarsResponse> {
  const [now, prev] = await Promise.all([
    sql.query("select * from state_weekly_leaderboard($1)", [week]),
    sql.query("select code, rank, points from state_weekly_leaderboard($1)", [addDays(week, -7)]),
  ]);
  const prevRank = new Map(prev.map((r) => [r.code, r.points > 0 ? r.rank : null]));
  const rows: StateWarsRow[] = now.map((r) => {
    const last = prevRank.get(r.code) ?? null;
    return {
      code: r.code,
      name: r.name,
      region: r.region,
      rank: r.rank,
      points: r.points,
      lastWeekRank: last,
      change: last === null ? null : last - r.rank,
      players: r.players,
      topPlayer: r.top_user_id ? { id: r.top_user_id, username: r.top_username ?? "Player", avatarId: r.top_avatar_id ?? "ada", points: r.top_points } : null,
    };
  });
  const endsAt = Date.parse(`${addDays(week, 7)}T00:00:00Z`) - LAGOS_OFFSET_MS;
  return { weekStart: week, endsAt, rows, myState };
}

export async function stateTopPlayers(sql: Sql, code: string, week = lagosWeekStart()): Promise<{ state: (typeof STATES)[number] | undefined; players: LeaderboardPlayer[]; weekStart: string }> {
  const rows = await sql.query("select * from state_top_players($1, $2, 20)", [code, week]);
  return {
    state: STATES.find((s) => s.code === code),
    weekStart: week,
    players: rows.map((r) => ({
      rank: r.rank,
      id: r.user_id,
      username: r.username ?? "Player",
      avatarId: r.avatar_id ?? "ada",
      stateCode: code,
      points: r.points,
      league: (r.league as any) ?? "learner",
      frameId: r.frame_id ?? null,
    })),
  };
}

export async function dailyBoard(sql: Sql, date: string, state: string | null): Promise<LeaderboardPlayer[]> {
  const rows = await sql.query("select * from daily_leaderboard($1, $2, 50)", [date, state]);
  return rows.map((r) => ({
    rank: r.rank,
    id: r.user_id,
    username: r.username ?? "Player",
    avatarId: r.avatar_id ?? "ada",
    stateCode: r.state_code ?? "DI",
    points: r.score,
    league: (r.league as any) ?? leagueForRating(1000).id,
    frameId: r.frame_id ?? null,
  }));
}
