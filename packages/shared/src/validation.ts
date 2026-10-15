// Zod-free rules and types the app needs at runtime. The zod schemas in schemas.ts are built from these,
// so the mobile bundle can validate without shipping zod (~500 KB on web).

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 16;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export const USERNAME_ERRORS = {
  short: "At least 3 characters",
  long: "16 characters max",
  chars: "Letters, numbers and _ only",
} as const;

/** The first problem with a username (after trimming), or null if it's valid. */
export function usernameError(raw: string): string | null {
  const name = raw.trim();
  if (name.length < USERNAME_MIN) return USERNAME_ERRORS.short;
  if (name.length > USERNAME_MAX) return USERNAME_ERRORS.long;
  if (!USERNAME_PATTERN.test(name)) return USERNAME_ERRORS.chars;
  return null;
}

/** Languages questions can be shown in. English is the source; others fall back to English per question. */
export type QuestionLocale = "en" | "pcm";
export const QUESTION_LOCALES: readonly { id: QuestionLocale; name: string }[] = [
  { id: "en", name: "English" },
  { id: "pcm", name: "Pidgin" },
];

export interface Settings {
  theme: "system" | "dark" | "light";
  sound: boolean;
  haptics: boolean;
  notifications: boolean;
  dataSaver: boolean;
  reduceMotion: boolean;
  pidginFlavour: "light" | "full" | "off";
  /** Language questions are shown in, where a translation exists */
  questionLanguage: QuestionLocale;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  sound: true,
  haptics: true,
  notifications: false,
  dataSaver: false,
  reduceMotion: false,
  pidginFlavour: "light",
  questionLanguage: "en",
};
