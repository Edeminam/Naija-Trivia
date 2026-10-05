# Naija Trivia Clash — Implementation Plan

## 1. Architecture

```
┌──────────────────────────┐        ┌──────────────────────────────────────────┐
│ apps/mobile (Expo)       │  REST  │ apps/server (Node + Colyseus + Express)  │
│ iOS · Android · Web      │───────▶│  /api/*      profile, home, shop, daily,  │
│ Expo Router, NativeWind  │  WS    │              challenges, leaderboards     │
│ Zustand, TanStack Query  │───────▶│  MatchRoom   authoritative 1v1 rooms      │
└────────────┬─────────────┘        │  Matchmaker  Redis queue | in-memory      │
             │ Supabase Auth        │  /share/*    Satori → PNG share cards     │
             ▼                      │  /admin/*    CMS + moderation API         │
┌──────────────────────────┐        └──────────────┬───────────────────────────┘
│ Supabase                 │◀── service role / ────┘
│ Auth · Postgres · RLS ·  │    direct Postgres        ▲
│ Storage                  │                           │ REST (admin token)
└──────────────────────────┘        ┌──────────────────┴──────────────┐
                                    │ apps/admin (Next.js + shadcn/ui) │
                                    └─────────────────────────────────┘
```

* **Server is the single writer.** All game-economy writes (coins, XP, rating, state points,
  purchases, daily entries) happen on the server inside SQL transactions. Clients read/write
  through the server API; RLS is enabled on every table as defence in depth
  (clients may only `select` their own rows / public reference data).
* **Local-first dev.** With no `DATABASE_URL`, the server boots an embedded Postgres (PGlite),
  applies `/supabase/migrations/*.sql` plus a small `auth` schema shim, and loads `supabase/seed.sql`.
  With no Supabase keys, auth falls back to server-issued dev JWTs. With no `REDIS_URL`, the
  matchmaking queue is in-memory. `pnpm dev` therefore works on a clean laptop.
* **Auth.** Production: Supabase Auth (phone OTP +234, Google, Apple; guests via anonymous sign-in).
  The server verifies Supabase JWTs (`SUPABASE_JWT_SECRET`). Dev: `/api/auth/dev` issues HS256 JWTs.

## 2. Folder structure

```
apps/
  mobile/        Expo Router app (src/app routes, src/ui components, src/features, src/lib, src/theme)
  server/        src/index.ts, rooms/MatchRoom.ts, matchmaking/, game/, db/, api/, share/, services/
  admin/         Next.js App Router (app/(auth), app/(dashboard)/questions|review|reports|import|stats)
packages/
  shared/        types, zod schemas, constants (categories, states, leagues, products), rules
                 (scoring, elo, leagues, matchmaking, selection, xp, coins), wire protocol
  content/       seed question bank (600) + generator for supabase/seed.sql
supabase/
  migrations/    0001_schema.sql, 0002_rls.sql, 0003_views_rpcs.sql
  seed.sql       generated
docs/            PLAN.md, DECISIONS.md, CREDITS.md
```

## 3. Data model

Tables (all RLS-enabled): `profiles`, `states`, `categories`, `questions`, `matches`, `match_answers`,
`challenges`, `challenge_entries`, `daily_sets`, `daily_entries`, `streaks`, `missions`, `user_missions`,
`inventory`, `purchases`, `state_weekly_points`, `seasons`, `question_reports`, `seen_questions`,
`avatars`, `anticheat_flags`, `user_settings`.

Views / RPCs: `state_weekly_leaderboard(week)`, `state_top_players(state, week)`,
`daily_leaderboard(date, state?)`, `user_category_stats(user)`.

Key indexes: `state_weekly_points(week_start, points desc)`, `daily_entries(daily_date, score desc)`,
`match_answers(user_id, created_at)`, `seen_questions(user_id, seen_at)`, `questions(status, category_id, difficulty)`.

## 4. API contracts (REST, JSON, bearer JWT)

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/dev | dev-only sign in (username) → JWT |
| GET | /api/me | profile + settings + inventory summary |
| POST | /api/me/onboarding | username, avatar, state |
| GET | /api/username-available?u= | live availability |
| PATCH | /api/me | update avatar/state/settings |
| DELETE | /api/me | delete account |
| GET | /api/home | missions, daily status, state rank, streak |
| GET | /api/leagues | league, rating, season, rewards |
| GET | /api/state-wars?week= | 38-team leaderboard; /api/state-wars/:code top 20 |
| GET/POST | /api/daily, /api/daily/answer, /api/daily/leaderboard | Daily Naija |
| POST | /api/challenges; GET /api/challenges/:code; POST /api/challenges/:code/answer | Friend challenge |
| GET | /api/profile/:id/stats, /api/me/matches | stats + history |
| GET | /api/shop; POST /api/shop/purchase; POST /api/shop/buy-item | shop + mock IAP |
| POST | /api/reports | report question |
| GET | /share/match/:id.png, /share/challenge/:code.png | 1080×1920 share card |
| * | /admin/* | admin CMS (questions, review, import, reports, stats, flags) |

## 5. Socket contract (Colyseus `match` room)

Join options: `{ token, mode: "ranked" | "guest" }`. Matchmaking is done by a `Matchmaker`
service (Redis/in-memory queue) via the `queue` room → server reserves a seat in a `match` room and
sends `matched { roomId, reservation }`.

Room state (schema): `phase` (`waiting|banning|question|reveal|result`), `round`, `deadline`,
`players` map (`id, username, avatarId, stateCode, rating, league, score, answered, connected, isBot`),
`banOptions[]`, `bans` map.

Server → client messages: `question { round, questionId, text, options[{id,text}], category, deadlineAt, serverNow, doubleWahala }`,
`reveal { correctOptionId, answers{playerId:{optionId, points, ms}}, fact }`, `result { … rating/coin/xp/state deltas … }`,
`powerup { kind, payload }`.
Client → server: `ban { categoryId }`, `answer { questionId, optionId }`, `powerup { kind }`.

## 6. Screens (Expo Router)

`index` (splash) · `onboarding/{intro,auth,otp,username,avatar,state}` · `(tabs)/{home,leagues,state-wars,shop,profile}` ·
`match/{search,ban,play,result}` · `challenge/{new,[code]}` · `daily/{index,play,result}` · `state/[code]` ·
`settings` · `report` (sheet) · `dev/gallery`.

## 7. Milestones

1. Scaffold, shared rules + tests, migrations + seed, tokens + UI library + gallery.
2. Auth, onboarding, home, profile.
3. Server rooms, matchmaking, bot, question/reveal/result.
4. Friend Challenge, Daily Naija, streaks, missions, economy.
5. Leagues, State Wars + map, share cards.
6. Shop + mock purchases, ads mock, settings, notifications.
7. Admin dashboard.
8. Polish, accessibility, performance, tests, README.
