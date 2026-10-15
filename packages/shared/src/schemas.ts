import { z } from "zod";
import { CATEGORIES, STATES, AVATARS, REPORT_REASONS, POWER_UPS, PRODUCTS } from "./constants";
import { CHALLENGE_STAKES } from "./rules/engagement";
import { USERNAME_MIN, USERNAME_MAX, USERNAME_PATTERN, USERNAME_ERRORS, type Settings } from "./validation";

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN, USERNAME_ERRORS.short)
  .max(USERNAME_MAX, USERNAME_ERRORS.long)
  .regex(USERNAME_PATTERN, USERNAME_ERRORS.chars);

export const stateCodeSchema = z.enum(STATES.map((s) => s.code) as [string, ...string[]]);
export const avatarIdSchema = z.enum(AVATARS.map((a) => a.id) as [string, ...string[]]);
export const categorySlugSchema = z.enum(CATEGORIES.map((c) => c.slug) as [string, ...string[]]);

export const onboardingSchema = z.object({
  username: usernameSchema,
  avatarId: avatarIdSchema,
  stateCode: stateCodeSchema,
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const settingsSchema = z.object({
  theme: z.enum(["system", "dark", "light"]),
  sound: z.boolean(),
  haptics: z.boolean(),
  notifications: z.boolean(),
  dataSaver: z.boolean(),
  reduceMotion: z.boolean(),
  pidginFlavour: z.enum(["light", "full", "off"]),
  questionLanguage: z.enum(["en", "pcm"]),
}) satisfies z.ZodType<Settings>;

export const profilePatchSchema = z.object({
  avatarId: avatarIdSchema.optional(),
  stateCode: stateCodeSchema.optional(),
  frameId: z.string().nullable().optional(),
  buttonThemeId: z.string().nullable().optional(),
  settings: settingsSchema.partial().optional(),
  pushToken: z.string().max(300).nullable().optional(),
});

export const questionStatusSchema = z.enum(["draft", "in_review", "live", "retired", "paused"]);
export type QuestionStatus = z.infer<typeof questionStatusSchema>;

/** Authoring schema shared by the seed bank, admin editor and CSV import. */
export const questionInputSchema = z
  .object({
    category: categorySlugSchema,
    text: z.string().trim().min(10, "Question is too short").max(220, "Keep it under 220 characters"),
    options: z.array(z.string().trim().min(1, "Option can't be empty").max(80, "Option is too long")).length(4, "Exactly 4 options"),
    correctIndex: z.number().int().min(0).max(3),
    difficulty: z.number().int().min(1).max(5),
    fact: z.string().trim().min(10, "Add a short 'Did you know?' fact").max(200),
    sourceUrl: z.url("Source must be a valid URL"),
    imageUrl: z.url().nullable().optional(),
    status: questionStatusSchema.default("draft"),
  })
  .refine((q) => new Set(q.options.map((o) => o.toLowerCase())).size === 4, {
    message: "Options must be unique",
    path: ["options"],
  });
export type QuestionInput = z.input<typeof questionInputSchema>;

export const reportSchema = z.object({
  questionId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS.map((r) => r.id) as [string, ...string[]]),
  note: z.string().max(300).optional(),
  matchId: z.string().uuid().optional(),
});

export const purchaseSchema = z.object({
  productId: z.enum(PRODUCTS.map((p) => p.id) as [string, ...string[]]),
  platform: z.enum(["ios", "android", "web"]),
});

export const buyItemSchema = z.object({
  kind: z.enum(["power_up", "cosmetic", "streak_freeze"]),
  itemId: z.string(),
});

export const directChallengeSchema = z.object({
  stake: z
    .number()
    .int()
    .refine((n) => (CHALLENGE_STAKES as readonly number[]).includes(n), "Pick one of the stake amounts")
    .default(0),
});

export const powerUpKindSchema = z.enum(POWER_UPS.map((p) => p.kind) as [string, ...string[]]);

export const answerMessageSchema = z.object({
  questionId: z.string(),
  optionId: z.string(),
});

export const banMessageSchema = z.object({ categoryId: z.string() });

export const challengeAnswerSchema = z.object({
  index: z.number().int().min(0).max(9),
  optionId: z.string().nullable(),
});

export const offlineDailySubmitSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  answers: z
    .array(z.object({ index: z.number().int().min(0).max(49), optionId: z.string().max(64).nullable(), ms: z.number().min(0).max(600_000) }))
    .max(50),
});
