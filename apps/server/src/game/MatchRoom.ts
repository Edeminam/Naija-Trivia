import { Room, matchMaker, type Client, CloseCode } from "@colyseus/core";
import { schema, t, MapSchema, ArraySchema, type SchemaType } from "@colyseus/schema";
import {
  QUESTIONS_PER_MATCH,
  QUESTION_MS,
  EXTRA_TIME_MS,
  ANSWER_GRACE_MS,
  REVEAL_MS,
  BAN_MS,
  BAN_OPTION_COUNT,
  RECONNECT_WINDOW_MS,
  POWER_UPS,
  STARTING_RATING,
  lagosDate,
  leagueForRating,
  pointsForAnswer,
  isAnswerAccepted,
  isDoubleWahala,
  selectQuestions,
  themeFor,
  answerMessageSchema,
  banMessageSchema,
  powerUpKindSchema,
  type MatchMode,
  type QuestionMsg,
  type RevealMsg,
  type ResultMsg,
  type RoundSummary,
  type PowerUpKind,
  type PowerUpMsg,
  type CategorySlug,
  type QuestionLocale,
} from "@ntc/shared";
import { getDb } from "../db";
import { getProfileRow, toPublic } from "../repo/profiles";
import { activeCategories, questionPool, recentlySeen, markSeen, getQuestions, localize, shuffleRandom, crowdDistribution, type FullQuestion, type ShuffledOptions } from "../repo/questions";
import { persistMatchResult, type AnswerRecord } from "../repo/matches";
import { makeBot, planBotAnswer, type BotProfile } from "./bot";
import { analytics } from "../services/analytics";
import { errors } from "../services/errors";

// ── Synced state ───────────────────────────────────────────────────────────
export const PlayerState = schema(
  {
    id: t.string(),
    username: t.string(),
    avatarId: t.string(),
    stateCode: t.string(),
    rating: t.number(),
    league: t.string(),
    level: t.number(),
    frameId: t.string(),
    isBot: t.boolean(),
    score: t.number(),
    answered: t.boolean(),
    connected: t.boolean(),
    banned: t.string(),
    powerUpUsed: t.boolean(),
  },
  "PlayerState",
);
export type PlayerState = SchemaType<typeof PlayerState>;

export const BanOptionState = schema({ categoryId: t.string(), slug: t.string(), name: t.string() }, "BanOptionState");

export const MatchState = schema(
  {
    phase: t.string().default("waiting"),
    mode: t.string().default("ranked"),
    round: t.number().default(0),
    total: t.number().default(QUESTIONS_PER_MATCH),
    deadline: t.number().default(0),
    isBot: t.boolean().default(false),
    players: t.map(PlayerState),
    banOptions: t.array(BanOptionState),
    categories: t.array("string"),
  },
  "MatchState",
);
export type MatchState = SchemaType<typeof MatchState>;

export interface MatchRoomOptions {
  mode: MatchMode;
  /** human user ids expected in this room */
  userIds: string[];
  /** add a bot opponent for this user */
  withBot?: boolean;
}

interface Seat {
  userId: string;
  isBot: boolean;
  isGuest: boolean;
  rating: number;
  bot?: BotProfile;
  answers: AnswerRecord[];
  totalMs: number;
  deadlineAt: number;
  shieldArmed: boolean;
  shieldConsumed: boolean;
  hiddenOptions: string[];
  rematch: boolean;
  left: boolean;
  /** Language this player sees questions in */
  locale: QuestionLocale;
}

interface Pending {
  optionId: string | null;
  receivedAt: number;
}

const JOIN_TIMEOUT_MS = 8_000;
const POST_RESULT_TTL_MS = 60_000;
const ROUND_INTRO_MS = 900;
const DOUBLE_WAHALA_INTRO_MS = 1_800;

export class MatchRoom extends Room<{ state: MatchState }> {
  maxClients = 2;
  autoDispose = false;
  state = new MatchState();

