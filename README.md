# Naija Trivia Clash 🇳🇬

Real-time 1v1 trivia battles on Nigerian culture — Nollywood, Afrobeats, football, history, geography and food.
Every ranked win adds points to your home state in the weekly **State Wars**.

| | |
|---|---|
| `apps/mobile` | Expo (SDK 57) + React Native + Expo Router, NativeWind, Reanimated, Zustand, TanStack Query. Runs on iOS, Android and web. |
| `apps/server` | Node + TypeScript + Colyseus (match rooms), Express REST API, Satori share cards. Redis queue or in-memory. |
| `apps/admin` | Next.js 16 (App Router) + Tailwind 4 + shadcn/ui — question CMS, review queue, CSV import, reports, fair-play flags. |
| `packages/shared` | Types, zod schemas, constants and all game rules (scoring, Elo, leagues, matchmaking, question selection). |
| `packages/content` | The 600-question seed bank and the `supabase/seed.sql` generator. |
| `supabase/` | SQL migrations (schema, RLS on every table, leaderboard/stats RPCs) and generated seed. |

Docs: [`docs/PLAN.md`](docs/PLAN.md) (architecture, contracts) · [`docs/DECISIONS.md`](docs/DECISIONS.md) · [`docs/CREDITS.md`](docs/CREDITS.md)

---

## Quick start (no accounts or keys needed)

Requirements: **Node 20+** and **pnpm 9** (`npm i -g pnpm@9` or `corepack enable`).

```bash
pnpm install
pnpm dev
```

That starts three things:

| | URL | Notes |
|---|---|---|
| Game server | http://localhost:2567 | Embedded Postgres (PGlite) in `apps/server/.data`; migrations + 600 questions load on first boot. In-memory matchmaking. |
| Mobile app (Expo) | http://localhost:8081 | Press `w` for web, `i`/`a` for simulators, or scan the QR with a development build. |
| Admin | http://localhost:3000 | Click **Sign in as local admin**. |

Without Supabase keys the app shows **Quick sign-in (dev)**; guests can always tap **Play as guest**.

**Play a ranked match against yourself:** open http://localhost:8081 in two browser windows (one normal,
one private), sign in with two usernames, and tap **Play Clash** in both within 5 seconds. Otherwise you
get a labelled *Practice opponent* after 5 s.

**Populate leaderboards locally:** `curl -X POST localhost:2567/api/dev/demo-data` adds ~90 demo players
with weekly State Wars points and Daily Naija scores (dev auth only).

**Reset local data:** stop the server and delete `apps/server/.data`.

### Running on a phone
Native modules (Reanimated 4, SVG, haptics, notifications, Apple sign-in) need a development build:
`cd apps/mobile && npx expo run:ios` / `npx expo run:android`, or `eas build --profile development`.
The app finds the server on the same machine automatically (`<metro host>:2567`).

---

## Tests

```bash
pnpm test                                # everything below
pnpm --filter @ntc/shared test           # scoring, Elo, matchmaking widening, question selection, deadlines, leagues, time
pnpm --filter @ntc/content test          # 600 questions: schema, counts, duplicates, difficulty spread
pnpm --filter @ntc/server test           # e2e: two clients play a full ranked match; bot fallback; late-answer rejection
pnpm --filter @ntc/mobile test           # React Native Testing Library: AnswerButton, Button, CircularTimer, phone parsing
pnpm --filter @ntc/admin test:e2e        # Playwright smoke: sign in → create → search → CSV import → approve
pnpm --filter @ntc/content check-sources # verifies every question's source URL resolves
pnpm typecheck
```

---

## Environment variables

Copy the examples (all values optional for local dev):

```bash
cp apps/server/.env.example apps/server/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/admin/.env.example  apps/admin/.env.local
```

