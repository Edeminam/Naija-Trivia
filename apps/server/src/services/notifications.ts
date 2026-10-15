import { lagosDate, lagosWeekStart, themeFor, stateByCode, featuredLiveEvent, liveEventById, LAGOS_OFFSET_MS } from "@ntc/shared";
import type { Sql } from "../db";
import { env } from "../env";
import { errors } from "./errors";
import { currentSeason } from "../repo/seasons";
import { settleStateWeek, detectOvertakes } from "../repo/leaderboards";
import { settleEndedEvents } from "../repo/events";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Expo push API (works for both iOS and Android tokens issued by expo-notifications). */
async function sendExpoPush(messages: PushMessage[]) {
  if (!messages.length) return;
  if (env.isTest) return;
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(env.expoAccessToken ? { authorization: `Bearer ${env.expoAccessToken}` } : {}),
    },
    body: JSON.stringify(messages.map((m) => ({ ...m, sound: "default" }))),
  });
  if (!res.ok) errors.capture(new Error(`expo push failed ${res.status}`));
}

/** At most one marketing notification per user per Lagos day. */
async function canSendMarketing(sql: Sql, userId: string) {
  const r = await sql.one(
    "select 1 from notification_log where user_id = $1 and marketing and sent_at > (($2::date - interval '1 hour') at time zone 'UTC')",
    [userId, lagosDate()],
  );
  return !r;
}

async function log(sql: Sql, userId: string, kind: string, marketing: boolean) {
  await sql.query("insert into notification_log (user_id, kind, marketing) values ($1, $2, $3)", [userId, kind, marketing]);
}

export async function notifyChallengeResult(sql: Sql, creatorId: string, playerId: string, code: string) {
  const c = await sql.one("select push_token, settings from profiles where id = $1", [creatorId]);
  const p = await sql.one("select username from profiles where id = $1", [playerId]);
  if (!c?.push_token || c.settings?.notifications === false) return;
  await sendExpoPush([{ to: c.push_token, title: "Challenge answered! ⚔️", body: `${p?.username ?? "Your friend"} just played your challenge. See who won.`, data: { url: `/c/${code}` } }]);
  await log(sql, creatorId, "challenge_result", false);
}

/** Push to one player if they have a token and notifications on (transactional, not marketing). */
async function pushTo(sql: Sql, userId: string, kind: string, title: string, body: string, url: string) {
  const u = await sql.one("select push_token, settings from profiles where id = $1", [userId]);
  if (!u?.push_token || u.settings?.notifications === false) return;
  await sendExpoPush([{ to: u.push_token, title, body, data: { url } }]);
  await log(sql, userId, kind, false);
}

const nameOf = async (sql: Sql, id: string) => (await sql.one<{ username: string }>("select username from profiles where id = $1", [id]))?.username ?? "A player";

export async function notifyFriendRequest(sql: Sql, toId: string, fromId: string, accepted: boolean) {
  const from = await nameOf(sql, fromId);
  if (accepted) await pushTo(sql, toId, "friend_accepted", "New friend 🤝", `${from} accepted your friend request. Time for a clash!`, "/friends");
  else await pushTo(sql, toId, "friend_request", "Friend request 👋", `${from} wants to be friends on Naija Trivia Clash.`, "/friends");
}

export async function notifyDirectChallenge(sql: Sql, toId: string, fromId: string, code: string) {
  const from = await nameOf(sql, fromId);
  await pushTo(sql, toId, "direct_challenge", "You've been challenged ⚔️", `${from} sent you 7 questions. Beat their score within 48 hours.`, `/c/${code}`);
}

/** Players who scored for a state this week or last (the people who care when it slips). */
async function stateFans(sql: Sql, code: string) {
  return sql.query<{ id: string; push_token: string }>(
    `select distinct p.id, p.push_token from state_weekly_points w join profiles p on p.id = w.user_id
      where w.state_code = $1 and w.week_start >= $2::date - 7 and p.push_token is not null
        and coalesce((p.settings->>'notifications')::boolean, false)
      limit 500`,
    [code, lagosWeekStart()],
  );
}

/** Weekly State Wars settlement + push to everyone who won coins. */
async function settleAndAnnounce(sql: Sql) {
  const settled = await settleStateWeek(sql);
  if (!settled) return;
  const msgs: PushMessage[] = [];
  for (const [userId, prize] of settled.paid) {
    const u = await sql.one("select push_token, settings from profiles where id = $1", [userId]);
    if (!u?.push_token || u.settings?.notifications === false) continue;
    const state = stateByCode(prize.stateCode)?.name ?? prize.stateCode;
    const place = ["won", "came 2nd in", "came 3rd in"][prize.rank - 1];
    msgs.push({ to: u.push_token, title: `${state} ${place} State Wars! 🏆`, body: `Thanks for helping! +${prize.coins} coins are in your wallet.`, data: { url: "/state-wars" } });
    await log(sql, userId, `state_prize_${settled.weekStart}`, false);
  }
  await sendExpoPush(msgs);
}

/** "Rivers just overtook Lagos" — at most once per player per day, and inside the marketing cap. */
async function announceOvertakes(sql: Sql, today: string) {
  const overtakes = await detectOvertakes(sql);
  for (const o of overtakes) {
    const victim = stateByCode(o.victim)?.name ?? o.victim;
    const by = stateByCode(o.by)?.name ?? o.by;
    const msgs: PushMessage[] = [];
    for (const u of await stateFans(sql, o.victim)) {
      const kind = `state_overtaken_${today}`;
      if (await sql.one("select 1 from notification_log where user_id = $1 and kind = $2", [u.id, kind])) continue;
      if (!(await canSendMarketing(sql, u.id))) continue;
      msgs.push({ to: u.push_token, title: `${by} just overtook ${victim} 😤`, body: `${victim} slipped to #${o.rank} in State Wars. Win a ranked clash to climb back.`, data: { url: "/state-wars" } });
      await log(sql, u.id, kind, true);
    }
    await sendExpoPush(msgs);
  }
}