  private mode: MatchMode = "ranked";
  private seats = new Map<string, Seat>();
  private sessionToUser = new Map<string, string>();
  private questions: FullQuestion[] = [];
  private current: { q: FullQuestion; s: ShuffledOptions; startedAt: number } | null = null;
  private pending = new Map<string, Pending>();
  private rounds: RoundSummary[] = [];
  /** Option id → original index for each round, so round summaries can be translated per player */
  private roundIndex = new Map<number, Map<string, number>>();
  /** Translated copies of this match's questions, by locale then question id */
  private localized = new Map<QuestionLocale, Map<string, FullQuestion>>();
  private timers: { clear(): void }[] = [];
  private roundTimer: { clear(): void } | null = null;
  private finished = false;
  private botName?: string;
  /** This week's featured category: never offered for banning, always in the mix. */
  private featured: { id: string; slug: string } | null = null;

  async onCreate(options: MatchRoomOptions) {
    this.mode = options.mode;
    this.state.mode = options.mode;
    await this.setPrivate(true);
    const sql = await getDb();

    for (const userId of options.userIds) {
      const row = await getProfileRow(sql, userId);
      if (!row) throw new Error(`profile ${userId} not found`);
      const p = toPublic(row);
      const seat = this.newSeat(userId, false, !!row.is_guest, row.rating ?? STARTING_RATING);
      seat.locale = row.settings?.questionLanguage === "pcm" ? "pcm" : "en";
      this.seats.set(userId, seat);
      this.state.players.set(
        userId,
        new PlayerState({
          id: userId,
          username: p.username,
          avatarId: p.avatarId,
          stateCode: p.stateCode,
          rating: p.rating,
          league: p.league,
          level: p.level,
          frameId: p.frameId ?? "",
          isBot: false,
          score: 0,
          answered: false,
          connected: false,
          banned: "",
          powerUpUsed: false,
        }),
      );
    }
    if (options.withBot) this.addBot();

    this.onMessage("ban", (client, raw) => this.handleBan(client, raw));
    this.onMessage("answer", (client, raw) => this.handleAnswer(client, raw));
    this.onMessage("powerup", (client, raw) => void this.handlePowerUp(client, raw));
    this.onMessage("rematch", (client) => void this.handleRematch(client));
    this.onMessage("ping", (client) => client.send("pong", { serverNow: Date.now() }));

    // If someone never shows up, the present player gets a practice opponent instead of a dead end.
    this.later(JOIN_TIMEOUT_MS, () => {
      if (this.state.phase !== "waiting") return;
      const joined = [...this.seats.values()].filter((s) => !s.isBot && this.state.players.get(s.userId)?.connected);
      if (!joined.length) return void this.disconnect();
      for (const s of [...this.seats.values()]) {
        if (!s.isBot && !this.state.players.get(s.userId)?.connected) {
          this.seats.delete(s.userId);
          this.state.players.delete(s.userId);
        }
      }
      if (this.seats.size < 2) this.addBot();
      this.startBanning();
    });
  }

  private newSeat(userId: string, isBot: boolean, isGuest: boolean, rating: number, bot?: BotProfile): Seat {
    return { userId, isBot, isGuest, rating, bot, answers: [], totalMs: 0, deadlineAt: 0, shieldArmed: false, shieldConsumed: false, hiddenOptions: [], rematch: false, left: false, locale: "en" };
  }

  private addBot() {
    const human = [...this.seats.values()].find((s) => !s.isBot);
    const bot = makeBot(human?.rating ?? STARTING_RATING);
    this.botName = bot.username;
    this.seats.set(bot.id, this.newSeat(bot.id, true, false, bot.rating, bot));
    this.state.isBot = true;
    this.state.players.set(
      bot.id,
      new PlayerState({
        id: bot.id,
        username: bot.username,
        avatarId: bot.avatarId,
        stateCode: bot.stateCode,
        rating: bot.rating,
        league: leagueForRating(bot.rating).id,
        level: bot.level,
        frameId: "",
        isBot: true,
        score: 0,
        answered: false,
        connected: true,
        banned: "",
        powerUpUsed: false,
      }),
    );
  }

