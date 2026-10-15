// ── Game timing ────────────────────────────────────────────────────────────
export const QUESTIONS_PER_MATCH = 7;
export const QUESTION_MS = 10_000;
export const EXTRA_TIME_MS = 5_000;
export const ANSWER_GRACE_MS = 300;
export const REVEAL_MS = 1_500;
export const BAN_MS = 5_000;
export const BAN_OPTION_COUNT = 4;
export const DOUBLE_WAHALA_ROUND = 7; // 1-based
export const RECONNECT_WINDOW_MS = 20_000;
export const MATCHMAKING_TIMEOUT_MS = 5_000;
export const DAILY_QUESTION_COUNT = 10;
export const CHALLENGE_TTL_MS = 48 * 60 * 60 * 1000;
export const SEASON_DAYS = 28;
export const SEEN_QUESTION_WINDOW_DAYS = 30;

// ── Anti-cheat ─────────────────────────────────────────────────────────────
export const SUSPICIOUS_ANSWER_MS = 400;
export const SUSPICIOUS_DAILY_THRESHOLD = 10;

// ── Economy ────────────────────────────────────────────────────────────────
export const COINS = { win: 30, draw: 15, loss: 5, dailyComplete: 20 } as const;
export const XP = { win: 50, draw: 35, loss: 20, perCorrect: 5 } as const;
export const STARTING_COINS = 200;
export const STARTING_RATING = 1000;
export const INTERSTITIAL_EVERY_N_MATCHES = 3;

// ── Categories ─────────────────────────────────────────────────────────────
export type CategorySlug =
  | "nollywood"
  | "afrobeats"
  | "football"
  | "history"
  | "geography"
  | "food"
  | "pidgin"
  | "proverbs"
  | "naija-life"
  | "tech-business";

export interface CategoryDef {
  slug: CategorySlug;
  name: string;
  short: string;
  /** lucide icon name */
  icon: string;
  /** hue used for category chips / stats bars */
  tint: string;
}

export const CATEGORIES: readonly CategoryDef[] = [
  { slug: "nollywood", name: "Nollywood & TV", short: "Nollywood", icon: "clapperboard", tint: "#C77DFF" },
  { slug: "afrobeats", name: "Afrobeats & Music", short: "Afrobeats", icon: "music-2", tint: "#FF7A59" },
  { slug: "football", name: "Football & Sports", short: "Sports", icon: "trophy", tint: "#3DD6A3" },
  { slug: "history", name: "History & Politics", short: "History", icon: "landmark", tint: "#E8B44A" },
  { slug: "geography", name: "Geography & States", short: "Geography", icon: "map", tint: "#4FB3FF" },
  { slug: "food", name: "Food & Kitchen", short: "Food", icon: "chef-hat", tint: "#FF9F43" },
  { slug: "pidgin", name: "Pidgin & Slang", short: "Pidgin", icon: "message-circle", tint: "#F368E0" },
  { slug: "proverbs", name: "Proverbs & Languages", short: "Proverbs", icon: "book-open", tint: "#A3E635" },
  { slug: "naija-life", name: "Naija Life", short: "Naija Life", icon: "bus", tint: "#22D3EE" },
  { slug: "tech-business", name: "Tech & Business", short: "Tech", icon: "cpu", tint: "#818CF8" },
] as const;

export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

// ── States ─────────────────────────────────────────────────────────────────
export type Region = "North Central" | "North East" | "North West" | "South East" | "South South" | "South West" | "Diaspora";

export interface StateDef {
  code: string;
  name: string;
  region: Region;
}

