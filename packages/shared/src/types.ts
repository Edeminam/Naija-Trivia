import type { LeagueId, PowerUpKind, CategorySlug, ProductId } from "./constants";
import type { Settings } from "./schemas";
import type { PlayerResult } from "./rules/progression";

// ── Profile ────────────────────────────────────────────────────────────────
export interface PublicProfile {
  id: string;
  username: string;
  avatarId: string;
  stateCode: string;
  level: number;
  rating: number;
  league: LeagueId;
  frameId: string | null;
  title: string;
}

export interface MeProfile extends PublicProfile {
  isGuest: boolean;
  onboarded: boolean;
  xp: number;
  coins: number;
  rankedGames: number;
  premiumUntil: string | null;
  isPremium: boolean;
  buttonThemeId: string | null;
  settings: Settings;
  freePowerUpAvailable: boolean;
  guestMatchUsed: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export interface InventoryItem {
  itemId: string;
  kind: "power_up" | "cosmetic";
  quantity: number;
}

export interface MeResponse {
  profile: MeProfile;
  inventory: InventoryItem[];
}

// ── Home ───────────────────────────────────────────────────────────────────
export interface MissionProgress {
  id: string;
  slug: string;
  title: string;
  progress: number;
  target: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
}

export interface StreakInfo {
  current: number;
  best: number;
  freezeAvailable: boolean;
  playedToday: boolean;
}

export interface HomeResponse {
  missions: MissionProgress[];
  streak: StreakInfo;
  daily: { date: string; played: boolean; score: number | null; resetsAt: number };
  stateRank: { code: string; name: string; rank: number; points: number } | null;
  matchesToday: number;
}

// ── Match protocol ─────────────────────────────────────────────────────────
export type MatchPhase = "waiting" | "banning" | "loading" | "intro" | "question" | "reveal" | "result";
export type MatchMode = "ranked" | "guest";

export interface WireOption {
  id: string;
  text: string;
}

export interface QuestionMsg {
  round: number;
  total: number;
  questionId: string;
  text: string;
  category: CategorySlug;
  options: WireOption[];
  /** server epoch ms when the answer window closes */
  deadlineAt: number;
  /** server epoch ms at send time; client uses it to correct clock skew */
  serverNow: number;
  durationMs: number;
  doubleWahala: boolean;
}

export interface RevealAnswer {
  optionId: string | null;
  correct: boolean;
  points: number;
  ms: number;
}

export interface RevealMsg {
  round: number;
  questionId: string;
  correctOptionId: string;
  answers: Record<string, RevealAnswer>;
  scores: Record<string, number>;
  fact: string;
  nextAt: number;
}

export interface RoundSummary {
  round: number;
  questionId: string;
  text: string;
  category: CategorySlug;
  correctText: string;
  answers: Record<string, RevealAnswer>;
}

export interface PlayerMatchResult {
  playerId: string;
  result: PlayerResult;
  score: number;
  correct: number;
  ratingBefore: number;
  ratingAfter: number;
  ratingDelta: number;
  coins: number;
  xp: number;
  statePoints: number;
  levelBefore: number;
  levelAfter: number;
  leagueBefore: LeagueId;
  leagueAfter: LeagueId;
  shieldSaved: boolean;
}

export interface ResultMsg {
  matchId: string;
  mode: MatchMode;
  isBot: boolean;
  winnerId: string | null;
  players: Record<string, PlayerMatchResult>;
  rounds: RoundSummary[];
}

export interface PowerUpMsg {
  kind: PowerUpKind;
  /** 50/50: option ids to hide; crowd: % per option id; extra_time: new deadline */
  removeOptionIds?: string[];
  distribution?: Record<string, number>;
  deadlineAt?: number;
}

export interface MatchedMsg {
  roomId: string;
}

export interface BanOption {
  categoryId: string;
  slug: CategorySlug;
  name: string;
}

// ── Leagues / State wars ───────────────────────────────────────────────────
export interface LeaguesResponse {
  rating: number;
  league: LeagueId;
  progress: number;
  nextLeague: LeagueId | null;
  pointsToNext: number | null;
  season: { number: number; startsAt: string; endsAt: string };
  rankedGames: number;
  record: { wins: number; losses: number; draws: number };
}

export interface StateWarsRow {
  code: string;
  name: string;
  region: string;
  rank: number;
  points: number;
  lastWeekRank: number | null;
  change: number | null;
  players: number;
  topPlayer: { id: string; username: string; avatarId: string; points: number } | null;
}

export interface StateWarsResponse {
  weekStart: string;
  endsAt: number;
  rows: StateWarsRow[];
  myState: string | null;
}

export interface LeaderboardPlayer {
  rank: number;
  id: string;
  username: string;
  avatarId: string;
  stateCode: string;
  points: number;
  league: LeagueId;
  frameId: string | null;
}

// ── Daily & challenge ──────────────────────────────────────────────────────
export interface SoloQuestion {
  index: number;
  total: number;
  questionId: string;
  text: string;
  category: CategorySlug;
  options: WireOption[];
  durationMs: number;
  deadlineAt: number;
  serverNow: number;
}

export interface SoloAnswerResult {
  index: number;
  correct: boolean;
  correctOptionId: string;
  points: number;
  ms: number;
  fact: string;
  totalScore: number;
  done: boolean;
}

export interface DailyStatus {
  date: string;
  played: boolean;
  inProgress: boolean;
  nextIndex: number;
  score: number | null;
  correct: number | null;
  resetsAt: number;
  streak: StreakInfo;
  nationalRank: number | null;
  stateRank: number | null;
  players: number;
}

export interface ChallengeSummary {
  code: string;
  createdBy: PublicProfile;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
  categories: CategorySlug[];
  entries: { player: PublicProfile; score: number | null; correct: number | null; finished: boolean; totalMs: number }[];
  myEntry: { nextIndex: number; finished: boolean; score: number } | null;
  shareUrl: string;
  whatsappUrl: string;
}

// ── Profile stats ──────────────────────────────────────────────────────────
export interface CategoryStat {
  slug: CategorySlug;
  answered: number;
  correct: number;
  accuracy: number;
}

export interface MatchHistoryItem {
  id: string;
  type: "ranked" | "friend" | "daily" | "bot";
  isBot: boolean;
  result: PlayerResult;
  myScore: number;
  oppScore: number;
  ratingDelta: number;
  opponent: { username: string; avatarId: string; stateCode: string } | null;
  createdAt: string;
}

export interface ProfileStatsResponse {
  profile: PublicProfile;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  categories: CategoryStat[];
  badges: { slug: CategorySlug; tier: "bronze" | "silver" | "gold" }[];
  history: MatchHistoryItem[];
}

// ── Shop ───────────────────────────────────────────────────────────────────
export interface PurchaseResponse {
  ok: true;
  productId: ProductId;
  coins: number;
  premiumUntil: string | null;
  receiptId: string;
}
