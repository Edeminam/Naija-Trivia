import { Router } from "express";
import { z } from "zod";
import {
  onboardingSchema,
  profilePatchSchema,
  usernameSchema,
  reportSchema,
  challengeAnswerSchema,
  offlineDailySubmitSchema,
  directChallengeSchema,
  COSMETICS,
  POWER_UPS,
  PRODUCTS,
  AUTO_PAUSE_REPORT_COUNT,
  INTERSTITIAL_EVERY_N_MATCHES,
  CATEGORIES,
  lagosDate,
  themeFor,
  featuredLiveEvent,
  leagueForRating,
  leagueProgress,
  nextLeague,
  type HomeResponse,
  type LeaguesResponse,
  type ProfileStatsResponse,
  type MatchHistoryItem,
  type CategoryStat,
  type CategorySlug,
} from "@ntc/shared";
import { authed, open, parse, HttpError } from "./http";
import { env } from "../env";
import { createDevUser, issueDevToken } from "../auth";
import { getMe, usernameAvailable, getProfileRow, toPublic, isPremium, getPublicProfiles as getPublicProfilesFor } from "../repo/profiles";
import { listMissions, claimMission } from "../repo/missions";
import { dailyStatus, getStreak, startDaily, dailyTable, completeDaily, ensureDailySet, startOfflineDaily, submitOfflineDaily } from "../repo/daily";
import { serveNext, submitAnswer } from "../repo/solo";
import { createChallenge, challengeSummary, startChallenge, challengeTable, completeChallenge, getChallengeRow, incomingChallenges, settleDueStakes } from "../repo/challenges";
import { listAchievements, claimAchievement, unclaimedAchievements, checkAchievements } from "../repo/achievements";
import { listFriends, searchPlayers, requestFriend, acceptFriend, removeFriend, friendStatus, findRival } from "../repo/friends";
import { stateWars, stateTopPlayers, dailyBoard } from "../repo/leaderboards";
import { currentSeason, seasonHistory } from "../repo/seasons";
import { purchaseProduct, buyItem, equipItem, shopCatalog } from "../repo/shop";
import { applyPremiumPerks } from "../repo/premium";
import { eventStatus, startEvent, eventTableFor, completeEvent, requireLive } from "../repo/events";
import { notifyChallengeResult, notifyFriendRequest, notifyDirectChallenge } from "../services/notifications";
import { analytics } from "../services/analytics";

export const player = Router();

// ── Auth (dev / local) ─────────────────────────────────────────────────────
player.post(
  "/auth/dev",
  open(async ({ req, sql }) => {
    if (!env.allowDevAuth) throw new HttpError(404, "Not available");
    const body = parse(z.object({ guest: z.boolean().default(false), username: usernameSchema.optional(), admin: z.boolean().optional() }), req.body ?? {});
    const userId = await createDevUser(sql, { guest: body.guest, username: body.username, admin: body.admin });
    const token = await issueDevToken(userId, body.guest);
    return { token, userId };
  }),
);

/** Dev-mode equivalent of linking an identity to an anonymous Supabase user: same id, no longer a guest. */
player.post(
  "/auth/dev/upgrade",
  authed(async ({ user, sql }) => {
    if (!env.allowDevAuth) throw new HttpError(404, "Not available");
    await sql.query("update profiles set is_guest = false where id = $1", [user.userId]);
    return { token: await issueDevToken(user.userId, false), userId: user.userId };
  }),
);

player.get("/config", open(async () => ({ devAuth: env.allowDevAuth, supabase: !!env.supabaseUrl, appUrl: env.appUrl, serverTime: Date.now() })));

// ── Me ─────────────────────────────────────────────────────────────────────
player.get("/me", authed(async ({ sql, user }) => getMe(sql, user.userId)));

player.get(
  "/username-available",
  authed(async ({ req, sql, user }) => {
    const r = usernameSchema.safeParse(req.query.u);
    if (!r.success) return { available: false, reason: r.error.issues[0]?.message };
    const available = await usernameAvailable(sql, r.data, user.userId);
    return { available, reason: available ? null : "That name is taken" };
  }),
);

player.post(
  "/me/onboarding",
  authed(async ({ req, sql, user }) => {
    const body = parse(onboardingSchema, req.body);
    if (!(await usernameAvailable(sql, body.username, user.userId))) throw new HttpError(409, "That username is taken", "username_taken");
    await sql.query("update profiles set username = $2, avatar_id = $3, state_code = $4, updated_at = now() where id = $1", [user.userId, body.username, body.avatarId, body.stateCode]);
    analytics.track(user.userId, "onboarding_completed", { state: body.stateCode });
    return getMe(sql, user.userId);
  }),
);