export const STATES: readonly StateDef[] = [
  { code: "AB", name: "Abia", region: "South East" },
  { code: "AD", name: "Adamawa", region: "North East" },
  { code: "AK", name: "Akwa Ibom", region: "South South" },
  { code: "AN", name: "Anambra", region: "South East" },
  { code: "BA", name: "Bauchi", region: "North East" },
  { code: "BY", name: "Bayelsa", region: "South South" },
  { code: "BE", name: "Benue", region: "North Central" },
  { code: "BO", name: "Borno", region: "North East" },
  { code: "CR", name: "Cross River", region: "South South" },
  { code: "DE", name: "Delta", region: "South South" },
  { code: "EB", name: "Ebonyi", region: "South East" },
  { code: "ED", name: "Edo", region: "South South" },
  { code: "EK", name: "Ekiti", region: "South West" },
  { code: "EN", name: "Enugu", region: "South East" },
  { code: "FC", name: "FCT Abuja", region: "North Central" },
  { code: "GO", name: "Gombe", region: "North East" },
  { code: "IM", name: "Imo", region: "South East" },
  { code: "JI", name: "Jigawa", region: "North West" },
  { code: "KD", name: "Kaduna", region: "North West" },
  { code: "KN", name: "Kano", region: "North West" },
  { code: "KT", name: "Katsina", region: "North West" },
  { code: "KE", name: "Kebbi", region: "North West" },
  { code: "KO", name: "Kogi", region: "North Central" },
  { code: "KW", name: "Kwara", region: "North Central" },
  { code: "LA", name: "Lagos", region: "South West" },
  { code: "NA", name: "Nasarawa", region: "North Central" },
  { code: "NI", name: "Niger", region: "North Central" },
  { code: "OG", name: "Ogun", region: "South West" },
  { code: "ON", name: "Ondo", region: "South West" },
  { code: "OS", name: "Osun", region: "South West" },
  { code: "OY", name: "Oyo", region: "South West" },
  { code: "PL", name: "Plateau", region: "North Central" },
  { code: "RI", name: "Rivers", region: "South South" },
  { code: "SO", name: "Sokoto", region: "North West" },
  { code: "TA", name: "Taraba", region: "North East" },
  { code: "YO", name: "Yobe", region: "North East" },
  { code: "ZA", name: "Zamfara", region: "North West" },
  { code: "DI", name: "Diaspora", region: "Diaspora" },
] as const;

export const stateByCode = (code: string | null | undefined) => STATES.find((s) => s.code === code);

// ── Leagues ────────────────────────────────────────────────────────────────
export type LeagueId = "jjc" | "learner" | "sharp" | "odogwu" | "oga" | "agba";

export interface LeagueDef {
  id: LeagueId;
  name: string;
  min: number;
  /** exclusive upper bound, null for top league */
  max: number | null;
  color: string;
  reward: string;
  rewardCoins: number;
  /** Cosmetic granted to everyone who finishes a season in this league */
  rewardCosmetic?: string;
}

export const LEAGUES: readonly LeagueDef[] = [
  { id: "jjc", name: "JJC", min: 0, max: 1000, color: "#8C9A93", reward: "50 coins", rewardCoins: 50 },
  { id: "learner", name: "Learner", min: 1000, max: 1300, color: "#4FB3FF", reward: "150 coins", rewardCoins: 150 },
  { id: "sharp", name: "Sharp", min: 1300, max: 1600, color: "#0FA958", reward: "300 coins + Sharp frame", rewardCoins: 300, rewardCosmetic: "frame_sharp" },
  { id: "odogwu", name: "Odogwu", min: 1600, max: 1900, color: "#C77DFF", reward: "500 coins + Odogwu frame", rewardCoins: 500, rewardCosmetic: "frame_odogwu" },
  { id: "oga", name: "Oga at the Top", min: 1900, max: 2200, color: "#E8B44A", reward: "800 coins + Oga frame", rewardCoins: 800, rewardCosmetic: "frame_oga" },
  { id: "agba", name: "Agba", min: 2200, max: null, color: "#FF5E5B", reward: "1,500 coins + Agba crown", rewardCoins: 1500, rewardCosmetic: "frame_agba" },
] as const;

// ── Power-ups ──────────────────────────────────────────────────────────────
export type PowerUpKind = "fifty" | "extra_time" | "crowd" | "shield";

export interface PowerUpDef {
  kind: PowerUpKind;
  name: string;
  description: string;
  icon: string;
  cost: number;
}

export const POWER_UPS: readonly PowerUpDef[] = [
  { kind: "fifty", name: "50/50", description: "Removes two wrong options.", icon: "split", cost: 60 },
  { kind: "extra_time", name: "Extra Time", description: "Adds 5 seconds to the clock.", icon: "timer", cost: 50 },
  { kind: "crowd", name: "Ask the Crowd", description: "See how other players answered.", icon: "users", cost: 60 },
  { kind: "shield", name: "Shield", description: "Lose a match after a wrong answer? No rating loss.", icon: "shield", cost: 80 },
] as const;

