import { randomBytes } from "node:crypto";
import { CHALLENGE_TTL_MS, QUESTIONS_PER_MATCH, XP, selectQuestions, type ChallengeSummary, type CategorySlug } from "@ntc/shared";
import { pgArray, type Sql } from "../db";
import { activeCategories, questionPool, recentlySeen } from "./questions";
import { getPublicProfiles, isPremium } from "./profiles";
import { HttpError } from "../api/http";
import { env } from "../env";
import type { SoloTable } from "./solo";
import { checkAchievements } from "./achievements";

/** Free players can send 2 challenges per 24 hours (direct ones included); Premium is unlimited. */
export const FREE_CHALLENGES_PER_DAY = 2;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  const bytes = randomBytes(6);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function challengeLinks(code: string, creatorName: string) {
  // Server link page carries OpenGraph tags (rich WhatsApp preview) and forwards to the app.
  const shareUrl = `${env.publicUrl}/l/c/${code}`;
  const text = `I just played a Naija Trivia Clash challenge. You fit beat my score? 🇳🇬 Play the same 7 questions here: ${shareUrl}`;
  return { shareUrl, whatsappUrl: `https://wa.me/?text=${encodeURIComponent(text)}`, text, creatorName };
}

export async function createChallenge(sql: Sql, userId: string, targetId: string | null = null) {
  const prof = await sql.one("select rating, premium_until, username from profiles where id = $1", [userId]);
  if (!prof) throw new HttpError(404, "Profile not found");
  if (!isPremium(prof)) {
    const n = await sql.one<{ n: number }>("select count(*)::int as n from challenges where created_by = $1 and created_at > now() - interval '24 hours'", [userId]);
    if ((n?.n ?? 0) >= FREE_CHALLENGES_PER_DAY) {
      throw new HttpError(402, `Free players can send ${FREE_CHALLENGES_PER_DAY} challenges a day. Go Premium for unlimited.`, "challenge_limit");
    }
  }
  const cats = await activeCategories(sql);
  const chosen = [...cats].sort(() => Math.random() - 0.5).slice(0, 3);
  const pool = await questionPool(sql, chosen.map((c) => c.id));
  const seen = await recentlySeen(sql, [userId]);
  const picks = selectQuestions(pool, { categories: chosen.map((c) => c.id), avgRating: prof.rating, recentlySeen: seen, count: QUESTIONS_PER_MATCH });
  let code = makeCode();
  for (let i = 0; i < 5; i++) {
    const clash = await sql.one("select 1 from challenges where code = $1", [code]);
    if (!clash) break;
    code = makeCode();
  }
  await sql.query(
    "insert into challenges (code, created_by, question_ids, categories, expires_at, target_id) values ($1, $2, $3::uuid[], $4::text[], now() + ($5 || ' milliseconds')::interval, $6)",
    [code, userId, pgArray(picks.map((p) => p.id)), pgArray(chosen.map((c) => c.slug)), String(CHALLENGE_TTL_MS), targetId],
  );
  return code;
}

export async function getChallengeRow(sql: Sql, code: string) {
  const c: any = await sql.one("select id, code, created_by, target_id, question_ids, categories, expires_at, created_at from challenges where code = $1", [code.toUpperCase()]);
  if (!c) throw new HttpError(404, "This challenge link doesn't exist.", "not_found");
  return c;
}

export function challengeTable(userId: string, c: { id: string; question_ids: string[] }): SoloTable {
  return { table: "challenge_entries", keyCol: "challenge_id", key: c.id, userId, questionIds: c.question_ids, mode: "challenge", doubleLast: true };
}

export async function challengeSummary(sql: Sql, code: string, viewerId: string | null): Promise<ChallengeSummary> {
  const c = await getChallengeRow(sql, code);
  const entries = await sql.query(
    "select user_id, score, correct, total_ms, current_index, finished_at from challenge_entries where challenge_id = $1 order by finished_at nulls last, score desc",
    [c.id],
  );
  const profiles = await getPublicProfiles(sql, [c.created_by, ...entries.map((e) => e.user_id)]);
  const mine = viewerId ? entries.find((e) => e.user_id === viewerId) : undefined;
  const creator = profiles.get(c.created_by)!;
  const links = challengeLinks(c.code, creator.username);
  return {
    code: c.code,
    createdBy: creator,
    createdAt: new Date(c.created_at).toISOString(),
    expiresAt: new Date(c.expires_at).toISOString(),
    expired: new Date(c.expires_at).getTime() < Date.now(),
    categories: c.categories as CategorySlug[],
    entries: entries
      .filter((e) => profiles.has(e.user_id))
      .map((e) => ({
        player: profiles.get(e.user_id)!,
        score: e.finished_at ? e.score : null,
        correct: e.finished_at ? e.correct : null,
        finished: !!e.finished_at,
        totalMs: e.total_ms,
      })),
    myEntry: mine ? { nextIndex: mine.current_index, finished: !!mine.finished_at, score: mine.score } : null,
    shareUrl: links.shareUrl,
    whatsappUrl: links.whatsappUrl,
  };
}