player.patch(
  "/me",
  authed(async ({ req, sql, user }) => {
    const body = parse(profilePatchSchema, req.body);
    if (body.frameId || body.buttonThemeId) {
      const id = body.frameId ?? body.buttonThemeId!;
      await equipItem(sql, user.userId, id);
    }
    if (body.frameId === null) await sql.query("update profiles set frame_id = null where id = $1", [user.userId]);
    if (body.buttonThemeId === null) await sql.query("update profiles set button_theme_id = null where id = $1", [user.userId]);
    if (body.avatarId) await sql.query("update profiles set avatar_id = $2 where id = $1", [user.userId, body.avatarId]);
    if (body.stateCode) await sql.query("update profiles set state_code = $2 where id = $1", [user.userId, body.stateCode]);
    if (body.settings) await sql.query("update profiles set settings = settings || $2::jsonb, updated_at = now() where id = $1", [user.userId, JSON.stringify(body.settings)]);
    if (body.pushToken !== undefined) await sql.query("update profiles set push_token = $2 where id = $1", [user.userId, body.pushToken]);
    return getMe(sql, user.userId);
  }),
);

player.delete(
  "/me",
  authed(async ({ sql, user }) => {
    // Deleting the auth user cascades to the profile and every owned row.
    await sql.query("delete from auth.users where id = $1", [user.userId]);
    await sql.query("delete from profiles where id = $1", [user.userId]);
    analytics.track(user.userId, "account_deleted");
    return { ok: true };
  }),
);

// ── Home ───────────────────────────────────────────────────────────────────
const CHEST_COINS = 20;

player.get(
  "/home",
  authed(async ({ sql, user }) => {
    const today = lagosDate();
    const premiumPerks = await applyPremiumPerks(sql, user.userId);
    await settleDueStakes(sql, user.userId);
    const prof = await getProfileRow(sql, user.userId);
    // Backfill for players who earned achievements before they existed (or before their next match).
    if (prof && !prof.is_guest && !(await sql.one("select 1 from user_achievements where user_id = $1 limit 1", [user.userId]))) {
      await checkAchievements(sql, user.userId);
    }
    const [missions, streak, daily, wars, today_, rival, incoming, toClaim] = await Promise.all([
      listMissions(sql, user.userId, today),
      getStreak(sql, user.userId, today),
      dailyStatus(sql, user.userId, today),
      prof?.state_code ? stateWars(sql, prof.state_code) : Promise.resolve(null),
      sql.one<{ n: number }>("select count(*)::int as n from matches where (player_a = $1 or player_b = $1) and created_at > now() - interval '24 hours'", [user.userId]),
      findRival(sql, user.userId),
      incomingChallenges(sql, user.userId),
      unclaimedAchievements(sql, user.userId),
    ]);
    const row = wars?.rows.find((r) => r.code === prof?.state_code);
    const ev = featuredLiveEvent();
    const evPlayed = ev ? !!(await sql.one("select 1 from event_entries where event_id = $1 and user_id = $2 and finished_at is not null", [ev.event.id, user.userId])) : false;
    const res: HomeResponse & { chest: { available: boolean; amount: number } } = {
      missions,
      streak,
      daily: { date: today, played: daily.played, score: daily.score, resetsAt: daily.resetsAt },
      stateRank: row ? { code: row.code, name: row.name, rank: row.rank, points: row.points } : null,
      matchesToday: today_?.n ?? 0,
      firstWinAvailable: !prof?.is_guest && prof?.first_win_date !== today,
      theme: themeFor(today),
      rival,
      incomingChallenges: incoming,
      achievementsToClaim: toClaim,
      premiumPerks,
      liveEvent: ev ? { id: ev.event.id, name: ev.event.name, tagline: ev.event.tagline, live: ev.live, startsAt: ev.start, endsAt: ev.end, played: evPlayed } : null,
      chest: { available: prof?.chest_date !== today, amount: prof && isPremium(prof) ? CHEST_COINS * 2 : CHEST_COINS },
    };
    return res;
  }),
);

player.post(
  "/missions/:id/claim",
  authed(async ({ req, sql, user }) => {
    const r = await claimMission(sql, user.userId, String(req.params.id));
    if (!r) throw new HttpError(409, "Mission not ready to claim");
    return r;
  }),
);

