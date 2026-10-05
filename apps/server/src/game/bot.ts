import { AVATARS, STATES, botName, botRating, botAccuracy, botDelayMs, leagueForRating } from "@ntc/shared";
import { randomBytes } from "node:crypto";

export interface BotProfile {
  id: string;
  username: string;
  avatarId: string;
  stateCode: string;
  rating: number;
  level: number;
}

export function makeBot(opponentRating: number): BotProfile {
  const states = STATES.filter((s) => s.code !== "DI");
  const rating = botRating(opponentRating);
  return {
    id: `bot:${randomBytes(4).toString("hex")}`,
    username: botName(),
    avatarId: AVATARS[Math.floor(Math.random() * AVATARS.length)]!.id,
    stateCode: states[Math.floor(Math.random() * states.length)]!.code,
    rating,
    level: Math.max(1, Math.round((rating - 600) / 60)),
  };
}

/** Decide what the bot will answer for a question and when. */
export function planBotAnswer(bot: BotProfile, difficulty: number, optionIds: string[], correctId: string) {
  const correct = Math.random() < botAccuracy(bot.rating, difficulty);
  const wrong = optionIds.filter((id) => id !== correctId);
  return {
    delayMs: botDelayMs(bot.rating),
    optionId: correct ? correctId : wrong[Math.floor(Math.random() * wrong.length)]!,
  };
}

export const botLeague = (b: BotProfile) => leagueForRating(b.rating).id;
