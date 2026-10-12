import {
  decideWinner,
  ratingDelta,
  resultFor,
  scoreValue,
  coinsFor,
  xpFor,
  statePointsForWin,
  leagueForRating,
  lagosDate,
  lagosWeekStart,
  SUSPICIOUS_ANSWER_MS,
  SUSPICIOUS_DAILY_THRESHOLD,
  FIRST_WIN_BONUS,
  themeFor,
  themedWinCoins,
  type PlayerMatchResult,
  type MatchMode,
  type MatchBonus,
} from "@ntc/shared";
import type { Sql } from "../db";
import { applyXp } from "./profiles";
import { bumpMissions } from "./missions";
import { recordQuestionStats } from "./questions";
import { checkAchievements } from "./achievements";

export interface AnswerRecord {
  round: number;
  questionId: string;
  categoryId: string;
  optionIndex: number | null;
  correct: boolean;
  points: number;
  ms: number;
}

export interface MatchPlayerInput {
  id: string;
  isBot: boolean;
  isGuest: boolean;
  rating: number;
  score: number;
  totalMs: number;
  shieldConsumed: boolean;
  answers: AnswerRecord[];
}

export interface PersistInput {
  mode: MatchMode;
  categories: string[];
  a: MatchPlayerInput;
  b: MatchPlayerInput;
  botName?: string;
}

export interface PersistOutput {
  matchId: string;
  winnerId: string | null;
  players: Record<string, PlayerMatchResult>;
}

/** Bots give half state points so practice can't be farmed for State Wars. */
const BOT_STATE_POINT_FACTOR = 0.5;