  // ── Auth & connection lifecycle ─────────────────────────────────────────
  onAuth(client: Client, _options: unknown) {
    const auth = client.auth as { userId?: string } | undefined;
    if (!auth?.userId || !this.seats.has(auth.userId)) throw new Error("Not a player in this match");
    return auth;
  }

  onJoin(client: Client) {
    const userId = (client.auth as { userId: string }).userId;
    this.sessionToUser.set(client.sessionId, userId);
    const p = this.state.players.get(userId);
    if (p) p.connected = true;
    client.send("hello", { you: userId, serverNow: Date.now() });
    const humans = [...this.seats.values()].filter((s) => !s.isBot);
    if (this.state.phase === "waiting" && humans.every((s) => this.state.players.get(s.userId)?.connected)) {
      this.later(1_800, () => this.startBanning()); // let the opponent card land first
    } else {
      this.resync(client);
    }
  }

  async onDrop(client: Client) {
    const userId = this.sessionToUser.get(client.sessionId);
    const p = userId ? this.state.players.get(userId) : undefined;
    if (p) p.connected = false;
    if (this.state.phase === "result" && this.finished) return; // nothing left to protect
    try {
      await this.allowReconnection(client, Math.round(RECONNECT_WINDOW_MS / 1000));
    } catch {
      /* window expired → onLeave */
    }
  }

  onReconnect(client: Client) {
    const userId = this.sessionToUser.get(client.sessionId);
    const p = userId ? this.state.players.get(userId) : undefined;
    if (p) p.connected = true;
    this.resync(client);
  }

  onLeave(client: Client) {
    const userId = this.sessionToUser.get(client.sessionId);
    if (!userId) return;
    const p = this.state.players.get(userId);
    if (p) p.connected = false;
    const seat = this.seats.get(userId);
    if (seat) seat.left = true;
    if (this.finished) {
      this.broadcast("rematchStatus", { opponentLeft: true, requested: this.rematchRequested() });
      if ([...this.seats.values()].every((s) => s.isBot || s.left)) this.later(1_000, () => this.disconnect());
    }
  }

  onDispose() {
    for (const t of this.timers) t.clear();
    this.roundTimer?.clear();
  }

  /** Bring a (re)joining client up to date with the current phase. */
  private resync(client: Client) {
    const userId = this.sessionToUser.get(client.sessionId)!;
    if (this.state.phase === "question" && this.current) {
      const seat = this.seats.get(userId)!;
      if (!this.pending.has(userId)) client.send("question", this.questionMsg(seat));
    }
  }

  private later(ms: number, fn: () => void) {
    const d = this.clock.setTimeout(() => {
      try {
        fn();
      } catch (e) {
        errors.capture(e, { room: this.roomId });
      }
    }, ms);
    this.timers.push(d);
    return d;
  }

  // ── Ban phase ───────────────────────────────────────────────────────────
  private async startBanning() {
    if (this.state.phase !== "waiting") return;
    this.state.phase = "banning";
    const sql = await getDb();
    const cats = await activeCategories(sql);
    const theme = themeFor(lagosDate());
    const feat = cats.find((c) => c.slug === theme.category);
    this.featured = feat ? { id: feat.id, slug: feat.slug } : null;
    const bannable = cats.filter((c) => c.id !== feat?.id);
    const picked = [...bannable].sort(() => Math.random() - 0.5).slice(0, Math.min(BAN_OPTION_COUNT, bannable.length));
    this.state.banOptions = new ArraySchema(...picked.map((c) => new BanOptionState({ categoryId: c.id, slug: c.slug, name: c.name })));
    this.state.deadline = Date.now() + BAN_MS;
    this.broadcast("phase", {
      phase: "banning",
      deadlineAt: this.state.deadline,
      serverNow: Date.now(),
      options: picked.map((c) => ({ categoryId: c.id, slug: c.slug, name: c.name })),
    });

    for (const seat of this.seats.values()) {
      if (!seat.isBot) continue;
      this.later(1_000 + Math.random() * 2_000, () => this.applyBan(seat.userId, this.randomBanOption()));
    }
    this.later(BAN_MS + ANSWER_GRACE_MS, () => this.finishBanning());
  }

