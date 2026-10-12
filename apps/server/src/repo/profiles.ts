import {
  DEFAULT_SETTINGS,
  leagueForRating,
  levelFromXp,
  titleForLevel,
  lagosDate,
  type MeProfile,
  type MeResponse,
  type PublicProfile,
  type InventoryItem,
  type Settings,
} from "@ntc/shared";
import type { Sql, Row } from "../db";

export const PROFILE_COLUMNS = `id, username, avatar_id, state_code, level, xp, coins, rating, league, ranked_games, wins, losses, draws,
  premium_until, is_guest, is_admin, guest_match_used, frame_id, button_theme_id, settings, push_token,
  free_powerup_date::text as free_powerup_date, chest_date::text as chest_date, first_win_date::text as first_win_date, matches_since_ad, created_at`;

export function toPublic(r: Row): PublicProfile {
  return {
    id: r.id,
    username: r.username ?? "Guest",
    avatarId: r.avatar_id ?? "ada",
    stateCode: r.state_code ?? "DI",
    level: r.xp != null ? levelFromXp(r.xp).level : (r.level ?? 1),
    rating: r.rating ?? 1000,
    league: leagueForRating(r.rating ?? 1000).id,
    frameId: r.frame_id ?? null,
    title: titleForLevel(r.xp != null ? levelFromXp(r.xp).level : (r.level ?? 1)),
  };
}

export const isPremium = (r: Row) => !!r.premium_until && new Date(r.premium_until).getTime() > Date.now();

export function toMe(r: Row): MeProfile {
  return {
    ...toPublic(r),
    isGuest: !!r.is_guest,
    onboarded: !!r.username && !!r.state_code,
    xp: r.xp,
    coins: r.coins,
    rankedGames: r.ranked_games,
    premiumUntil: r.premium_until ? new Date(r.premium_until).toISOString() : null,
    isPremium: isPremium(r),
    buttonThemeId: r.button_theme_id ?? null,
    settings: { ...DEFAULT_SETTINGS, ...(r.settings ?? {}) } as Settings,
    freePowerUpAvailable: r.free_powerup_date !== lagosDate(),
    guestMatchUsed: !!r.guest_match_used,
    isAdmin: !!r.is_admin,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function getProfileRow(sql: Sql, userId: string) {
  return sql.one(`select ${PROFILE_COLUMNS} from profiles where id = $1`, [userId]);
}

export async function getMe(sql: Sql, userId: string): Promise<MeResponse | null> {
  const row = await getProfileRow(sql, userId);
  if (!row) return null;
  const inv = await sql.query<{ item_id: string; kind: InventoryItem["kind"]; quantity: number }>(
    "select item_id, kind, quantity from inventory where user_id = $1 and quantity > 0 order by kind, item_id",
    [userId],
  );
  return { profile: toMe(row), inventory: inv.map((i) => ({ itemId: i.item_id, kind: i.kind, quantity: i.quantity })) };
}

export async function usernameAvailable(sql: Sql, username: string, exceptUserId?: string) {
  const r = await sql.one("select id from profiles where lower(username) = lower($1) and id <> coalesce($2::uuid, '00000000-0000-0000-0000-000000000000')", [
    username,
    exceptUserId ?? null,
  ]);
  return !r;
}

/** Apply XP and recompute level; returns before/after levels. */
export function applyXp(xp: number, gained: number) {
  const before = levelFromXp(xp).level;
  const total = xp + gained;
  const after = levelFromXp(total).level;
  return { total, before, after };
}

export async function getPublicProfiles(sql: Sql, ids: string[]) {
  if (!ids.length) return new Map<string, PublicProfile>();
  const rows = await sql.query(`select ${PROFILE_COLUMNS} from profiles where id = any($1::uuid[])`, [`{${ids.join(",")}}`]);
  return new Map(rows.map((r) => [r.id as string, toPublic(r)]));
}