/** Morning push on the first day of a special themed week. */
async function announceTheme(sql: Sql, today: string) {
  const theme = themeFor(today);
  if (!theme.special || theme.startsOn !== today) return;
  const kind = `theme_${theme.id}_${today}`;
  const due = await sql.query<{ id: string; push_token: string }>(
    `select p.id, p.push_token from profiles p
      where p.push_token is not null and coalesce((p.settings->>'notifications')::boolean, false)
        and not exists (select 1 from notification_log n where n.user_id = p.id and n.kind = $1)
      limit 500`,
    [kind],
  );
  const msgs: PushMessage[] = [];
  for (const u of due) {
    if (!(await canSendMarketing(sql, u.id))) continue;
    msgs.push({ to: u.push_token, title: `${theme.name} starts today 🎉`, body: `${theme.tagline} Wins pay 50% more coins all week.`, data: { url: "/home" } });
    await log(sql, u.id, kind, true);
  }
  await sendExpoPush(msgs);
}

/** Push everyone (inside the marketing cap) in the first 10 minutes of a live event. */
async function announceLiveEvent(sql: Sql, now: number) {
  const ev = featuredLiveEvent(now);
  if (!ev?.live || now - ev.start > 10 * 60_000) return;
  const kind = `event_${ev.event.id}`;
  const due = await sql.query<{ id: string; push_token: string }>(
    `select p.id, p.push_token from profiles p
      where p.push_token is not null and coalesce((p.settings->>'notifications')::boolean, false)
        and not exists (select 1 from notification_log n where n.user_id = p.id and n.kind = $1)
      limit 500`,
    [kind],
  );
  const msgs: PushMessage[] = [];
  for (const u of due) {
    if (!(await canSendMarketing(sql, u.id))) continue;
    msgs.push({ to: u.push_token, title: `🔴 ${ev.event.name} is live`, body: `${ev.event.tagline} 10 questions, top 10 win coins. ${ev.event.durationMin} minutes only.`, data: { url: `/event/${ev.event.id}` } });
    await log(sql, u.id, kind, true);
  }
  await sendExpoPush(msgs);
}

/** Pay prizes for events that just ended and tell the winners. */
async function settleEventsAndAnnounce(sql: Sql, now: number) {
  for (const r of await settleEndedEvents(sql, now)) {
    const name = liveEventById(r.eventId)?.name ?? "the live event";
    for (const p of r.paid) {
      await pushTo(sql, p.userId, `event_prize_${r.eventId}`, `You finished #${p.rank} in ${name} 🏆`, `+${p.coins} coins are in your wallet.`, `/event/${r.eventId}`);
    }
  }
}

/** Runs every minute: daily reminder, season heads-up, State Wars settlement/overtakes, themed-week kickoff. */
export async function runNotificationTick(sql: Sql, now = Date.now()) {
  const lagosHour = new Date(now + LAGOS_OFFSET_MS).getUTCHours();
  const lagosMinute = new Date(now + LAGOS_OFFSET_MS).getUTCMinutes();
  const today = lagosDate(now);
  await settleAndAnnounce(sql);
  await settleEventsAndAnnounce(sql, now);
  await announceLiveEvent(sql, now);
  if (lagosMinute % 10 === 0 && lagosHour >= 8 && lagosHour < 22) await announceOvertakes(sql, today);
  if (lagosHour === 10) await announceTheme(sql, today);
  if (lagosHour === 19) {
    const due = await sql.query(
      `select p.id, p.push_token from profiles p
        where p.push_token is not null and coalesce((p.settings->>'notifications')::boolean, false)
          and not exists (select 1 from daily_entries d where d.user_id = p.id and d.daily_date = $1 and d.finished_at is not null)
          and not exists (select 1 from notification_log n where n.user_id = p.id and n.kind = 'daily_reminder' and n.sent_at > now() - interval '20 hours')
        limit 500`,
      [today],
    );
    const msgs: PushMessage[] = [];
    for (const u of due) {
      if (!(await canSendMarketing(sql, u.id))) continue;
      msgs.push({ to: u.push_token, title: "Daily Naija dey wait you 🔥", body: "10 questions, one shot. Keep your streak alive before midnight.", data: { url: "/daily" } });
      await log(sql, u.id, "daily_reminder", true);
    }
    await sendExpoPush(msgs);
  }
  const season = await currentSeason(sql, now);
  const msLeft = season.endsAt.getTime() - now;
  if (msLeft > 0 && msLeft <= 24 * 3_600_000) {
    const due = await sql.query(
      `select p.id, p.push_token from profiles p
        where p.push_token is not null and p.ranked_games > 0 and coalesce((p.settings->>'notifications')::boolean, false)
          and not exists (select 1 from notification_log n where n.user_id = p.id and n.kind = $1)
        limit 500`,
      [`season_end_${season.number}`],
    );
    const msgs: PushMessage[] = [];
    for (const u of due) {
      if (!(await canSendMarketing(sql, u.id))) continue;
      msgs.push({ to: u.push_token, title: "Season ends in 24 hours ⏳", body: "Last chance to climb a league and bag bigger rewards.", data: { url: "/leagues" } });
      await log(sql, u.id, `season_end_${season.number}`, true);
    }
    await sendExpoPush(msgs);
  }
}