player.post(
  "/chest/claim",
  authed(async ({ sql, user }) => {
    const today = lagosDate();
    const prof = await getProfileRow(sql, user.userId);
    const amount = prof && isPremium(prof) ? CHEST_COINS * 2 : CHEST_COINS;
    const r = await sql.one<{ coins: number }>(
      "update profiles set coins = coins + $3, chest_date = $2 where id = $1 and (chest_date is null or chest_date <> $2) returning coins",
      [user.userId, today, amount],
    );
    if (!r) throw new HttpError(409, "Chest already opened today — come back after midnight.");
    return { coins: r.coins, amount };
  }),
);

// ── Daily Naija ────────────────────────────────────────────────────────────
player.get("/daily", authed(async ({ sql, user }) => dailyStatus(sql, user.userId)));

player.post(
  "/daily/next",
  authed(async ({ sql, user }) => {
    const date = lagosDate();
    const status = await dailyStatus(sql, user.userId, date);
    if (status.played) throw new HttpError(409, "You've already played today's Daily Naija.", "already_played");
    if (status.mode === "offline") throw new HttpError(409, "You saved today's Daily for offline play. Play it from the Daily screen.", "offline_mode");
    const ids = await startDaily(sql, user.userId, date);
    const r = await serveNext(sql, dailyTable(user.userId, date, ids));
    if (r.finished) {
      const e = await sql.one("select correct from daily_entries where daily_date = $1 and user_id = $2", [date, user.userId]);
      await completeDaily(sql, user.userId, e?.correct ?? 0, date);
    }
    return r;
  }),
);

player.post(
  "/daily/answer",
  authed(async ({ req, sql, user }) => {
    const body = parse(challengeAnswerSchema, req.body);
    const date = lagosDate();
    const ids = await ensureDailySet(sql, date);
    const r = await submitAnswer(sql, dailyTable(user.userId, date, ids), body.index, body.optionId);
    let rewards = null;
    if (r.done) rewards = await completeDaily(sql, user.userId, r.totals.correct, date);
    return { ...r.result, rewards };
  }),
);

// Offline Daily: download today's set (locks the day to offline mode), then submit answers when back online.
player.post("/daily/offline", authed(async ({ sql, user }) => startOfflineDaily(sql, user.userId)));

player.post(
  "/daily/offline/submit",
  authed(async ({ req, sql, user }) => {
    const body = parse(offlineDailySubmitSchema, req.body);
    const r = await submitOfflineDaily(sql, user.userId, body.date, body.answers);
    analytics.track(user.userId, "daily_offline_submitted", { correct: r.correct });
    return r;
  }),
);

player.get(
  "/daily/leaderboard",
  authed(async ({ req, sql }) => {
    const state = typeof req.query.state === "string" && req.query.state ? req.query.state : null;
    return { date: lagosDate(), players: await dailyBoard(sql, lagosDate(), state) };
  }),
);

// ── Live events ────────────────────────────────────────────────────────────
player.get(
  "/events/current",
  authed(async ({ sql, user }) => {
    const ev = featuredLiveEvent();
    return { event: ev ? await eventStatus(sql, ev.event.id, user.userId) : null };
  }),
);

player.get("/events/:id", authed(async ({ req, sql, user }) => eventStatus(sql, String(req.params.id), user.userId)));

player.post(
  "/events/:id/next",
  authed(async ({ req, sql, user }) => {
    const id = String(req.params.id);
    const mine = await sql.one("select finished_at from event_entries where event_id = $1 and user_id = $2", [id, user.userId]);
    if (mine?.finished_at) throw new HttpError(409, "You've already played this event.", "already_played");
    requireLive(id);
    const t = await startEvent(sql, user.userId, id);
    const r = await serveNext(sql, t);
    if (r.finished && r.timedOut) {
      const e = await sql.one("select correct from event_entries where event_id = $1 and user_id = $2", [id, user.userId]);
      await completeEvent(sql, user.userId, e?.correct ?? 0);
    }
    return r;
  }),
);

player.post(
  "/events/:id/answer",
  authed(async ({ req, sql, user }) => {
    const body = parse(challengeAnswerSchema, req.body);
    const t = await eventTableFor(sql, user.userId, String(req.params.id));
    const r = await submitAnswer(sql, t, body.index, body.optionId);
    let rewards = null;
    if (r.done) {
      rewards = await completeEvent(sql, user.userId, r.totals.correct);
      analytics.track(user.userId, "event_completed", { event: t.key, score: r.totals.score });
    }
    return { ...r.result, rewards };
  }),
);

