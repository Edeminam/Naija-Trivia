import { lagosWeekStart, type FriendItem, type FriendsResponse, type FriendStatus, type HeadToHead, type PlayerSearchResult, type PublicProfile } from "@ntc/shared";
import type { Sql } from "../db";
import { HttpError } from "../api/http";
import { getPublicProfiles, PROFILE_COLUMNS, toPublic } from "./profiles";

/** Max friends per player — keeps the friends leaderboard and push fan-out sane. */
export const MAX_FRIENDS = 200;

const PAIR = "least(requester_id, addressee_id) = least($1::uuid, $2::uuid) and greatest(requester_id, addressee_id) = greatest($1::uuid, $2::uuid)";

export async function friendStatus(sql: Sql, me: string, other: string): Promise<FriendStatus> {
  if (me === other) return "self";
  const r = await sql.one<{ requester_id: string; status: string }>(`select requester_id, status from friendships where ${PAIR}`, [me, other]);
  if (!r) return "none";
  if (r.status === "accepted") return "friends";
  return r.requester_id === me ? "outgoing" : "incoming";
}

export async function friendIds(sql: Sql, userId: string): Promise<string[]> {
  const rows = await sql.query<{ id: string }>(
    `select case when requester_id = $1 then addressee_id else requester_id end as id
       from friendships where status = 'accepted' and (requester_id = $1 or addressee_id = $1)`,
    [userId],
  );
  return rows.map((r) => r.id);
}

/** Head-to-head record from ranked clashes and friend challenges between two players. */
export async function headToHead(sql: Sql, me: string, others: string[]): Promise<Map<string, HeadToHead & { last: string | null }>> {
  const out = new Map<string, HeadToHead & { last: string | null }>();
  for (const id of others) out.set(id, { wins: 0, losses: 0, draws: 0, last: null });
  if (!others.length) return out;
  const rows = await sql.query<{ other: string; wins: number; losses: number; draws: number; last: string }>(
    `select case when player_a = $1 then player_b else player_a end as other,
            count(*) filter (where winner = $1)::int as wins,
            count(*) filter (where winner is not null and winner <> $1)::int as losses,
            count(*) filter (where winner is null)::int as draws,
            max(created_at) as last
       from matches
      where not is_bot and type in ('ranked', 'friend')
        and ((player_a = $1 and player_b = any($2::uuid[])) or (player_b = $1 and player_a = any($2::uuid[])))
      group by 1`,
    [me, `{${others.join(",")}}`],
  );
  for (const r of rows) out.set(r.other, { wins: r.wins, losses: r.losses, draws: r.draws, last: r.last ? new Date(r.last).toISOString() : null });
  return out;
}

export async function listFriends(sql: Sql, userId: string): Promise<FriendsResponse> {
  const rows = await sql.query<{ requester_id: string; addressee_id: string; status: string; created_at: string; accepted_at: string | null }>(
    "select requester_id, addressee_id, status, created_at, accepted_at from friendships where requester_id = $1 or addressee_id = $1",
    [userId],
  );
  const other = (r: (typeof rows)[number]) => (r.requester_id === userId ? r.addressee_id : r.requester_id);
  const profiles = await getPublicProfiles(sql, rows.map(other));
  const accepted = rows.filter((r) => r.status === "accepted");
  const h2h = await headToHead(sql, userId, accepted.map(other));
  const week = await sql.query<{ user_id: string; points: number }>(
    "select user_id, sum(points)::int as points from state_weekly_points where week_start = $1 and user_id = any($2::uuid[]) group by user_id",
    [lagosWeekStart(), `{${accepted.map(other).join(",")}}`],
  );
  const weekPts = new Map(week.map((w) => [w.user_id, w.points]));
  const friends: FriendItem[] = accepted
    .filter((r) => profiles.has(other(r)))
    .map((r) => {
      const id = other(r);
      const rec = h2h.get(id)!;
      return { profile: profiles.get(id)!, record: { wins: rec.wins, losses: rec.losses, draws: rec.draws }, weekPoints: weekPts.get(id) ?? 0, since: new Date(r.accepted_at ?? r.created_at).toISOString() };
    })
    .sort((a, b) => b.profile.rating - a.profile.rating);
  const pending = (dir: "in" | "out") =>
    rows
      .filter((r) => r.status === "pending" && (dir === "in" ? r.addressee_id === userId : r.requester_id === userId) && profiles.has(other(r)))
      .map((r) => ({ profile: profiles.get(other(r))!, at: new Date(r.created_at).toISOString() }));
  return { friends, incoming: pending("in"), outgoing: pending("out") };
}