  private randomBanOption() {
    const opts = this.state.banOptions.toArray();
    return opts[Math.floor(Math.random() * opts.length)]?.categoryId ?? "";
  }

  private handleBan(client: Client, raw: unknown) {
    const parsed = banMessageSchema.safeParse(raw);
    if (!parsed.success || this.state.phase !== "banning") return;
    const userId = this.sessionToUser.get(client.sessionId)!;
    if (!isAnswerAccepted(Date.now(), this.state.deadline)) return;
    this.applyBan(userId, parsed.data.categoryId);
  }

  private applyBan(userId: string, categoryId: string) {
    const p = this.state.players.get(userId);
    if (!p || p.banned || this.state.phase !== "banning") return;
    if (!this.state.banOptions.toArray().some((o) => o.categoryId === categoryId)) return;
    p.banned = categoryId;
    if ([...this.state.players.values()].every((pl) => pl.banned)) this.later(700, () => this.finishBanning());
  }

  private async finishBanning() {
    if (this.state.phase !== "banning") return;
    this.state.phase = "loading";
    for (const p of this.state.players.values()) if (!p.banned) p.banned = this.randomBanOption();
    const banned = new Set([...this.state.players.values()].map((p) => p.banned));
    const remaining: { categoryId: string; slug: string }[] = this.state.banOptions.toArray().filter((o) => !banned.has(o.categoryId));
    if (this.featured) remaining.unshift({ categoryId: this.featured.id, slug: this.featured.slug });
    this.state.categories = new ArraySchema(...remaining.map((o) => o.slug));

    const sql = await getDb();
    const humans = [...this.seats.values()].filter((s) => !s.isBot);
    const ratings = [...this.seats.values()].map((s) => s.rating);
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const pool = await questionPool(sql, remaining.map((o) => o.categoryId));
    const seen = await recentlySeen(sql, humans.map((h) => h.userId));
    const picks = selectQuestions(pool, { categories: remaining.map((o) => o.categoryId), avgRating: avg, recentlySeen: seen });
    this.questions = await getQuestions(sql, picks.map((p) => p.id));
    for (const locale of new Set(humans.map((h) => h.locale).filter((l) => l !== "en"))) {
      this.localized.set(locale, new Map((await localize(sql, this.questions, locale)).map((q) => [q.id, q])));
    }
    for (const h of humans) await markSeen(sql, h.userId, this.questions.map((q) => q.id));
    this.state.total = this.questions.length;
    this.broadcast("phase", { phase: "ready", categories: remaining.map((o) => o.slug), serverNow: Date.now() });
    this.later(1_200, () => this.startRound(1));
  }

  // ── Question rounds ─────────────────────────────────────────────────────
  private startRound(round: number) {
    const q = this.questions[round - 1];
    if (!q) return void this.finish();
    this.state.round = round;
    for (const p of this.state.players.values()) p.answered = false;
    if (isDoubleWahala(round)) {
      this.state.phase = "intro";
      this.broadcast("doubleWahala", { round, serverNow: Date.now(), durationMs: DOUBLE_WAHALA_INTRO_MS });
      this.later(DOUBLE_WAHALA_INTRO_MS, () => this.sendQuestion(q));
    } else {
      this.state.phase = "intro";
      this.broadcast("roundIntro", { round, total: this.state.total, durationMs: ROUND_INTRO_MS });
      this.later(round === 1 ? ROUND_INTRO_MS + 400 : ROUND_INTRO_MS, () => this.sendQuestion(q));
    }
  }

  /** The question as this player should see it (translated when they asked for another language). */
  private questionFor(seat: Seat | undefined, q: FullQuestion): FullQuestion {
    return (seat && this.localized.get(seat.locale)?.get(q.id)) ?? q;
  }

  private seatOf(client: Client) {
    const userId = this.sessionToUser.get(client.sessionId);
    return userId ? this.seats.get(userId) : undefined;
  }

