import { STATES, STATE_WAR_PRIZES, lagosWeekStart, addDays, LAGOS_OFFSET_MS, type StateWarsResponse, type StateWarsRow, type LeaderboardPlayer, leagueForRating } from "@ntc/shared";
import type { Sql } from "../db";

export async function stateWars(sql: Sql, myState: string | null, week = lagosWeekStart(), viewerId: string | null = null): Promise<StateWarsResponse> {
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
  return { weekStart: week, endsAt, rows, myState, lastWeek: await lastWeekPodium(sql, addDays(week, -7), viewerId) };
}

async function lastWeekPodium(sql: Sql, week: string, viewerId: string | null): Promise<StateWarsResponse["lastWeek"]> {
  const podium = await sql.query<{ rank: number; state_code: string; points: number; prize: number }>(
    "select rank, state_code, points, prize from state_week_results where week_start = $1 order by rank",
    [week],
  );
  if (!podium.length) return null;
  const mine = viewerId ? await sql.one<{ coins: number }>("select coins from state_week_prizes where week_start = $1 and user_id = $2", [week, viewerId]) : null;
  return {
    weekStart: week,
    podium: podium.map((r) => ({ rank: r.rank, code: r.state_code, name: STATES.find((s) => s.code === r.state_code)?.name ?? r.state_code, points: r.points, prize: r.prize })),
    myPrize: mine?.coins ?? 0,
  };
}

export interface SettledWeek {
  weekStart: string;
  podium: { rank: number; code: string; prize: number }[];
  /** user → coins won */
  paid: Map<string, { coins: number; stateCode: string; rank: number }>;
}

/**
 * Close a finished State Wars week (idempotent): record the top 3 states and pay every player who
 * scored for them. Returns null if the week was already settled or hasn't ended yet.
 */
export async function settleStateWeek(sql: Sql, week = addDays(lagosWeekStart(), -7)): Promise<SettledWeek | null> {
  if (week >= lagosWeekStart()) return null;
  return sql.tx(async (tx) => {
    const fresh = await tx.one("insert into state_weeks (week_start) values ($1) on conflict do nothing returning week_start", [week]);
    if (!fresh) return null;
    const board = await tx.query<{ code: string; points: number; rank: number }>("select code, points, rank from state_weekly_leaderboard($1) where points > 0 order by rank limit $2", [
      week,
      STATE_WAR_PRIZES.length,
    ]);
    const paid: SettledWeek["paid"] = new Map();
    const podium: SettledWeek["podium"] = [];
    for (const [i, row] of board.entries()) {
      const rank = i + 1;
      const prize = STATE_WAR_PRIZES[i]!;
      podium.push({ rank, code: row.code, prize });
      await tx.query("insert into state_week_results (week_start, rank, state_code, points, prize) values ($1, $2, $3, $4, $5)", [week, rank, row.code, row.points, prize]);
      const players = await tx.query<{ user_id: string }>("select user_id from state_weekly_points where week_start = $1 and state_code = $2 and points > 0", [week, row.code]);
      for (const p of players) {
        const ins = await tx.one(
          "insert into state_week_prizes (week_start, user_id, state_code, coins) values ($1, $2, $3, $4) on conflict do nothing returning user_id",
          [week, p.user_id, row.code, prize],
        );
        if (!ins) continue;
        await tx.query("update profiles set coins = coins + $2, updated_at = now() where id = $1", [p.user_id, prize]);
        paid.set(p.user_id, { coins: prize, stateCode: row.code, rank });
      }
    }
    return { weekStart: week, podium, paid };
  });
}

/**
 * Compare this week's ranking with the last snapshot and return the states that lost a top-10 place,
 * with the state that passed them. Updates the snapshot.
 */
export async function detectOvertakes(sql: Sql, week = lagosWeekStart()): Promise<{ victim: string; by: string; rank: number }[]> {
  const now = await sql.query<{ code: string; rank: number; points: number }>("select code, rank, points from state_weekly_leaderboard($1) where points > 0", [week]);
  const prev = await sql.query<{ state_code: string; rank: number }>("select state_code, rank from state_rank_snapshot where week_start = $1", [week]);
  const before = new Map(prev.map((p) => [p.state_code, p.rank]));
  const byRank = new Map(now.map((r) => [r.rank, r.code]));
  const out: { victim: string; by: string; rank: number }[] = [];
  if (prev.length) {
    for (const r of now) {
      const was = before.get(r.code);
      if (was === undefined || r.rank <= was || was > 10) continue;
      // The state now directly above the victim, if it was below the victim last time, did the overtaking.
      const by = byRank.get(r.rank - 1);
      if (by && (before.get(by) ?? Infinity) > was) out.push({ victim: r.code, by, rank: r.rank });
    }
  }
  await sql.tx(async (tx) => {
    await tx.query("delete from state_rank_snapshot where week_start = $1", [week]);
    for (const r of now) await tx.query("insert into state_rank_snapshot (week_start, state_code, rank, points) values ($1, $2, $3, $4)", [week, r.code, r.rank, r.points]);
  });
  return out;
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
