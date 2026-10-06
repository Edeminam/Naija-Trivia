import { Router } from "express";
import { STATES, AVATARS, lagosWeekStart, lagosDate, addDays, leagueForRating } from "@ntc/shared";
import { open, HttpError } from "./http";
import { env } from "../env";
import { ensureDailySet } from "../repo/daily";

/** Dev-only helpers (enabled with dev auth). */
export const dev = Router();

const FIRST = ["Ada", "Tunde", "Ngozi", "Musa", "Bisi", "Emeka", "Halima", "Tamuno", "Efe", "Kunle", "Amaka", "Sadiq", "Yemi", "Chidi", "Zainab", "Ebi", "Ife", "Uche", "Aisha", "Seun", "Ikenna", "Fatima", "Tobi", "Obinna"];
const TAIL = ["_lagos", "_9ja", "baba", "_sharp", "_odogwu", "_wizzy", "x", "_ng", "_quiz", "_eko", "_abj", "_ph"];

dev.post(
  "/dev/demo-data",
  open(async ({ sql }) => {
    if (!env.allowDevAuth) throw new HttpError(404, "Not available");
    const week = lagosWeekStart();
    const lastWeek = addDays(week, -7);
    const today = lagosDate();
    const ids = await ensureDailySet(sql, today);
    const weights: Record<string, number> = { LA: 9, FC: 7, RI: 6, OY: 5, KN: 5, EN: 4, AN: 4, KD: 4, ED: 3, DE: 3, OG: 3, PL: 2, DI: 4 };
    let n = 0;
    for (let i = 0; i < 90; i++) {
      const pool = STATES.flatMap((s) => Array(weights[s.code] ?? 1).fill(s.code));
      const state = pool[Math.floor(Math.random() * pool.length)]!;
      const name = `${FIRST[i % FIRST.length]}${TAIL[Math.floor(Math.random() * TAIL.length)]}${i}`.slice(0, 16);
      const exists = await sql.one("select 1 from profiles where lower(username) = lower($1)", [name]);
      if (exists) continue;
      const u = await sql.one<{ id: string }>("insert into auth.users (is_anonymous) values (false) returning id");
      const rating = Math.round(850 + Math.random() * 1500);
      const wins = Math.floor(Math.random() * 40);
      await sql.query(
        `insert into profiles (id, username, avatar_id, state_code, rating, league, xp, coins, ranked_games, wins, losses, draws)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0)
         on conflict (id) do update set username = excluded.username, avatar_id = excluded.avatar_id, state_code = excluded.state_code, rating = excluded.rating,
           league = excluded.league, xp = excluded.xp, ranked_games = excluded.ranked_games, wins = excluded.wins, losses = excluded.losses`,
        [u!.id, name, AVATARS[i % AVATARS.length]!.id, state, rating, leagueForRating(rating).id, Math.floor(Math.random() * 6000), 300, wins * 2, wins, wins],
      );
      const pts = Math.floor(5 + Math.random() * 140);
      await sql.query("insert into state_weekly_points (week_start, state_code, user_id, points, wins) values ($1, $2, $3, $4, $5) on conflict do nothing", [week, state, u!.id, pts, Math.ceil(pts / 8)]);
      if (Math.random() < 0.8) {
        await sql.query("insert into state_weekly_points (week_start, state_code, user_id, points, wins) values ($1, $2, $3, $4, $5) on conflict do nothing", [lastWeek, state, u!.id, Math.floor(Math.random() * 150), 3]);
      }
      if (Math.random() < 0.6) {
        const correct = Math.floor(3 + Math.random() * 8);
        await sql.query(
          "insert into daily_entries (daily_date, user_id, state_code, current_index, score, correct, total_ms, finished_at) values ($1, $2, $3, $4, $5, $6, $7, now()) on conflict do nothing",
          [today, u!.id, state, ids.length, correct * 150 + Math.floor(Math.random() * 300), correct, 20000 + Math.floor(Math.random() * 50000)],
        );
      }
      n++;
    }
    return { created: n };
  }),
);
