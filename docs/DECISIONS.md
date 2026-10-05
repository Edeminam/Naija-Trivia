# Decisions

Decisions made where the brief left room, or where a constraint forced a choice. Newest at the bottom.

## Architecture
1. **Server is the only writer.** Mobile and admin call the game server (REST + Colyseus); the server
   writes Postgres in transactions. Clients never touch Supabase tables directly (except Supabase Auth).
   RLS is still enabled on every table: clients can only `select` their own rows and public reference
   data, and the `questions`/`daily_sets` tables have *no* client policies, so correct answers can
   never be read from a device.
2. **Direct Postgres instead of supabase-js on the server.** The server connects with `DATABASE_URL`
   (Supabase's pooled connection string, as the `postgres` role — equivalent to the service role and
   bypasses RLS). This lets match results be written in one real SQL transaction (`BEGIN … COMMIT`)
   which the REST client cannot do.
3. **Zero-config local dev.** If `DATABASE_URL` is missing the server runs an embedded Postgres
   (PGlite, persisted to `apps/server/.data`), applies `/supabase/migrations` on boot together with a
   small `auth` schema shim (`auth.users`, `auth.uid()`, roles), and loads `supabase/seed.sql`.
   Same SQL, same RPCs, same RLS definitions as production.
4. **Auth.** Production uses Supabase Auth (phone OTP with +234 default, Google, Apple; guests via
   Supabase anonymous sign-in). The server verifies Supabase JWTs with `SUPABASE_JWT_SECRET`
   (or the project JWKS). Without Supabase keys the app shows a "Quick sign-in (dev)" option that
   calls `POST /api/auth/dev`, which issues HS256 JWTs. Guest play works in both modes.
5. **Matchmaking queue** uses Redis (sorted set + hash) when `REDIS_URL` is set, else an in-memory
   queue. Matching logic itself lives in `packages/shared` and is identical for both.
6. **Shared package consumed as TypeScript source** (no build step). Metro, Next (`transpilePackages`),
   tsx and Vitest all compile it directly; the server production build bundles it with tsup.

## Game rules interpretations
7. **Ban step with 4 categories.** Each player bans one. If both ban the same category, 3 remain;
   if different, 2 remain. Questions are drawn evenly from whatever remains.
8. **Points use the base 10s window.** `remainingMs` is clamped to 10,000 so Extra Time gives more
   time but not more points (max 200, or 400 on Double Wahala).
9. **Tie-break time** = sum of answer times, with timeouts/missed questions counted as the full window.
10. **Draws** give 35 XP (between win 50 and loss 20); the brief didn't specify draw XP.
11. **Shield**: once activated it absorbs the player's next wrong/timed-out answer. If the player
    then loses the match, their rating loss is cancelled (rating delta floored at 0). Opponent's
    rating change is unaffected.
12. **Matchmaking window**: two players pair if their rating gap fits the *wider* of their two windows,
    so long-waiting players get matched sooner.
13. **Question ordering**: the 7 picked questions are sorted easy → hard, so Double Wahala (Q7) gets
    one of the harder picks.
14. **Difficulty target** below 1000 rating continues the linear mapping (e.g. 600 → 1).
15. **Weeks** for State Wars run Monday 00:00 → Sunday 23:59 WAT. Seasons are 28 days and start on a
    Monday; season 1 starts 28 Sep 2026.
16. **Question status `paused`** was added to the enum (alongside draft/in_review/live/retired) for
    automatic pausing at ≥ 5 reports, so paused questions are distinguishable from retired ones.

## Content
17. 600 seed questions (100 × Nollywood, Afrobeats, Football, History, Geography, Food). Each has
    a source URL; every URL was verified to resolve with `pnpm --filter @ntc/content check-sources`.
    22 questions I was less than certain about are seeded as `in_review` instead of `live`.
18. The 4 categories without seeded content (Pidgin, Proverbs, Naija Life, Tech) exist but start
    `active = false`; they turn on in the admin once they have enough live questions.
