import { createHash } from "node:crypto";
import { lagosDate, type MissionMetric, type MissionProgress } from "@ntc/shared";
import type { Sql } from "../db";

/** Pick 3 missions for a user/day deterministically, always including the Daily Naija mission. */
function pickSlugs(all: { slug: string }[], userId: string, date: string): string[] {
  const rest = all.filter((m) => m.slug !== "daily1");
  const scored = rest
    .map((m) => ({ slug: m.slug, h: createHash("sha1").update(`${userId}:${date}:${m.slug}`).digest().readUInt32BE(0) }))
    .sort((a, b) => a.h - b.h);
  const has = all.some((m) => m.slug === "daily1");
  return [...(has ? ["daily1"] : []), ...scored.slice(0, has ? 2 : 3).map((s) => s.slug)];
}

export async function ensureDailyMissions(sql: Sql, userId: string, date = lagosDate()) {
  const existing = await sql.one<{ n: number }>("select count(*)::int as n from user_missions where user_id = $1 and mission_date = $2", [userId, date]);
  if (existing && existing.n > 0) return;
  const all = await sql.query<{ id: string; slug: string }>("select id, slug from missions where active order by slug");
  const slugs = pickSlugs(all, userId, date);
  for (const slug of slugs) {
    const m = all.find((x) => x.slug === slug)!;
    await sql.query("insert into user_missions (user_id, mission_id, mission_date) values ($1, $2, $3) on conflict do nothing", [userId, m.id, date]);
  }
}

export async function listMissions(sql: Sql, userId: string, date = lagosDate()): Promise<MissionProgress[]> {
  await ensureDailyMissions(sql, userId, date);
  const rows = await sql.query(
    `select um.id, m.slug, m.title, m.target, m.reward, um.progress, um.completed_at, um.claimed_at
       from user_missions um join missions m on m.id = um.mission_id
      where um.user_id = $1 and um.mission_date = $2
      order by (um.claimed_at is not null), m.reward`,
    [userId, date],
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    progress: Math.min(r.progress, r.target),
    target: r.target,
    reward: r.reward,
    completed: !!r.completed_at,
    claimed: !!r.claimed_at,
  }));
}

/** Increment today's mission metrics (inside the caller's transaction). */
export async function bumpMissions(sql: Sql, userId: string, deltas: Partial<Record<MissionMetric, number>>, date = lagosDate()) {
  await ensureDailyMissions(sql, userId, date);
  for (const [metric, delta] of Object.entries(deltas)) {
    if (!delta) continue;
    await sql.query(
      `update user_missions um set
          progress = least(m.target, um.progress + $3),
          completed_at = case when um.completed_at is null and um.progress + $3 >= m.target then now() else um.completed_at end
         from missions m
        where m.id = um.mission_id and um.user_id = $1 and um.mission_date = $2 and m.metric = $4 and um.claimed_at is null`,
      [userId, date, delta, metric],
    );
  }
}

export async function claimMission(sql: Sql, userId: string, missionId: string) {
  return sql.tx(async (tx) => {
    const row = await tx.one(
      `select um.id, m.reward from user_missions um join missions m on m.id = um.mission_id
        where um.id = $1 and um.user_id = $2 and um.completed_at is not null and um.claimed_at is null for update of um`,
      [missionId, userId],
    );
    if (!row) return null;
    await tx.query("update user_missions set claimed_at = now() where id = $1", [missionId]);
    const p = await tx.one<{ coins: number }>("update profiles set coins = coins + $2, updated_at = now() where id = $1 returning coins", [userId, row.reward]);
    return { reward: row.reward as number, coins: p!.coins };
  });
}