// ── Friend challenges ──────────────────────────────────────────────────────
player.post(
  "/challenges",
  authed(async ({ sql, user }) => {
    const code = await createChallenge(sql, user.userId);
    analytics.track(user.userId, "challenge_created");
    return challengeSummary(sql, code, user.userId);
  }),
);

// ── Friends ────────────────────────────────────────────────────────────────
player.get("/friends", authed(async ({ sql, user }) => listFriends(sql, user.userId)));

player.get(
  "/players/search",
  authed(async ({ req, sql, user }) => ({ players: await searchPlayers(sql, user.userId, String(req.query.q ?? "").slice(0, 24)) })),
);

player.get("/friends/:id/status", authed(async ({ req, sql, user }) => ({ status: await friendStatus(sql, user.userId, String(req.params.id)) })));

player.post(
  "/friends/:id",
  authed(async ({ req, sql, user }) => {
    const other = String(req.params.id);
    const r = await requestFriend(sql, user.userId, other);
    if (r.created) void notifyFriendRequest(sql, other, user.userId, false).catch(() => {});
    if (r.accepted) {
      void notifyFriendRequest(sql, other, user.userId, true).catch(() => {});
      await checkAchievements(sql, user.userId);
      await checkAchievements(sql, other);
    }
    if (r.created || r.accepted) analytics.track(user.userId, r.accepted ? "friend_accepted" : "friend_requested");
    return { status: r.status };
  }),
);

player.post(
  "/friends/:id/accept",
  authed(async ({ req, sql, user }) => {
    const other = String(req.params.id);
    await acceptFriend(sql, user.userId, other);
    await checkAchievements(sql, user.userId);
    await checkAchievements(sql, other);
    void notifyFriendRequest(sql, other, user.userId, true).catch(() => {});
    analytics.track(user.userId, "friend_accepted");
    return { status: "friends" };
  }),
);

player.delete(
  "/friends/:id",
  authed(async ({ req, sql, user }) => {
    await removeFriend(sql, user.userId, String(req.params.id));
    return { status: "none" };
  }),
);

/** Challenge one friend directly. Once the sender plays their round, the friend gets a push and a card on Home. */
player.post(
  "/friends/:id/challenge",
  authed(async ({ req, sql, user }) => {
    const other = String(req.params.id);
    if ((await friendStatus(sql, user.userId, other)) !== "friends") throw new HttpError(403, "You can only challenge friends directly.");
    const { stake } = parse(directChallengeSchema, req.body ?? {});
    const code = await createChallenge(sql, user.userId, other, stake);
    analytics.track(user.userId, "challenge_created", { direct: true, stake });
    return challengeSummary(sql, code, user.userId);
  }),
);

// ── Achievements ───────────────────────────────────────────────────────────
player.post(
  "/achievements/:slug/claim",
  authed(async ({ req, sql, user }) => {
    const r = await claimAchievement(sql, user.userId, String(req.params.slug));
    if (!r) throw new HttpError(409, "Nothing to claim for this achievement.");
    return r;
  }),
);

player.get("/challenges/:code", open(async ({ req, sql, user }) => challengeSummary(sql, String(req.params.code), user?.userId ?? null)));

player.get(
  "/me/challenges",
  authed(async ({ sql, user }) => {
    await settleDueStakes(sql, user.userId);
    const rows = await sql.query(
      `select distinct c.code, c.created_at from challenges c left join challenge_entries e on e.challenge_id = c.id
        where c.created_by = $1 or e.user_id = $1 order by c.created_at desc limit 10`,
      [user.userId],
    );
    return { challenges: await Promise.all(rows.map((r) => challengeSummary(sql, r.code, user.userId))) };
  }),
);

player.post(
  "/challenges/:code/next",
  authed(async ({ req, sql, user }) => {
    const c = await startChallenge(sql, String(req.params.code), user.userId);
    return serveNext(sql, challengeTable(user.userId, c));
  }),
);

player.post(
  "/challenges/:code/answer",
  authed(async ({ req, sql, user }) => {
    const body = parse(challengeAnswerSchema, req.body);
    const c = await getChallengeRow(sql, String(req.params.code));
    const r = await submitAnswer(sql, challengeTable(user.userId, c), body.index, body.optionId);
    if (r.done) {
      const outcome = await completeChallenge(sql, c, user.userId, r.totals);
      if (outcome) void notifyChallengeResult(sql, outcome.creatorId, user.userId, c.code).catch(() => {});
      // A direct challenge reaches the friend once the sender has a score on the board.
      if (user.userId === c.created_by && c.target_id) void notifyDirectChallenge(sql, c.target_id, user.userId, c.code).catch(() => {});
    }
    return r.result;
  }),
);