export async function startChallenge(sql: Sql, code: string, userId: string) {
  const c = await getChallengeRow(sql, code);
  const existing = await sql.one("select 1 from challenge_entries where challenge_id = $1 and user_id = $2", [c.id, userId]);
  if (!existing && new Date(c.expires_at).getTime() < Date.now()) throw new HttpError(410, "This challenge has expired (48 hours).", "expired");
  await sql.query("insert into challenge_entries (challenge_id, user_id) values ($1, $2) on conflict do nothing", [c.id, userId]);
  return c;
}

/** When someone finishes: give XP/coins and, if the creator has a score, record a friend match for history. */
export async function completeChallenge(sql: Sql, c: { id: string; created_by: string; categories: string[] }, userId: string, totals: { score: number; correct: number; total_ms: number }) {
  await sql.query("update profiles set xp = xp + $2, coins = coins + 10, updated_at = now() where id = $1", [userId, XP.perCorrect * totals.correct]);
  if (userId === c.created_by) {
    // Anyone who played before the creator gets their result recorded now.
    const others = await sql.query("select user_id, score, total_ms from challenge_entries where challenge_id = $1 and user_id <> $2 and finished_at is not null", [c.id, userId]);
    for (const o of others) await recordFriendMatch(sql, c, { userId: c.created_by, ...totals }, { userId: o.user_id, score: o.score, total_ms: o.total_ms });
    await checkAchievements(sql, userId);
    return null;
  }
  const creator = await sql.one("select score, total_ms from challenge_entries where challenge_id = $1 and user_id = $2 and finished_at is not null", [c.id, c.created_by]);
  if (!creator) {
    await checkAchievements(sql, userId);
    return null;
  }
  const winner = await recordFriendMatch(sql, c, { userId: c.created_by, score: creator.score, total_ms: creator.total_ms }, { userId, ...totals });
  return { creatorId: c.created_by, winner };
}

type Side = { userId: string; score: number; total_ms: number };

/** Record a finished challenge pairing as a 'friend' match (highest score wins, fastest breaks ties). */
async function recordFriendMatch(sql: Sql, c: { categories: string[] }, creator: Side, other: Side) {
  const winner =
    creator.score === other.score ? (creator.total_ms === other.total_ms ? null : creator.total_ms < other.total_ms ? creator.userId : other.userId) : creator.score > other.score ? creator.userId : other.userId;
  await sql.query("insert into matches (type, player_a, player_b, winner, score_a, score_b, categories) values ('friend', $1, $2, $3, $4, $5, $6::text[])", [
    creator.userId,
    other.userId,
    winner,
    creator.score,
    other.score,
    pgArray(c.categories),
  ]);
  await checkAchievements(sql, other.userId);
  await checkAchievements(sql, creator.userId);
  return winner;
}

/** Open challenges a friend sent straight to this player (once the sender has set a score) that they haven't played yet. */
export async function incomingChallenges(sql: Sql, userId: string) {
  const rows = await sql.query<{ code: string; created_by: string; expires_at: string; score: number }>(
    `select c.code, c.created_by, c.expires_at, ce.score from challenges c
       join challenge_entries ce on ce.challenge_id = c.id and ce.user_id = c.created_by and ce.finished_at is not null
      where c.target_id = $1 and c.expires_at > now()
        and not exists (select 1 from challenge_entries e where e.challenge_id = c.id and e.user_id = $1)
      order by c.created_at desc limit 5`,
    [userId],
  );
  const profiles = await getPublicProfiles(sql, rows.map((r) => r.created_by));
  return rows
    .filter((r) => profiles.has(r.created_by))
    .map((r) => ({ code: r.code, from: profiles.get(r.created_by)!, expiresAt: new Date(r.expires_at).toISOString(), scoreToBeat: r.score }));
}
