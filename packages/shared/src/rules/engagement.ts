import { CATEGORIES, COINS, COSMETICS, type CategorySlug, type CosmeticDef } from "../constants";
import { addDays, lagosWeekStart } from "./time";

// ── First win of the day ───────────────────────────────────────────────────
/** Paid once per Lagos day on the first win (ranked or practice). */
export const FIRST_WIN_BONUS = 50;

// ── Daily Naija streak milestones ──────────────────────────────────────────
export const STREAK_MILESTONES: readonly { days: number; coins: number }[] = [
  { days: 3, coins: 30 },
  { days: 7, coins: 75 },
  { days: 14, coins: 150 },
  { days: 30, coins: 300 },
  { days: 60, coins: 600 },
  { days: 100, coins: 1000 },
];

/** The milestone reached exactly at this streak length, if any (paid every time it is reached). */
export const streakMilestone = (current: number) => STREAK_MILESTONES.find((m) => m.days === current) ?? null;

/** The next milestone above the current streak, if any. */
export const nextStreakMilestone = (current: number) => STREAK_MILESTONES.find((m) => m.days > current) ?? null;

// ── Premium perks ──────────────────────────────────────────────────────────
/** Coins paid to Premium players every PREMIUM_STIPEND_DAYS while Premium is active. */
export const PREMIUM_MONTHLY_COINS = 1500;
export const PREMIUM_STIPEND_DAYS = 30;

/** Daily Naija streak freezes per Lagos week (Monday–Sunday). */
export const STREAK_FREEZES_PER_WEEK = { free: 1, premium: 2 } as const;

// ── Coin sinks ─────────────────────────────────────────────────────────────
/** A streak freeze bought with coins. Bought freezes are used only after the week's free ones run out. */
export const STREAK_FREEZE_COST = 150;
/** Most bought freezes a player can hold at once. */
export const STREAK_FREEZE_MAX_OWNED = 2;

/** Coins each side can put on a direct friend challenge; the winner takes both. */
export const CHALLENGE_STAKES = [0, 25, 50, 100] as const;
export type ChallengeStake = (typeof CHALLENGE_STAKES)[number];

/** How many rotating cosmetics are on sale each week. */
export const FEATURED_COSMETICS_PER_WEEK = 3;

/**
 * The rotating cosmetics on sale in the Lagos week starting `weekStart` (a Monday, YYYY-MM-DD).
 * The pool is walked in order, three a week, so every item comes back every pool/3 weeks.
 */
export function featuredCosmetics(weekStart: string): CosmeticDef[] {
  const pool = COSMETICS.filter((c) => c.rotating);
  if (!pool.length) return [];
  const week = Math.floor(Date.parse(`${weekStart}T00:00:00Z`) / (7 * 86_400_000));
  const offset = (week * FEATURED_COSMETICS_PER_WEEK) % pool.length;
  return Array.from({ length: Math.min(FEATURED_COSMETICS_PER_WEEK, pool.length) }, (_, i) => pool[(offset + i) % pool.length]!);
}

// ── Live national events ───────────────────────────────────────────────────
export interface LiveEventDef {
  id: string;
  name: string;
  tagline: string;
  /** Lagos time, e.g. "2026-12-31T21:00:00+01:00" */
  startsAt: string;
  durationMin: number;
  /** Category the 10 questions come from; omitted = a mix of everything */
  category?: CategorySlug;
}

/** Questions in a live event (server-timed like Daily Naija, one attempt each). */
export const LIVE_EVENT_QUESTIONS = 10;
/** Coins for finishing a live event. */
export const LIVE_EVENT_FINISH_COINS = 40;
/** Coins by final place when the event closes: 1st, 2nd, 3rd, then 4th–10th. */
export const LIVE_EVENT_PRIZES: readonly number[] = [500, 300, 200, 100, 100, 100, 100, 100, 100, 100];
/** How long before the start an event shows as "coming up" on Home. */
export const LIVE_EVENT_TEASE_MS = 7 * 86_400_000;

/**
 * Scheduled live quizzes for big national moments. Moving events (AFCON matches, BBNaija finale,
 * Eid) get an entry here once their dates are announced.
 */
