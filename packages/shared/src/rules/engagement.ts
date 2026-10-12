import { CATEGORIES, COINS, type CategorySlug } from "../constants";
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
