import { z } from "zod";
import { CATEGORIES, STATES, AVATARS, REPORT_REASONS, POWER_UPS, PRODUCTS } from "./constants";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .max(16, "16 characters max")
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and _ only");

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
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  sound: true,
  haptics: true,
  notifications: false,
  dataSaver: false,
  reduceMotion: false,
  pidginFlavour: "light",
};

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
  kind: z.enum(["power_up", "cosmetic"]),
  itemId: z.string(),
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