export async function persistMatchResult(sql: Sql, input: PersistInput): Promise<PersistOutput> {
  const outcome = decideWinner(input.a, input.b);
  const winnerId = outcome === "draw" ? null : outcome === "a" ? input.a.id : input.b.id;
  const vsBot = input.a.isBot || input.b.isBot;
  const humans = [input.a, input.b].filter((p) => !p.isBot).sort((x, y) => (x.id < y.id ? -1 : 1));

  return sql.tx(async (tx) => {
    // Lock both profiles (in id order to avoid deadlocks) and read fresh values.
    const fresh = new Map<string, any>();
    for (const h of humans) {
      const row = await tx.one(
        "select id, rating, ranked_games, xp, level, coins, state_code, is_guest, first_win_date::text as first_win_date from profiles where id = $1 for update",
        [h.id],
      );
      if (row) fresh.set(h.id, row);
    }

    const ratingOf = (p: MatchPlayerInput) => (p.isBot ? p.rating : (fresh.get(p.id)?.rating ?? p.rating));
    const today = lagosDate();
    const theme = themeFor(today);
    const players: Record<string, PlayerMatchResult> = {};
    const deltas: Record<string, number> = {};

    for (const [me, opp, side] of [
      [input.a, input.b, "a"],
      [input.b, input.a, "b"],
    ] as const) {
      const result = resultFor(outcome, side);
      if (me.isBot) {
        deltas[me.id] = 0;
        continue;
      }
      const row = fresh.get(me.id);
      const ranked = input.mode === "ranked" && !row?.is_guest;
      const before = ratingOf(me);
      const delta = ranked
        ? ratingDelta({
            rating: before,
            opponentRating: ratingOf(opp),
            score: scoreValue(result),
            rankedGames: row?.ranked_games ?? 0,
            vsBot,
            shieldConsumed: me.shieldConsumed,
          })
        : 0;
      const after = Math.max(0, before + delta);
      deltas[me.id] = delta;
      const correct = me.answers.filter((a) => a.correct).length;
      const xpGain = xpFor(result, correct);
      const lvl = applyXp(row?.xp ?? 0, xpGain);
      let statePoints = 0;
      if (ranked && result === "win") {
        statePoints = statePointsForWin(ratingOf(opp));
        if (vsBot) statePoints = Math.max(1, Math.round(statePoints * BOT_STATE_POINT_FACTOR));
      }
      const bonuses: MatchBonus[] = [];
      if (result === "win" && !row?.is_guest) {
        if (theme.special) bonuses.push({ kind: "theme", label: `${theme.name} bonus`, coins: themedWinCoins(theme) - coinsFor(result) });
        if (row?.first_win_date !== today) bonuses.push({ kind: "first_win", label: "First win of the day", coins: FIRST_WIN_BONUS });
      }
      players[me.id] = {
        playerId: me.id,
        result,
        score: me.score,
        correct,
        ratingBefore: before,
        ratingAfter: after,
        ratingDelta: after - before,
        coins: coinsFor(result) + bonuses.reduce((n, b) => n + b.coins, 0),
        bonuses,
        achievements: [],
        xp: xpGain,
        statePoints,
        levelBefore: lvl.before,
        levelAfter: lvl.after,
        leagueBefore: leagueForRating(before).id,
        leagueAfter: leagueForRating(after).id,
        shieldSaved: ranked && result === "loss" && me.shieldConsumed,
      };
    }

    const match = await tx.one<{ id: string }>(
      `insert into matches (type, player_a, player_b, is_bot, bot_name, bot_rating, winner, score_a, score_b, rating_delta_a, rating_delta_b, categories,
                            season_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text[], (select id from seasons where now() between starts_at and ends_at order by number desc limit 1))
       returning id`,
      [
        vsBot ? "bot" : "ranked",
        input.a.isBot ? input.b.id : input.a.id,
        input.a.isBot ? null : input.b.isBot ? null : input.b.id,
        vsBot,
        vsBot ? (input.botName ?? "Practice opponent") : null,
        vsBot ? (input.a.isBot ? input.a.rating : input.b.rating) : null,
        winnerId,
        input.a.isBot ? input.b.score : input.a.score,
        input.a.isBot ? input.a.score : input.b.score,
        input.a.isBot ? (deltas[input.b.id] ?? 0) : (deltas[input.a.id] ?? 0),
        input.a.isBot ? 0 : (deltas[input.b.id] ?? 0),
        `{${input.categories.join(",")}}`,
      ],
    );
    const matchId = match!.id;
    const week = lagosWeekStart();

    for (const h of humans) {
      const r = players[h.id]!;
      const row = fresh.get(h.id);
      const ranked = input.mode === "ranked" && !row?.is_guest;
      const result = r.result;
      await tx.query(
        `update profiles set
            rating = $2, league = $3,
            ranked_games = ranked_games + $4::int,
            wins = wins + $5::int, losses = losses + $6::int, draws = draws + $7::int,
            coins = coins + $8, xp = xp + $9, level = $10,
            peak_rating = greatest(peak_rating, $2),
            first_win_date = case when $11::boolean then $12::date else first_win_date end,
            matches_since_ad = matches_since_ad + 1,
            guest_match_used = guest_match_used or is_guest,
            updated_at = now()
          where id = $1`,
        [
          h.id,
          r.ratingAfter,
          r.leagueAfter,
          ranked ? 1 : 0,
          result === "win" ? 1 : 0,
          result === "loss" ? 1 : 0,
          result === "draw" ? 1 : 0,
          r.coins,
          r.xp,
          r.levelAfter,
          r.bonuses.some((b) => b.kind === "first_win"),
          today,
        ],
      );

      for (const a of h.answers) {
        await tx.query(
          `insert into match_answers (match_id, mode, user_id, question_id, category_id, round, option_index, correct, points, ms)
           values ($1, 'match', $2, $3, $4, $5, $6, $7, $8, $9)`,
          [matchId, h.id, a.questionId, a.categoryId, a.round, a.optionIndex, a.correct, a.points, Math.round(a.ms)],
        );
        await recordQuestionStats(tx, a.questionId, a.optionIndex, a.correct, a.ms);
      }

      if (r.statePoints > 0 && row?.state_code) {
        await tx.query(
          `insert into state_weekly_points (week_start, state_code, user_id, points, wins) values ($1, $2, $3, $4, 1)
           on conflict (week_start, state_code, user_id) do update set points = state_weekly_points.points + excluded.points,
             wins = state_weekly_points.wins + 1, updated_at = now()`,
          [week, row.state_code, h.id, r.statePoints],
        );
      }

      await bumpMissions(
        tx,
        h.id,
        {
          matches_played: 1,
          matches_won: result === "win" ? 1 : 0,
          correct_answers: r.correct,
          fast_answers: h.answers.filter((a) => a.correct && a.ms < 3000).length,
        },
        today,
      );

      await flagIfSuspicious(tx, h.id, today);
      if (!row?.is_guest) r.achievements = await checkAchievements(tx, h.id);
    }

    return { matchId, winnerId, players };
  });
}

/** ≥ 10 correct answers under 400ms in a (Lagos) day → open an anti-cheat flag for admin review. */
export async function flagIfSuspicious(sql: Sql, userId: string, day = lagosDate()) {
  const r = await sql.one<{ n: number }>(
    `select count(*)::int as n from match_answers
      where user_id = $1 and correct and ms < $2
        and created_at >= (($3::date - interval '1 hour') at time zone 'UTC')
        and created_at < (($3::date + interval '23 hours') at time zone 'UTC')`,
    [userId, SUSPICIOUS_ANSWER_MS, day],
  );
  if (r && r.n >= SUSPICIOUS_DAILY_THRESHOLD) {
    await sql.query(
      `insert into anticheat_flags (user_id, flag_date, fast_correct) values ($1, $2, $3)
       on conflict (user_id, flag_date) do update set fast_correct = excluded.fast_correct`,
      [userId, day, r.n],
    );
  }
}
