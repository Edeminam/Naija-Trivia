export const BOT_MIN_DELAY_MS = 2_000;
export const BOT_MAX_DELAY_MS = 8_000;

/** Probability the bot answers correctly: stronger bots and easier questions → higher accuracy. */
export function botAccuracy(rating: number, difficulty: number): number {
  const p = 0.6 + (rating - 1000) / 2500 - (difficulty - 3) * 0.08;
  return Math.max(0.2, Math.min(0.92, p));
}

/** Delay before the bot answers; stronger bots lean faster. */
export function botDelayMs(rating: number, rand: () => number = Math.random): number {
  const skew = Math.max(0, Math.min(1, (rating - 800) / 1600)); // 0 slow … 1 fast
  const r = rand() * (1 - skew * 0.5);
  return Math.round(BOT_MIN_DELAY_MS + r * (BOT_MAX_DELAY_MS - BOT_MIN_DELAY_MS));
}

const BOT_NAMES = ["Kunle_Bot", "Amaka_Bot", "Sadiq_Bot", "Tamuno_Bot", "Ebi_Bot", "Halima_Bot", "Chidi_Bot", "Yemi_Bot"];

export function botName(rand: () => number = Math.random): string {
  return BOT_NAMES[Math.floor(rand() * BOT_NAMES.length)]!;
}