// ── Leagues & State Wars ───────────────────────────────────────────────────
player.get(
  "/leagues",
  authed(async ({ sql, user }) => {
    const p = await getProfileRow(sql, user.userId);
    if (!p) throw new HttpError(404, "Profile not found");
    const season = await currentSeason(sql);
    const next = nextLeague(p.rating);
    const res: LeaguesResponse = {
      rating: p.rating,
      league: leagueForRating(p.rating).id,
      progress: leagueProgress(p.rating),
      nextLeague: next?.id ?? null,
      pointsToNext: next ? next.min - p.rating : null,
      season: { number: season.number, startsAt: season.startsAt.toISOString(), endsAt: season.endsAt.toISOString() },
      rankedGames: p.ranked_games,
      record: { wins: p.wins, losses: p.losses, draws: p.draws },
    };
    return res;
  }),
);

player.get(
  "/state-wars",
  authed(async ({ sql, user }) => {
    const p = await getProfileRow(sql, user.userId);
    return stateWars(sql, p?.state_code ?? null, undefined, user.userId);
  }),
);

player.get("/state-wars/:code", authed(async ({ req, sql }) => stateTopPlayers(sql, String(req.params.code).toUpperCase())));

// ── Profile stats ──────────────────────────────────────────────────────────
function badgeTier(s: CategoryStat): "bronze" | "silver" | "gold" | null {
  if (s.answered >= 100 && s.accuracy >= 0.8) return "gold";
  if (s.answered >= 50 && s.accuracy >= 0.7) return "silver";
  if (s.answered >= 20 && s.accuracy >= 0.6) return "bronze";
  return null;
}

player.get(
  "/profile/:id/stats",
  authed(async ({ req, sql, user }) => {
    const id = req.params.id === "me" ? user.userId : String(req.params.id);
    const p = await getProfileRow(sql, id);
    if (!p) throw new HttpError(404, "Player not found");
    const cats = await sql.query("select slug, answered::int, correct::int, accuracy::float from user_category_stats($1)", [id]);
    const active = new Set((await sql.query("select slug from categories where active")).map((r) => r.slug));
    const categories: CategoryStat[] = cats.filter((c) => active.has(c.slug)).map((c) => ({ slug: c.slug as CategorySlug, answered: c.answered, correct: c.correct, accuracy: c.accuracy }));
    const hist = await sql.query(
      `select m.id, m.type, m.is_bot, m.bot_name, m.player_a, m.player_b, m.winner, m.score_a, m.score_b, m.rating_delta_a, m.rating_delta_b, m.created_at,
              o.username as opp_username, o.avatar_id as opp_avatar, o.state_code as opp_state
         from matches m
         left join profiles o on o.id = case when m.player_a = $1 then m.player_b else m.player_a end
        where m.player_a = $1 or m.player_b = $1
        order by m.created_at desc limit 20`,
      [id],
    );
    const history: MatchHistoryItem[] = hist.map((m) => {
      const mine = m.player_a === id;
      return {
        id: m.id,
        type: m.type,
        isBot: m.is_bot,
        result: m.winner === null ? "draw" : m.winner === id ? "win" : "loss",
        myScore: mine ? m.score_a : m.score_b,
        oppScore: mine ? m.score_b : m.score_a,
        ratingDelta: mine ? m.rating_delta_a : m.rating_delta_b,
        opponent: m.is_bot ? { username: m.bot_name ?? "Practice opponent", avatarId: "musa", stateCode: "LA" } : m.opp_username ? { username: m.opp_username, avatarId: m.opp_avatar, stateCode: m.opp_state ?? "DI" } : null,
        createdAt: new Date(m.created_at).toISOString(),
      };
    });
    const matches = p.wins + p.losses + p.draws;
    const res: ProfileStatsResponse = {
      profile: toPublic(p),
      matches,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      winRate: matches ? p.wins / matches : 0,
      categories,
      badges: categories.map((c) => ({ slug: c.slug, tier: badgeTier(c) })).filter((b): b is { slug: CategorySlug; tier: "bronze" | "silver" | "gold" } => !!b.tier),
      history,
      seasons: await seasonHistory(sql, id),
      achievements: await listAchievements(sql, id),
    };
    return res;
  }),
);