export const LIVE_EVENTS: readonly LiveEventDef[] = [
  { id: "launch-night-2026", name: "Launch Night Live", tagline: "The first live quiz. Bragging rights forever.", startsAt: "2026-10-23T20:00:00+01:00", durationMin: 60 },
  { id: "detty-december-2026", name: "Detty December Live", tagline: "Owambe, Afrobeats and Lagos traffic. You ready?", startsAt: "2026-12-19T20:00:00+01:00", durationMin: 60, category: "afrobeats" },
  { id: "christmas-eve-2026", name: "Christmas Eve Quiz", tagline: "Before the jollof runs out.", startsAt: "2026-12-24T19:00:00+01:00", durationMin: 60, category: "food" },
  { id: "new-year-2026", name: "New Year's Eve Countdown", tagline: "Last quiz of 2026. Finish the year on top.", startsAt: "2026-12-31T21:00:00+01:00", durationMin: 90 },
  { id: "valentine-2027", name: "Val's Night Live", tagline: "Nollywood love stories and Afro love songs.", startsAt: "2027-02-14T20:00:00+01:00", durationMin: 60, category: "nollywood" },
  { id: "childrens-day-2027", name: "Children's Day Live", tagline: "Throwback edition: school days and cartoons.", startsAt: "2027-05-27T16:00:00+01:00", durationMin: 60, category: "naija-life" },
  { id: "democracy-day-2027", name: "Democracy Day Live", tagline: "June 12: know your history.", startsAt: "2027-06-12T20:00:00+01:00", durationMin: 60, category: "history" },
  { id: "independence-2027", name: "Independence Day Live", tagline: "67 years of Naija. Prove you know her.", startsAt: "2027-10-01T20:00:00+01:00", durationMin: 90 },
];

export const liveEventById = (id: string) => LIVE_EVENTS.find((e) => e.id === id);
export const liveEventWindow = (e: LiveEventDef) => {
  const start = Date.parse(e.startsAt);
  return { start, end: start + e.durationMin * 60_000 };
};

/** The event that is live now, else the next one starting within the tease window. */
export function featuredLiveEvent(now: number = Date.now()): { event: LiveEventDef; live: boolean; start: number; end: number } | null {
  for (const e of LIVE_EVENTS) {
    const w = liveEventWindow(e);
    if (now >= w.start && now < w.end) return { event: e, live: true, ...w };
  }
  const next = LIVE_EVENTS.map((e) => ({ event: e, ...liveEventWindow(e) }))
    .filter((x) => x.start > now && x.start - now <= LIVE_EVENT_TEASE_MS)
    .sort((a, b) => a.start - b.start)[0];
  return next ? { ...next, live: false } : null;
}

// ── Content pipeline ───────────────────────────────────────────────────────
/** New live questions the team aims to release each week. */
export const CONTENT_WEEKLY_TARGET = 50;

/** When the next weekly content drop goes live: the coming Monday, 00:00 Lagos time (ISO). */
export function nextContentDrop(now: number = Date.now()): string {
  return `${addDays(lagosWeekStart(now), 7)}T00:00:00+01:00`;
}

// ── Offline Daily Naija ────────────────────────────────────────────────────
/** An offline run can be submitted up to this many days after its date (it still counts for that day). */
export const OFFLINE_DAILY_GRACE_DAYS = 2;

// ── State Wars weekly prizes ───────────────────────────────────────────────
/** Coins for everyone who scored for the 1st, 2nd and 3rd placed state that week. */
export const STATE_WAR_PRIZES: readonly number[] = [200, 100, 50];

// ── Achievements ───────────────────────────────────────────────────────────
export type AchievementMetric =
  | "wins"
  | "best_streak"
  | "perfect_matches"
  | "perfect_dailies"
  | "peak_rating"
  | "friends"
  | "friend_wins"
  | "challenges_played"
  | "best_state_week"
  | "categories_correct";

export interface AchievementDef {
  slug: string;
  title: string;
  description: string;
  /** lucide icon name */
  icon: string;
  metric: AchievementMetric;
  target: number;
  reward: number;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { slug: "first_win", title: "First blood", description: "Win your first clash", icon: "swords", metric: "wins", target: 1, reward: 50 },
  { slug: "wins_10", title: "On a roll", description: "Win 10 clashes", icon: "swords", metric: "wins", target: 10, reward: 100 },
  { slug: "wins_50", title: "Warlord", description: "Win 50 clashes", icon: "swords", metric: "wins", target: 50, reward: 250 },
  { slug: "wins_100", title: "Centurion", description: "Win 100 clashes", icon: "swords", metric: "wins", target: 100, reward: 500 },
  { slug: "perfect_match", title: "Flawless", description: "Answer all 7 right in a clash", icon: "target", metric: "perfect_matches", target: 1, reward: 100 },
  { slug: "perfect_daily", title: "Ten over ten", description: "Score 10/10 in Daily Naija", icon: "star", metric: "perfect_dailies", target: 1, reward: 100 },
  { slug: "streak_7", title: "Week warrior", description: "Reach a 7-day Daily Naija streak", icon: "flame", metric: "best_streak", target: 7, reward: 100 },
  { slug: "streak_30", title: "Iron streak", description: "Reach a 30-day Daily Naija streak", icon: "flame", metric: "best_streak", target: 30, reward: 400 },
  { slug: "reach_sharp", title: "Sharp mind", description: "Reach the Sharp league", icon: "shield", metric: "peak_rating", target: 1300, reward: 100 },
  { slug: "reach_odogwu", title: "Odogwu", description: "Reach the Odogwu league", icon: "shield", metric: "peak_rating", target: 1600, reward: 200 },
  { slug: "reach_oga", title: "Oga at the Top", description: "Reach the Oga at the Top league", icon: "shield", metric: "peak_rating", target: 1900, reward: 400 },
  { slug: "reach_agba", title: "Agba", description: "Reach the Agba league", icon: "crown", metric: "peak_rating", target: 2200, reward: 800 },
  { slug: "friends_3", title: "Squad", description: "Have 3 friends", icon: "users", metric: "friends", target: 3, reward: 50 },
  { slug: "beat_friend", title: "Bragging rights", description: "Beat a friend in a challenge", icon: "trophy", metric: "friend_wins", target: 1, reward: 75 },
  { slug: "challenges_10", title: "Challenger", description: "Finish 10 friend challenges", icon: "send", metric: "challenges_played", target: 10, reward: 100 },
  { slug: "state_hero", title: "State hero", description: "Earn 50 State Wars points in one week", icon: "map-pin", metric: "best_state_week", target: 50, reward: 150 },
  { slug: "all_rounder", title: "All-rounder", description: "Get a question right in every category", icon: "layout-grid", metric: "categories_correct", target: CATEGORIES.length, reward: 150 },
];