**Server** (`apps/server/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | HTTP + WebSocket port (default 2567) |
| `PUBLIC_SERVER_URL` | Public URL of the server (share images, OpenGraph link pages) |
| `PUBLIC_APP_URL` | Public URL of the web app (challenge links) |
| `DATABASE_URL` | Supabase Postgres connection string (transaction pooler). Empty → embedded PGlite |
| `SUPABASE_URL`, `SUPABASE_JWT_SECRET` | Verify Supabase access tokens (HS256 secret or the project's JWKS). Setting the secret disables dev auth |
| `DEV_JWT_SECRET` | Signing secret for dev/guest tokens issued by the server |
| `REDIS_URL` | Matchmaking queue in Redis (needed for more than one server instance) |
| `POSTHOG_KEY`, `POSTHOG_HOST`, `SENTRY_DSN` | Optional analytics / error reporting (no-op when empty) |
| `EXPO_ACCESS_TOKEN` | Optional, for Expo push notifications |

**Mobile** (`EXPO_PUBLIC_*`): `SERVER_URL`, `APP_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PURCHASES` (`mock`|`live`), `POSTHOG_KEY`, `SENTRY_DSN`.
**Admin** (`NEXT_PUBLIC_*`): `SERVER_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

---

## Supabase setup (production)

1. Create a project. In **Auth → Providers** enable Phone (with an SMS provider such as Twilio or Termii),
   Google, Apple, and **Anonymous sign-ins** (used for guests).
2. Apply the schema: `supabase link --project-ref <ref> && supabase db push`, or paste the files in
   `supabase/migrations/` into the SQL editor in order.
3. Load content: run `supabase/seed.sql` (regenerate it with `pnpm seed:generate` after editing the bank).
4. Make yourself an admin: `update profiles set is_admin = true where id = '<your auth user id>';`
   (create an email/password user in **Auth → Users** for the admin dashboard).
5. Set the server's `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_JWT_SECRET`, and the clients'
   `SUPABASE_URL` + anon key.

RLS is enabled on every table. Clients only ever read their own rows and public reference data; the
`questions` and `daily_sets` tables have no client policies, so answers can't leak from a device. All
writes happen on the server.

---

## Deployment

**Game server → Fly.io** (or Railway; any Docker host)
```bash
fly launch --no-deploy --copy-config   # uses ./fly.toml and apps/server/Dockerfile
fly secrets set DATABASE_URL=... SUPABASE_URL=... SUPABASE_JWT_SECRET=... REDIS_URL=... PUBLIC_SERVER_URL=https://... PUBLIC_APP_URL=https://...
fly deploy
```
Matches live in memory on a machine, so keep `min_machines_running = 1` and disable auto-stop. To run
several machines, set `REDIS_URL` (shared queue + single-flight pairing lock) and add Colyseus'
Redis presence/driver so seat reservations can cross machines.
Railway: create a service from the repo with the Dockerfile path `apps/server/Dockerfile`.

**Admin → Vercel**: import the repo, root directory `apps/admin`, framework Next.js, set the
`NEXT_PUBLIC_*` variables.

**Web app → Vercel/Netlify**: root `apps/mobile`, build `pnpm build:web`, output `dist-web`
(`apps/mobile/vercel.json` includes the SPA rewrite so `/c/CODE` deep links work).

**Mobile → Expo EAS**
```bash
cd apps/mobile
npx eas-cli@latest init                       # creates the EAS project id (also enables push tokens)
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform all
npx eas-cli@latest update                     # over-the-air JS updates
```
Universal/app links are configured for `naijatrivia.app` (`/c/*`, `/s/*`). Host
`apple-app-site-association` and `assetlinks.json` on that domain when you have the store builds.

---

## Adding questions

- **Admin → New question**: the editor validates with the shared zod schema and shows a live preview of
  the mobile card. Save as *Draft* or *In review*; reviewers approve from **Review queue** (goes live).
- **Admin → CSV import**: download the template, paste or upload, and fix the per-row errors shown in the
  preview. Valid rows import as *In review* (or Draft).
  Columns: `category,text,option_a,option_b,option_c,option_d,correct,difficulty,fact,source_url`
  (`correct` is A–D or 1–4; `category` is one of `nollywood, afrobeats, football, history, geography, food, pidgin, proverbs, naija-life, tech-business`).
- **Seed bank (code)**: add entries to `packages/content/src/bank/*.ts` with `q(...)` (live) or `u(...)`
  (in review), write the correct option first (the generator shuffles), then run
  `pnpm --filter @ntc/content test && pnpm seed:generate`.
- Categories without enough live questions (Pidgin, Proverbs, Naija Life, Tech) start inactive. Flip
  `categories.active` once each has ~30+ live questions.

Players can report questions from the reveal and result screens; 5 reports pause a question
automatically until an admin reviews it under **Reports**.