  private questionMsg(seat: Seat): QuestionMsg & { hidden?: string[] } {
    const { q, s, startedAt } = this.current!;
    const lq = this.questionFor(seat, q);
    return {
      round: this.state.round,
      total: this.state.total,
      questionId: q.id,
      text: lq.text,
      category: q.category as CategorySlug,
      options: lq === q ? s.options : s.options.map((o) => ({ id: o.id, text: lq.options[s.indexById.get(o.id)!]! })),
      deadlineAt: seat.deadlineAt,
      serverNow: Date.now(),
      durationMs: seat.deadlineAt - startedAt,
      doubleWahala: isDoubleWahala(this.state.round),
      hidden: seat.hiddenOptions.length ? seat.hiddenOptions : undefined,
    };
  }

  private sendQuestion(q: FullQuestion) {
    const startedAt = Date.now();
    const s = shuffleRandom(q);
    this.current = { q, s, startedAt };
    this.pending.clear();
    this.state.phase = "question";
    this.state.deadline = startedAt + QUESTION_MS;
    for (const seat of this.seats.values()) {
      seat.deadlineAt = startedAt + QUESTION_MS;
      seat.hiddenOptions = [];
    }
    for (const client of this.clients) {
      const userId = this.sessionToUser.get(client.sessionId);
      const seat = userId ? this.seats.get(userId) : undefined;
      if (seat) client.send("question", this.questionMsg(seat));
    }
    for (const seat of this.seats.values()) {
      if (!seat.isBot) continue;
      const plan = planBotAnswer(seat.bot!, q.difficulty, s.options.map((o) => o.id), s.correctOptionId);
      const round = this.state.round;
      this.later(plan.delayMs, () => {
        if (this.state.round === round && this.state.phase === "question") this.recordAnswer(seat.userId, plan.optionId, Date.now());
      });
    }
    this.scheduleRoundEnd();
  }

  private scheduleRoundEnd() {
    this.roundTimer?.clear();
    const latest = Math.max(...[...this.seats.values()].map((s) => s.deadlineAt));
    const round = this.state.round;
    this.roundTimer = this.clock.setTimeout(() => {
      if (this.state.round === round && this.state.phase === "question") this.endRound();
    }, latest + ANSWER_GRACE_MS + 30 - Date.now());
  }

  private handleAnswer(client: Client, raw: unknown) {
    const receivedAt = Date.now();
    const parsed = answerMessageSchema.safeParse(raw);
    if (!parsed.success || this.state.phase !== "question" || !this.current) return;
    if (parsed.data.questionId !== this.current.q.id) return;
    const userId = this.sessionToUser.get(client.sessionId);
    if (!userId) return;
    const seat = this.seats.get(userId)!;
    if (!isAnswerAccepted(receivedAt, seat.deadlineAt)) {
      client.send("answerRejected", { reason: "late" });
      return;
    }
    if (!this.current.s.indexById.has(parsed.data.optionId)) return;
    this.recordAnswer(userId, parsed.data.optionId, receivedAt);
  }

  private recordAnswer(userId: string, optionId: string | null, receivedAt: number) {
    if (this.pending.has(userId)) return;
    this.pending.set(userId, { optionId, receivedAt });
    const p = this.state.players.get(userId);
    if (p) p.answered = true;
    const allIn = [...this.seats.keys()].every((id) => this.pending.has(id));
    if (allIn) this.later(350, () => this.state.phase === "question" && this.endRound());
  }

