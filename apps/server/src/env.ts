import "dotenv/config";
import { fileURLToPath } from "node:url";

const num = (v: string | undefined, d: number) => (v ? Number(v) : d);

export const env = {
  port: num(process.env.PORT, 2567),
  /** Public base URL of this server (used for share links and images). */
  publicUrl: process.env.PUBLIC_SERVER_URL ?? `http://localhost:${num(process.env.PORT, 2567)}`,
  /** Public URL of the web app (deep links, challenge links). */
  appUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:8081",
  databaseUrl: process.env.DATABASE_URL || null,
  redisUrl: process.env.REDIS_URL || null,
  supabaseUrl: process.env.SUPABASE_URL || null,
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET || null,
  /** HS256 secret for dev / guest tokens issued by this server. */
  devJwtSecret: process.env.DEV_JWT_SECRET ?? "naija-trivia-clash-local-dev-secret-change-me",
  /** Emails that become admins on their first admin sign-in (must be confirmed in Supabase Auth). */
  adminEmails: (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
  allowDevAuth: process.env.ALLOW_DEV_AUTH ? process.env.ALLOW_DEV_AUTH === "true" : !process.env.SUPABASE_JWT_SECRET,
  pgliteDir: process.env.PGLITE_DIR ?? fileURLToPath(new URL("../.data/pglite", import.meta.url)),
  posthogKey: process.env.POSTHOG_KEY || null,
  sentryDsn: process.env.SENTRY_DSN || null,
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN || null,
  adminOrigins: (process.env.ADMIN_ORIGINS ?? "http://localhost:3000").split(","),
  isTest: process.env.NODE_ENV === "test" || !!process.env.VITEST,
};