// ── Themed weeks ───────────────────────────────────────────────────────────
interface SpecialTheme {
  id: string;
  name: string;
  tagline: string;
  category: CategorySlug;
  /** MM-DD in Lagos time, inclusive; recurs every year */
  from: string;
  to: string;
}

/** Recurring special weeks. AFCON-style events with moving dates can be added as one-off entries the same way. */
export const SPECIAL_THEMES: readonly SpecialTheme[] = [
  { id: "love", name: "Love Week", tagline: "Nollywood romance, wedding gist and Valentine vibes.", category: "nollywood", from: "02-10", to: "02-16" },
  { id: "childrens-day", name: "Children's Day Week", tagline: "School days, playground slang and growing up in Naija.", category: "naija-life", from: "05-24", to: "05-30" },
  { id: "june-12", name: "June 12 Week", tagline: "Democracy Day: the history that shaped modern Nigeria.", category: "history", from: "06-09", to: "06-15" },
  { id: "independence", name: "Independence Week", tagline: "Nigeria at 60-something: history, heroes and the green-white-green.", category: "history", from: "09-28", to: "10-04" },
  { id: "detty-december", name: "Detty December", tagline: "Owambe season: Afrobeats bangers all month long.", category: "afrobeats", from: "12-15", to: "12-31" },
];

/** Extra share of win coins during a special (not rotating) theme. */
export const SPECIAL_THEME_WIN_MULTIPLIER = 1.5;

export interface ActiveTheme {
  id: string;
  name: string;
  tagline: string;
  category: CategorySlug;
  /** Lagos dates, inclusive */
  startsOn: string;
  endsOn: string;
  special: boolean;
}

const WEEK_TAGLINES: Partial<Record<CategorySlug, string>> = {
  nollywood: "Nollywood questions in every clash this week.",
  afrobeats: "Afrobeats questions in every clash this week.",
  football: "Sports questions in every clash this week.",
  history: "History questions in every clash this week.",
  geography: "Geography questions in every clash this week.",
  food: "Food questions in every clash this week.",
  pidgin: "Pidgin and slang in every clash this week.",
  proverbs: "Proverbs and languages in every clash this week.",
  "naija-life": "Naija Life questions in every clash this week.",
  "tech-business": "Tech and business questions in every clash this week.",
};

/**
 * The theme for a Lagos date. Special weeks win; otherwise every Monday–Sunday week features
 * the next category in a fixed rotation.
 */
export function themeFor(date: string): ActiveTheme {
  const year = date.slice(0, 4);
  const md = date.slice(5);
  const special = SPECIAL_THEMES.find((t) => md >= t.from && md <= t.to);
  if (special) {
    return { id: special.id, name: special.name, tagline: special.tagline, category: special.category, startsOn: `${year}-${special.from}`, endsOn: `${year}-${special.to}`, special: true };
  }
  const monday = lagosWeekStart(Date.parse(`${date}T12:00:00Z`));
  const weekIndex = Math.floor(Date.parse(`${monday}T00:00:00Z`) / (7 * 86_400_000));
  const cat = CATEGORIES[((weekIndex % CATEGORIES.length) + CATEGORIES.length) % CATEGORIES.length]!;
  return { id: `week-${cat.slug}`, name: `${cat.short} Week`, tagline: WEEK_TAGLINES[cat.slug] ?? "", category: cat.slug, startsOn: monday, endsOn: addDays(monday, 6), special: false };
}

/** Win coins during a theme (special weeks pay more). */
export const themedWinCoins = (theme: ActiveTheme) => (theme.special ? Math.round(COINS.win * SPECIAL_THEME_WIN_MULTIPLIER) : COINS.win);