  private endRound() {
    if (!this.current || this.state.phase !== "question") return;
    this.roundTimer?.clear();
    const { q, s, startedAt } = this.current;
    const round = this.state.round;
    const answers: RevealMsg["answers"] = {};

    for (const seat of this.seats.values()) {
      const pend = this.pending.get(seat.userId);
      const optionIndex = pend?.optionId ? (s.indexById.get(pend.optionId) ?? null) : null;
      const correct = optionIndex === q.correctIndex;
      const elapsed = pend ? Math.max(0, Math.min(pend.receivedAt, seat.deadlineAt) - startedAt) : seat.deadlineAt - startedAt;
      const points = pointsForAnswer({ correct, remainingMs: QUESTION_MS - elapsed, round });
      if (!correct && seat.shieldArmed && !seat.shieldConsumed) {
        seat.shieldConsumed = true;
        seat.shieldArmed = false;
      }
      seat.totalMs += elapsed;
      seat.answers.push({ round, questionId: q.id, categoryId: q.categoryId, optionIndex, correct, points, ms: elapsed });
      const ps = this.state.players.get(seat.userId)!;
      ps.score += points;
      answers[seat.userId] = { optionId: pend?.optionId ?? null, correct, points, ms: elapsed };
    }

    const scores = Object.fromEntries([...this.state.players.entries()].map(([id, p]) => [id, p.score]));
    this.rounds.push({ round, questionId: q.id, text: q.text, category: q.category as CategorySlug, correctText: q.options[q.correctIndex]!, fact: q.fact, options: s.options, answers });
    this.roundIndex.set(round, s.indexById);
    this.state.phase = "reveal";
    const nextAt = Date.now() + REVEAL_MS;
    const msg: RevealMsg = { round, questionId: q.id, correctOptionId: s.correctOptionId, answers, scores, fact: q.fact, nextAt };
    for (const client of this.clients) client.send("reveal", { ...msg, fact: this.questionFor(this.seatOf(client), q).fact });
    this.current = null;
    this.later(REVEAL_MS, () => (round >= this.state.total ? this.finish() : this.startRound(round + 1)));
  }

  // ── Power-ups ───────────────────────────────────────────────────────────
  private async handlePowerUp(client: Client, raw: unknown) {
    const parsed = powerUpKindSchema.safeParse((raw as { kind?: unknown })?.kind);
    const userId = this.sessionToUser.get(client.sessionId);
    if (!parsed.success || !userId || this.state.phase !== "question" || !this.current) return;
    const kind = parsed.data as PowerUpKind;
    const p = this.state.players.get(userId)!;
    const seat = this.seats.get(userId)!;
    if (p.powerUpUsed || this.pending.has(userId)) return;
    p.powerUpUsed = true; // reserve immediately to block double-taps

    const charged = await this.chargePowerUp(userId, kind);
    if (!charged.ok) {
      p.powerUpUsed = false;
      client.send("powerupError", { kind, reason: charged.reason });
      return;
    }
    if (!this.current || this.state.phase !== "question") return;
    const { q, s } = this.current;
    const msg: PowerUpMsg = { kind };
    if (kind === "fifty") {
      const wrong = s.options.filter((o) => o.id !== s.correctOptionId).sort(() => Math.random() - 0.5).slice(0, 2);
      seat.hiddenOptions = wrong.map((o) => o.id);
      msg.removeOptionIds = seat.hiddenOptions;
    } else if (kind === "extra_time") {
      seat.deadlineAt += EXTRA_TIME_MS;
      msg.deadlineAt = seat.deadlineAt;
      this.scheduleRoundEnd();
    } else if (kind === "crowd") {
      msg.distribution = crowdDistribution(q, s);
    } else if (kind === "shield") {
      seat.shieldArmed = true;
    }
    client.send("powerup", { ...msg, serverNow: Date.now(), via: charged.via, coins: charged.coins });
    analytics.track(userId, "powerup_used", { kind, via: charged.via });
  }

  /** Inventory first, then the daily free power-up, then coins. */
  private async chargePowerUp(userId: string, kind: PowerUpKind): Promise<{ ok: true; via: string; coins?: number } | { ok: false; reason: string }> {
    const sql = await getDb();
    const def = POWER_UPS.find((d) => d.kind === kind)!;
    return sql.tx(async (tx) => {
      const inv = await tx.one("update inventory set quantity = quantity - 1, updated_at = now() where user_id = $1 and item_id = $2 and quantity > 0 returning quantity", [userId, `pu_${kind}`]);
      if (inv) return { ok: true as const, via: "inventory" };
      const today = lagosDate();
      const free = await tx.one("update profiles set free_powerup_date = $2 where id = $1 and (free_powerup_date is null or free_powerup_date <> $2) returning id", [userId, today]);
      if (free) return { ok: true as const, via: "free" };
      const paid = await tx.one<{ coins: number }>("update profiles set coins = coins - $2 where id = $1 and coins >= $2 returning coins", [userId, def.cost]);
      if (paid) return { ok: true as const, via: "coins", coins: paid.coins };
      return { ok: false as const, reason: `You need ${def.cost} coins for ${def.name}.` };
    });
  }

