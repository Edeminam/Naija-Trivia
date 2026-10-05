import { lagosDate, LAGOS_OFFSET_MS } from "@ntc/shared";
import type { Sql } from "../db";
import { env } from "../env";
import { errors } from "./errors";
import { currentSeason } from "../repo/seasons";

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

/** Runs every minute: 7pm WAT daily reminder and the 24h season-ending heads-up. */
export async function runNotificationTick(sql: Sql, now = Date.now()) {
  const lagosHour = new Date(now + LAGOS_OFFSET_MS).getUTCHours();
  const today = lagosDate(now);
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