// ── Avatars ────────────────────────────────────────────────────────────────
export interface AvatarDef {
  id: string;
  name: string;
  skin: string;
  bg: string;
  accent: string;
  hair: "gele" | "fila" | "afro" | "braids" | "low" | "cap" | "bun" | "locs";
}

export const AVATARS: readonly AvatarDef[] = [
  { id: "ada", name: "Ada", skin: "#8D5524", bg: "#0FA958", accent: "#E8B44A", hair: "gele" },
  { id: "tunde", name: "Tunde", skin: "#6B3E1F", bg: "#4FB3FF", accent: "#F4F6F5", hair: "fila" },
  { id: "zainab", name: "Zainab", skin: "#A86B3C", bg: "#C77DFF", accent: "#0B0F0D", hair: "bun" },
  { id: "emeka", name: "Emeka", skin: "#5A3418", bg: "#E8B44A", accent: "#0B0F0D", hair: "low" },
  { id: "bisi", name: "Bisi", skin: "#7A4520", bg: "#FF7A59", accent: "#F4F6F5", hair: "braids" },
  { id: "musa", name: "Musa", skin: "#94603A", bg: "#22D3EE", accent: "#0B0F0D", hair: "cap" },
  { id: "efe", name: "Efe", skin: "#4A2A14", bg: "#A3E635", accent: "#0B0F0D", hair: "afro" },
  { id: "ibk", name: "IBK", skin: "#6F3B1A", bg: "#F368E0", accent: "#F4F6F5", hair: "locs" },
] as const;

// ── Shop ───────────────────────────────────────────────────────────────────
export type ProductId =
  | "coins_small"
  | "coins_medium"
  | "coins_large"
  | "premium_monthly"
  | "premium_yearly"
  | "season_pass";

export interface ProductDef {
  id: ProductId;
  name: string;
  priceNaira: number;
  coins?: number;
  premiumDays?: number;
  kind: "coins" | "premium" | "pass";
  badge?: string;
}

export const PRODUCTS: readonly ProductDef[] = [
  { id: "coins_small", name: "Pouch of coins", priceNaira: 300, coins: 500, kind: "coins" },
  { id: "coins_medium", name: "Bag of coins", priceNaira: 1000, coins: 2000, kind: "coins", badge: "Popular" },
  { id: "coins_large", name: "Vault of coins", priceNaira: 5000, coins: 12000, kind: "coins", badge: "Best value" },
  { id: "premium_monthly", name: "Premium · Monthly", priceNaira: 1200, premiumDays: 30, kind: "premium" },
  { id: "premium_yearly", name: "Premium · Yearly", priceNaira: 10000, premiumDays: 365, kind: "premium", badge: "Save 30%" },
  { id: "season_pass", name: "Season Pass", priceNaira: 1500, kind: "pass" },
] as const;

export type CosmeticKind = "frame" | "button_theme";

export interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  name: string;
  cost: number;
  colors: [string, string];
  premiumOnly?: boolean;
  /** Not for sale: granted for finishing a season in this league */
  leagueReward?: LeagueId;
  /** Drawn with a crown on top of the avatar */
  crown?: boolean;
  /** Only for sale in the weeks it's featured in the shop (see `featuredCosmetics`) */
  rotating?: boolean;
}