export async function searchPlayers(sql: Sql, userId: string, query: string): Promise<PlayerSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const rows = await sql.query(
    `select ${PROFILE_COLUMNS} from profiles
      where username is not null and not is_guest and id <> $1 and lower(username) like lower($2) || '%' escape '\\'
      order by (lower(username) = lower($3)) desc, length(username), username limit 10`,
    [userId, q.replace(/[%_\\]/g, "\\$&"), q],
  );
  const out: PlayerSearchResult[] = [];
  for (const r of rows) out.push({ profile: toPublic(r), status: await friendStatus(sql, userId, r.id) });
  return out;
}

/**
 * Send a friend request — or accept, if they already asked you.
 * Returns the resulting status and whether a new request was created (for notifications).
 */
export async function requestFriend(sql: Sql, me: string, other: string): Promise<{ status: FriendStatus; created: boolean; accepted: boolean }> {
  if (me === other) throw new HttpError(400, "You can't add yourself.");
  const target = await sql.one("select id, is_guest, username from profiles where id = $1", [other]);
  if (!target || target.is_guest || !target.username) throw new HttpError(404, "Player not found");
  const status = await friendStatus(sql, me, other);
  if (status === "friends" || status === "outgoing") return { status, created: false, accepted: false };
  if (status === "incoming") {
    await acceptFriend(sql, me, other);
    return { status: "friends", created: false, accepted: true };
  }
  const n = (await friendIds(sql, me)).length;
  if (n >= MAX_FRIENDS) throw new HttpError(409, `You can have up to ${MAX_FRIENDS} friends.`);
  await sql.query("insert into friendships (requester_id, addressee_id) values ($1, $2) on conflict do nothing", [me, other]);
  return { status: "outgoing", created: true, accepted: false };
}

export async function acceptFriend(sql: Sql, me: string, other: string) {
  const r = await sql.one(
    "update friendships set status = 'accepted', accepted_at = now() where requester_id = $2 and addressee_id = $1 and status = 'pending' returning requester_id",
    [me, other],
  );
  if (!r) throw new HttpError(404, "No friend request from this player.");
}

/** Unfriend, decline an incoming request or cancel an outgoing one. */
export async function removeFriend(sql: Sql, me: string, other: string) {
  await sql.query(`delete from friendships where ${PAIR}`, [me, other]);
}

/**
 * Your rival: the friend with the most head-to-head games in the last 30 days
 * (ties go to the most recent). Falls back to your highest-rated friend.
 */
export async function findRival(sql: Sql, userId: string): Promise<{ friend: PublicProfile; record: HeadToHead } | null> {
  const ids = await friendIds(sql, userId);
  if (!ids.length) return null;
  const recent = await sql.query<{ other: string; n: number; last: string }>(
    `select case when player_a = $1 then player_b else player_a end as other, count(*)::int as n, max(created_at) as last
       from matches
      where not is_bot and type in ('ranked', 'friend') and created_at > now() - interval '30 days'
        and ((player_a = $1 and player_b = any($2::uuid[])) or (player_b = $1 and player_a = any($2::uuid[])))
      group by 1 order by n desc, last desc limit 1`,
    [userId, `{${ids.join(",")}}`],
  );
  const profiles = await getPublicProfiles(sql, ids);
  const pickId = recent[0]?.other ?? [...profiles.values()].sort((a, b) => b.rating - a.rating)[0]?.id;
  if (!pickId || !profiles.has(pickId)) return null;
  const rec = (await headToHead(sql, userId, [pickId])).get(pickId)!;
  return { friend: profiles.get(pickId)!, record: { wins: rec.wins, losses: rec.losses, draws: rec.draws } };
}
