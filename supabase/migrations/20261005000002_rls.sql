-- Row Level Security on every table.
-- Clients (anon/authenticated) get read-only access to their own rows and public reference data.
-- All writes go through the game server, which uses the service role (bypasses RLS).
-- Tables holding answers (questions, daily_sets, challenges.question_ids) are never readable by clients.

alter table states enable row level security;
alter table categories enable row level security;
alter table avatars enable row level security;
alter table seasons enable row level security;
alter table profiles enable row level security;
alter table questions enable row level security;
alter table matches enable row level security;
alter table match_answers enable row level security;
alter table challenges enable row level security;
alter table challenge_entries enable row level security;
alter table daily_sets enable row level security;
alter table daily_entries enable row level security;
alter table streaks enable row level security;
alter table missions enable row level security;
alter table user_missions enable row level security;
alter table inventory enable row level security;
alter table purchases enable row level security;
alter table state_weekly_points enable row level security;
alter table question_reports enable row level security;
alter table seen_questions enable row level security;
alter table anticheat_flags enable row level security;
alter table notification_log enable row level security;

-- Public reference data
drop policy if exists "states readable" on states;
create policy "states readable" on states for select to anon, authenticated using (true);
drop policy if exists "categories readable" on categories;
create policy "categories readable" on categories for select to anon, authenticated using (true);
drop policy if exists "avatars readable" on avatars;
create policy "avatars readable" on avatars for select to anon, authenticated using (true);
drop policy if exists "seasons readable" on seasons;
create policy "seasons readable" on seasons for select to anon, authenticated using (true);
drop policy if exists "missions readable" on missions;
create policy "missions readable" on missions for select to anon, authenticated using (active);
drop policy if exists "state points readable" on state_weekly_points;
create policy "state points readable" on state_weekly_points for select to anon, authenticated using (true);

-- Own rows only
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for select to authenticated using (id = auth.uid());
drop policy if exists "own matches" on matches;
create policy "own matches" on matches for select to authenticated using (auth.uid() in (player_a, player_b));
drop policy if exists "own answers" on match_answers;
create policy "own answers" on match_answers for select to authenticated using (user_id = auth.uid());
drop policy if exists "own challenges" on challenges;
create policy "own challenges" on challenges for select to authenticated using (created_by = auth.uid());
drop policy if exists "own challenge entries" on challenge_entries;
create policy "own challenge entries" on challenge_entries for select to authenticated using (user_id = auth.uid());
drop policy if exists "own daily entries" on daily_entries;
create policy "own daily entries" on daily_entries for select to authenticated using (user_id = auth.uid());
drop policy if exists "own streak" on streaks;
create policy "own streak" on streaks for select to authenticated using (user_id = auth.uid());
drop policy if exists "own missions" on user_missions;
create policy "own missions" on user_missions for select to authenticated using (user_id = auth.uid());
drop policy if exists "own inventory" on inventory;
create policy "own inventory" on inventory for select to authenticated using (user_id = auth.uid());
drop policy if exists "own purchases" on purchases;
create policy "own purchases" on purchases for select to authenticated using (user_id = auth.uid());
drop policy if exists "own reports" on question_reports;
create policy "own reports" on question_reports for select to authenticated using (user_id = auth.uid());
drop policy if exists "own seen" on seen_questions;
create policy "own seen" on seen_questions for select to authenticated using (user_id = auth.uid());

-- questions, daily_sets, anticheat_flags, notification_log: no client policies (server only).