export const COSMETICS: readonly CosmeticDef[] = [
  { id: "frame_ankara", kind: "frame", name: "Ankara", cost: 400, colors: ["#FF7A59", "#E8B44A"] },
  { id: "frame_eko", kind: "frame", name: "Eko Nights", cost: 600, colors: ["#4FB3FF", "#C77DFF"] },
  { id: "frame_greenwhite", kind: "frame", name: "Green-White", cost: 500, colors: ["#0FA958", "#F4F6F5"] },
  { id: "frame_premium", kind: "frame", name: "Premium Gold", cost: 0, colors: ["#E8B44A", "#FFF1C9"], premiumOnly: true },
  { id: "frame_sharp", kind: "frame", name: "Sharp", cost: 0, colors: ["#0FA958", "#7CF0B5"], leagueReward: "sharp" },
  { id: "frame_odogwu", kind: "frame", name: "Odogwu", cost: 0, colors: ["#C77DFF", "#F0D4FF"], leagueReward: "odogwu" },
  { id: "frame_oga", kind: "frame", name: "Oga at the Top", cost: 0, colors: ["#E8B44A", "#FF9F43"], leagueReward: "oga" },
  { id: "frame_agba", kind: "frame", name: "Agba Crown", cost: 0, colors: ["#FF5E5B", "#FFD166"], leagueReward: "agba", crown: true },
  { id: "btn_midnight", kind: "button_theme", name: "Midnight", cost: 300, colors: ["#1C2420", "#2A3530"] },
  { id: "btn_jollof", kind: "button_theme", name: "Jollof", cost: 450, colors: ["#3A1D12", "#5A2A16"] },
  { id: "btn_indigo", kind: "button_theme", name: "Adire Indigo", cost: 450, colors: ["#141B3A", "#1E2A5A"] },
  // Weekly drops: three of these are on sale each week, and each comes back every three weeks.
  { id: "frame_owambe", kind: "frame", name: "Owambe", cost: 550, colors: ["#F368E0", "#FFD166"], rotating: true },
  { id: "frame_asooke", kind: "frame", name: "Aso-Oke", cost: 650, colors: ["#7C2D12", "#F59E0B"], rotating: true },
  { id: "frame_danfo", kind: "frame", name: "Danfo", cost: 450, colors: ["#FACC15", "#1F2937"], rotating: true },
  { id: "frame_zuma", kind: "frame", name: "Zuma Rock", cost: 600, colors: ["#78716C", "#E7E5E4"], rotating: true },
  { id: "frame_lagoon", kind: "frame", name: "Lagoon", cost: 550, colors: ["#0EA5E9", "#34D399"], rotating: true },
  { id: "frame_harmattan", kind: "frame", name: "Harmattan", cost: 500, colors: ["#D6A35C", "#FDE7C4"], rotating: true },
  { id: "btn_palmwine", kind: "button_theme", name: "Palm Wine", cost: 400, colors: ["#2B2A1A", "#8F8A5C"], rotating: true },
  { id: "btn_suya", kind: "button_theme", name: "Suya", cost: 400, colors: ["#3B1A0E", "#9A3412"], rotating: true },
  { id: "btn_ofada", kind: "button_theme", name: "Ofada", cost: 450, colors: ["#1A2B14", "#3F6212"], rotating: true },
] as const;

// ── Missions ───────────────────────────────────────────────────────────────
export type MissionMetric = "matches_played" | "matches_won" | "correct_answers" | "daily_played" | "categories_played" | "fast_answers";

export interface MissionDef {
  slug: string;
  title: string;
  metric: MissionMetric;
  target: number;
  reward: number;
}

export const MISSION_POOL: readonly MissionDef[] = [
  { slug: "play3", title: "Play 3 clashes", metric: "matches_played", target: 3, reward: 25 },
  { slug: "win2", title: "Win 2 clashes", metric: "matches_won", target: 2, reward: 40 },
  { slug: "correct15", title: "Answer 15 questions right", metric: "correct_answers", target: 15, reward: 30 },
  { slug: "daily1", title: "Play today's Daily Naija", metric: "daily_played", target: 1, reward: 25 },
  { slug: "fast5", title: "Answer 5 correctly in under 3s", metric: "fast_answers", target: 5, reward: 50 },
  { slug: "win1", title: "Win a clash", metric: "matches_won", target: 1, reward: 25 },
  { slug: "play5", title: "Play 5 clashes", metric: "matches_played", target: 5, reward: 45 },
  { slug: "correct25", title: "Answer 25 questions right", metric: "correct_answers", target: 25, reward: 50 },
] as const;

export const REPORT_REASONS = [
  { id: "wrong_answer", label: "The answer is wrong" },
  { id: "unclear", label: "Question is unclear" },
  { id: "outdated", label: "Info is outdated" },
  { id: "typo", label: "Typo or grammar" },
  { id: "offensive", label: "Offensive or insensitive" },
  { id: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["id"];
export const AUTO_PAUSE_REPORT_COUNT = 5;
