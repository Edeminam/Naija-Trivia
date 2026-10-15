import type { QuestionLocale } from "@ntc/shared";
import type { Translation } from "./types";
import { PCM } from "./pcm";

export type { Translation };

/** Translated questions per language, keyed by the English question text. English is the source. */
export const TRANSLATIONS: Partial<Record<Exclude<QuestionLocale, "en">, Record<string, Translation>>> = {
  pcm: PCM,
};