  // ── Result ──────────────────────────────────────────────────────────────
  private async finish() {
    if (this.finished) return;
    this.finished = true;
    this.state.phase = "result";
    const [a, b] = [...this.seats.values()];
    if (!a || !b) return;
    const sql = await getDb();
    const toInput = (s: Seat) => ({
      id: s.userId,
      isBot: s.isBot,
      isGuest: s.isGuest,
      rating: s.rating,
      score: this.state.players.get(s.userId)!.score,
      totalMs: s.totalMs,
      shieldConsumed: s.shieldConsumed,
      answers: s.answers,
    });
    let persisted;
    for (let attempt = 0; attempt < 3 && !persisted; attempt++) {
      try {
        persisted = await persistMatchResult(sql, {
          mode: this.mode,
          categories: this.state.categories.toArray(),
          a: toInput(a),
          b: toInput(b),
          botName: this.botName,
        });
      } catch (e) {
        errors.capture(e, { room: this.roomId, attempt });
      }
    }
    if (!persisted) {
      this.broadcast("matchError", { message: "We couldn't save this match. Your rating is unchanged." });
      return;
    }
    const result: ResultMsg = {
      matchId: persisted.matchId,
      mode: this.mode,
      isBot: this.state.isBot,
      winnerId: persisted.winnerId,
      players: persisted.players,
      rounds: this.rounds,
    };
    for (const client of this.clients) client.send("result", { ...result, rounds: this.roundsFor(this.seatOf(client)) });
    for (const s of this.seats.values()) {
      if (!s.isBot) analytics.track(s.userId, "match_completed", { mode: this.mode, isBot: this.state.isBot, result: persisted.players[s.userId]?.result });
    }
    this.later(POST_RESULT_TTL_MS, () => this.disconnect());
  }

  /** Round summaries in this player's language. */
  private roundsFor(seat: Seat | undefined): RoundSummary[] {
    if (!seat || !this.localized.has(seat.locale)) return this.rounds;
    return this.rounds.map((r) => {
      const base = this.questions.find((q) => q.id === r.questionId);
      const lq = base ? this.questionFor(seat, base) : undefined;
      const idx = this.roundIndex.get(r.round);
      if (!lq || lq === base || !idx) return r;
      return { ...r, text: lq.text, correctText: lq.options[lq.correctIndex]!, fact: lq.fact, options: r.options.map((o) => ({ id: o.id, text: lq.options[idx.get(o.id)!]! })) };
    });
  }

  // ── Rematch ─────────────────────────────────────────────────────────────
  private rematchRequested() {
    return [...this.seats.values()].filter((s) => s.rematch).map((s) => s.userId);
  }

  private async handleRematch(client: Client) {
    if (!this.finished) return;
    const userId = this.sessionToUser.get(client.sessionId);
    const seat = userId ? this.seats.get(userId) : undefined;
    if (!seat || seat.rematch) return;
    seat.rematch = true;
    const humans = [...this.seats.values()].filter((s) => !s.isBot);
    const opponentGone = humans.some((h) => h.userId !== userId && h.left);
    if (this.state.isBot || humans.every((h) => h.rematch)) {
      const room = await matchMaker.createRoom("match", { mode: this.mode, userIds: humans.map((h) => h.userId), withBot: this.state.isBot } satisfies MatchRoomOptions);
      for (const c of this.clients) {
        const uid = this.sessionToUser.get(c.sessionId);
        if (!uid || !humans.some((h) => h.userId === uid)) continue;
        const reservation = await matchMaker.reserveSeatFor(room, {}, { userId: uid });
        c.send("rematchReady", { reservation });
      }
      this.later(2_000, () => this.disconnect(CloseCode.NORMAL_CLOSURE));
    } else {
      this.broadcast("rematchStatus", { requested: this.rematchRequested(), opponentLeft: opponentGone });
    }
  }
}
