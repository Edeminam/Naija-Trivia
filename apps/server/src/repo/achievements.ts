import { ACHIEVEMENTS, DAILY_QUESTION_COUNT, QUESTIONS_PER_MATCH, type AchievementMetric, type AchievementProgress } from "@ntc/shared";
import type { Sql } from "../db";

/** Every achievement metric for one player, in a single round trip. */
export async function achievementMetrics(sql: Sql, userId: string): Promise<Record<AchievementMetric, number>> {
  const r = await sql.one(
    `select
       p.wins,
       p.peak_rating,
       coalesce((select best from streaks where user_id = $1), 0) as best_streak,
       (select count(*)::int from (
          select match_id from match_answers where user_id = $1 and mode = 'match'
           group by match_id having count(*) filter (where correct) >= $2) m) as perfect_matches,
       (select count(*)::int from daily_entries where user_id = $1 and finished_at is not null and correct >= $3) as perfect_dailies,
       (select count(*)::int from friendships where status = 'accepted' and (requester_id = $1 or addressee_id = $1)) as friends,
       (select count(*)::int from matches where type = 'friend' and winner = $1) as friend_wins,
       (select count(*)::int from challenge_entries where user_id = $1 and finished_at is not null) as challenges_played,
       coalesce((select max(points) from state_weekly_points where user_id = $1), 0) as best_state_week,
       (select count(distinct c.slug)::int from match_answers a join categories c on c.id = a.category_id where a.user_id = $1 and a.correct) as categories_correct
     from profiles p where p.id = $1`,
    [userId, QUESTIONS_PER_MATCH, DAILY_QUESTION_COUNT],
  );
  return {
    wins: r?.wins ?? 0,
    peak_rating: r?.peak_rating ?? 0,
    best_streak: r?.best_streak ?? 0,
    perfect_matches: r?.perfect_matches ?? 0,
    perfect_dailies: r?.perfect_dailies ?? 0,
    friends: r?.friends ?? 0,
    friend_wins: r?.friend_wins ?? 0,
    challenges_played: r?.challenges_played ?? 0,
    best_state_week: r?.best_state_week ?? 0,
    categories_correct: r?.categories_correct ?? 0,
  };
}

/** Unlock anything newly earned (inside the caller's transaction). Returns the slugs unlocked now. */
export async function checkAchievements(sql: Sql, userId: string): Promise<string[]> {
  const have = new Set((await sql.query<{ slug: string }>("select slug from user_achievements where user_id = $1", [userId])).map((r) => r.slug));
  if (have.size === ACHIEVEMENTS.length) return [];
  const m = await achievementMetrics(sql, userId);
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (have.has(a.slug) || m[a.metric] < a.target) continue;
    const ins = await sql.one("insert into user_achievements (user_id, slug) values ($1, $2) on conflict do nothing returning slug", [userId, a.slug]);
    if (ins) fresh.push(a.slug);
  }
  return fresh;
}

export async function listAchievements(sql: Sql, userId: string): Promise<AchievementProgress[]> {
  const [m, rows] = await Promise.all([
    achievementMetrics(sql, userId),
    sql.query<{ slug: string; claimed_at: string | null }>("select slug, claimed_at from user_achievements where user_id = $1", [userId]),
  ]);
  const got = new Map(rows.map((r) => [r.slug, r]));
  return ACHIEVEMENTS.map((a) => ({
    slug: a.slug,
    progress: Math.min(m[a.metric], a.target),
    target: a.target,
    unlocked: got.has(a.slug),
    claimed: !!got.get(a.slug)?.claimed_at,
  }));
}

export async function unclaimedAchievements(sql: Sql, userId: string): Promise<number> {
  const r = await sql.one<{ n: number }>("select count(*)::int as n from user_achievements where user_id = $1 and claimed_at is null", [userId]);
  return r?.n ?? 0;
}

export async function claimAchievement(sql: Sql, userId: string, slug: string) {
  const def = ACHIEVEMENTS.find((a) => a.slug === slug);
  if (!def) return null;
  return sql.tx(async (tx) => {
    const row = await tx.one("update user_achievements set claimed_at = now() where user_id = $1 and slug = $2 and claimed_at is null returning slug", [userId, slug]);
    if (!row) return null;
    const p = await tx.one<{ coins: number }>("update profiles set coins = coins + $2, updated_at = now() where id = $1 returning coins", [userId, def.reward]);
    return { reward: def.reward, coins: p!.coins };
  });
}
