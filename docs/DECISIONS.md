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

## Product & UX
19. **Two taps to a match.** New users: open → *Play as guest* starts searching immediately. Returning
    users: open → *Play Clash*. Guests get one ranked-style match (vs other guests or a bot, no rating),
    then are asked to sign in; signing in upgrades the same account in place (Supabase identity linking /
    dev `/auth/dev/upgrade`), so the free match's coins carry over.
20. **Bots** look like normal players during the match (name, avatar, state) but are always labelled
    *Practice opponent* on the result screen and in history. Bot wins give half state points
    (min 1) in addition to the half-K rating rule, so State Wars can't be farmed offline-ish.
21. **Reveal timing**: answer highlight lasts the specified 1.5 s; facts are also listed in the result
    breakdown so nothing is lost. Each round has a 0.9 s "Question n/7" intro; Q7 has a 1.8 s
    Double Wahala intro.
22. **Shared-element transition** is implemented as a coordinated hand-off: the face-off fades/shrinks
    while the compact score bar rises in with the same avatars (true cross-screen shared elements are
    not reliable on web).
23. **Daily chest**: one free chest per Lagos day (20 coins, 40 for Premium) — the brief's "double daily
    chest" benefit needed a base chest.
24. **Challenges**: free players can create 3 per 24 h; Premium unlimited. Challenges mirror ranked
    scoring (Q7 doubled). Finishing a challenge gives 10 coins + XP, and a `friend` match row is written
    when both the creator and the player have finished.
25. **Share links** point at server OpenGraph pages (`/l/c/:code`, `/l/s/:id`) so WhatsApp shows the
    card preview, then forward to the web app path (which is also the universal-link path).
26. **Season Pass** grants 3 of each power-up and the Eko Nights frame (the brief priced it but didn't
    define it).
27. **Rewarded ads** pay 25 coins, max 5 per day; interstitials only after every 3rd completed match,
    shown when leaving the result screen, never mid-match, never for Premium.
28. **Notifications**: the 7 pm WAT reminder is scheduled locally on the device (works offline and
    without push setup) and also sent by the server when a push token exists; the server enforces the
    max-one-marketing-notification-per-day rule via `notification_log`.
29. **Accessibility**: primary (green) buttons use white text, per the product owner's call (white on
    #0FA958 is ~3:1, which passes WCAG AA for large/bold text — button labels are bold). Gold buttons keep
    dark ink. Green used as *text* is a lighter/darker variant per theme. Correct/wrong answers always
    carry ✓/✕ icons and screen-reader labels.
30. **Web bundle**: web builds use Expo's tree shaking (`build:web`), and the client ships
    `@supabase/auth-js` instead of the full supabase-js (data never goes client → Supabase).
31. **Anti-cheat ban**: admins can mark a flagged account *banned*; banned accounts can't join the ranked
    queue (they keep their profile). Appeals are a manual process.
32. **League over level in the UI.** A player's league crest (JJC → Agba, from their rating) sits on the
    bottom-right of their avatar (40 px and up; smaller avatars keep the league-coloured ring), and the
    home/profile headers show the league name and progress to the next league instead of "Lv n". XP and
    levels still exist in the data but are no longer shown on those screens.
33. **Season rewards are actually paid.** At rollover every player with a ranked game gets their league's
    coins *and* its cosmetic: Sharp, Odogwu and Oga frames, and the Agba Crown (a frame drawn with a crown).
    These frames are not for sale; the shop shows "Finish a season in …" instead of a price.
34. **Gentler season reset: nobody drops more than one league.** JJC is pulled halfway up to 1000,
    Learner goes back to 1000, and Sharp and above move down exactly one league, keeping their place in
    the band (Agba lands no higher than 2199, the top of Oga). The rule lives in `seasonResetRating`
    (shared) with an equivalent SQL expression (`seasonResetSql`); a server test checks they agree for
    every rating from 0 to 3600.
35. **Season finishes are kept forever** in `season_results` (written before the reset) and shown as a
    "Season finishes" row of league crests on the profile.
36. **Question bank v2 (Oct 2026): ~1,720 questions across all 10 categories**, up from 600 in six. The
    four dormant categories (Pidgin, Proverbs & Languages, Naija Life, Tech & Business) are now active.
    The original 22 `in_review` questions were fact-checked: 17 promoted as-is, 5 corrected (an ambiguous
    distractor, a disputed song credit, a wrong source) and promoted. About 90 new questions I was less
    than certain of are seeded `in_review` for an editor to confirm in the admin CMS. Every source URL
    resolves. The local server now re-runs the (idempotent) seed whenever `seed.sql` changes; the seed
    can promote `in_review` → `live` and activate a category but never demotes or deactivates anything an
    admin changed.
37. **More ways to earn coins.** +50 for the first win of each Lagos day (ranked or practice, not guests).
    Daily Naija streaks pay a bonus each time they reach 3/7/14/30/60/100 days (30–1,000 coins). 17
    one-time achievements (`ACHIEVEMENTS` in shared) unlock on the event that earns them and are claimed
    for coins on the profile, like missions. Existing players are backfilled on their next Home load.
38. **Friends.** One `friendships` row per pair (pending → accepted); asking someone who already asked
    you accepts. Add friends by username search, from a match result or a challenge page. The Friends
    screen is a rating leaderboard with head-to-head records (ranked clashes + friend challenges). Your
    "rival" is the friend you've played most in 30 days (else your highest-rated friend). Direct
    challenges reuse friend challenges with a `target_id`; the friend is notified, and sees it on Home,
    only once the sender has played their round, so there is always a score to beat. Live friend-vs-friend
    rooms were not built; the in-match Rematch already covers live replays.
39. **State Wars pays out.** A finished week is settled once (idempotent, by `state_weeks`): the top 3
    states are recorded and every player who scored for them gets 200/100/50 coins plus a push. Every
    10 minutes (8am–10pm Lagos) the ranking is compared with a snapshot and fans of a state that loses a
    top-10 place get "X just overtook Y", at most once a day and inside the one-marketing-push cap.
40. **Themed weeks.** `themeFor(date)`: recurring special weeks (Love, Children's Day, June 12,
    Independence, Detty December) and otherwise a weekly rotation through the 10 categories. The featured
    category can't be banned and is always in a clash, fills 3 of the 10 Daily Naija slots, and special
    weeks pay 1.5x win coins plus a kickoff push. Events with moving dates (AFCON, Eid) need a dated entry
    added once the dates are announced; there is no admin UI for themes yet.
41. **Premium is worth more than its price.** On top of no ads, unlimited challenges, the double chest and
    the Gold frame, Premium now pays 1,500 coins every 30 days while active, includes the Season Pass
    every season (12 power-ups + Eko Nights frame) and gives 2 streak freezes a week instead of 1. Perks
    are paid lazily (on the Home request that finds them due, and right after a Premium purchase), so
    no cron is needed and a lapsed player simply stops receiving them. The Season Pass can't be bought
    while Premium is active. Freezes are now counted per Lagos week (`streaks.freezes_used`) and bridge
    one missed day each, so a Premium player can miss two days in a week without losing the streak.