// ── Shop & ads ─────────────────────────────────────────────────────────────
player.get("/shop", authed(async ({ sql, user }) => shopCatalog(sql, user.userId)));
player.post("/shop/purchase", authed(async ({ req, sql, user }) => purchaseProduct(sql, user.userId, req.body)));
player.post("/shop/buy-item", authed(async ({ req, sql, user }) => buyItem(sql, user.userId, req.body)));

player.get(
  "/ads/interstitial",
  authed(async ({ sql, user }) => {
    const p = await getProfileRow(sql, user.userId);
    const show = !!p && !isPremium(p) && p.matches_since_ad >= INTERSTITIAL_EVERY_N_MATCHES;
    return { show };
  }),
);

player.post(
  "/ads/interstitial/shown",
  authed(async ({ sql, user }) => {
    await sql.query("update profiles set matches_since_ad = 0 where id = $1", [user.userId]);
    return { ok: true };
  }),
);

const REWARDED_COINS = 25;
const REWARDED_PER_DAY = 5;

player.post(
  "/ads/rewarded",
  authed(async ({ req, sql, user }) => {
    const reason = parse(z.object({ reason: z.string().max(40) }), req.body).reason;
    const today = await sql.one<{ n: number }>(
      "select count(*)::int as n from purchases where user_id = $1 and product_id = 'ad_reward' and created_at > now() - interval '24 hours'",
      [user.userId],
    );
    if ((today?.n ?? 0) >= REWARDED_PER_DAY) throw new HttpError(429, "You've watched the max ads for today. Try again tomorrow.");
    return sql.tx(async (tx) => {
      await tx.query("insert into purchases (user_id, product_id, platform, amount_naira, provider, receipt) values ($1, 'ad_reward', 'any', 0, 'mock_ads', $2)", [user.userId, reason]);
      const r = await tx.one<{ coins: number }>("update profiles set coins = coins + $2 where id = $1 returning coins", [user.userId, REWARDED_COINS]);
      return { coins: r!.coins, amount: REWARDED_COINS };
    });
  }),
);

// ── Reports ────────────────────────────────────────────────────────────────
player.post(
  "/reports",
  authed(async ({ req, sql, user }) => {
    const body = parse(reportSchema, req.body);
    return sql.tx(async (tx) => {
      const inserted = await tx.one(
        "insert into question_reports (question_id, user_id, reason, note, match_id) values ($1, $2, $3, $4, $5) on conflict (question_id, user_id) do nothing returning id",
        [body.questionId, user.userId, body.reason, body.note ?? null, body.matchId ?? null],
      );
      if (!inserted) return { ok: true, duplicate: true };
      const q = await tx.one<{ report_count: number; status: string }>(
        "update questions set report_count = report_count + 1 where id = $1 returning report_count, status",
        [body.questionId],
      );
      if (q && q.report_count >= AUTO_PAUSE_REPORT_COUNT && q.status === "live") {
        await tx.query("update questions set status = 'paused', updated_at = now() where id = $1", [body.questionId]);
      }
      return { ok: true, duplicate: false };
    });
  }),
);

// Public summary of a finished match (share landing page).
player.get(
  "/matches/:id/public",
  open(async ({ req, sql }) => {
    const m = await sql.one(
      `select m.id, m.type, m.is_bot, m.bot_name, m.bot_rating, m.winner, m.score_a, m.score_b, m.categories, m.created_at, m.player_a, m.player_b
         from matches m where m.id = $1`,
      [String(req.params.id)],
    );
    if (!m) throw new HttpError(404, "Match not found");
    const profiles = await getPublicProfilesFor(sql, [m.player_a, m.player_b].filter(Boolean));
    return {
      id: m.id,
      type: m.type,
      isBot: m.is_bot,
      a: profiles.get(m.player_a) ?? null,
      b: m.is_bot ? { username: m.bot_name ?? "Practice opponent", avatarId: "musa", stateCode: "LA", rating: m.bot_rating ?? 1000 } : (profiles.get(m.player_b) ?? null),
      scoreA: m.score_a,
      scoreB: m.score_b,
      winner: m.winner === m.player_a ? "a" : m.winner ? "b" : null,
      categories: m.categories,
      createdAt: new Date(m.created_at).toISOString(),
    };
  }),
);

// Catalog constants (public, cacheable)
player.get("/catalog", open(async () => ({ categories: CATEGORIES, powerUps: POWER_UPS, cosmetics: COSMETICS, products: PRODUCTS })));
