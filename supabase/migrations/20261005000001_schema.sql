-- Naija Trivia Clash — core schema
-- All writes to game-economy tables happen from the game server using the service role.


-- ── Enums ──────────────────────────────────────────────────────────────────
do $$ begin
  create type question_status as enum ('draft', 'in_review', 'live', 'paused', 'retired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_type as enum ('ranked', 'friend', 'daily', 'bot');
exception when duplicate_object then null; end $$;

-- ── Reference data ─────────────────────────────────────────────────────────
create table if not exists states (
  code text primary key,
  name text not null,
  region text not null
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null,
  tint text not null default '#0FA958',
  sort int not null default 0,
  active boolean not null default true
);

create table if not exists avatars (
  id text primary key,
  name text not null,
  skin text not null,
  bg text not null,
  accent text not null,
  hair text not null
);

create table if not exists seasons (
  id serial primary key,
  number int not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);

-- ── Profiles ───────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  avatar_id text not null default 'ada' references avatars (id),
  state_code text references states (code),
  level int not null default 1,
  xp int not null default 0 check (xp >= 0),
  coins int not null default 200 check (coins >= 0),
  rating int not null default 1000 check (rating >= 0),
  league text not null default 'learner',
  ranked_games int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  premium_until timestamptz,
  is_guest boolean not null default false,
  is_admin boolean not null default false,
  guest_match_used boolean not null default false,
  frame_id text,
  button_theme_id text,
  settings jsonb not null default '{}'::jsonb,
  push_token text,
  free_powerup_date date,
  chest_date date,
  matches_since_ad int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower on profiles (lower(username)) where username is not null;
create index if not exists profiles_state on profiles (state_code);
create index if not exists profiles_rating on profiles (rating desc);

-- Auto-create a profile row for every new auth user (Supabase Auth or dev shim).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, is_guest)
  values (new.id, coalesce((to_jsonb(new) ->> 'is_anonymous')::boolean, false))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Questions ──────────────────────────────────────────────────────────────
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id),
  format text not null default 'mcq',
  text text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_index int not null check (correct_index between 0 and 3),
  difficulty int not null check (difficulty between 1 and 5),
  fact text not null default '',
  image_url text,
  source_url text,
  author_id uuid references profiles (id) on delete set null,
  reviewer_id uuid references profiles (id) on delete set null,
  reviewer_notes text,
  status question_status not null default 'draft',
  times_shown int not null default 0,
  times_correct int not null default 0,
  avg_ms int not null default 0,
  option_picks int[] not null default '{0,0,0,0}',
  report_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists questions_pick on questions (status, category_id, difficulty);
create index if not exists questions_text_search on questions using gin (to_tsvector('english', text));

-- ── Matches ────────────────────────────────────────────────────────────────
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  type match_type not null,
  player_a uuid not null references profiles (id) on delete cascade,
  player_b uuid references profiles (id) on delete set null,
  is_bot boolean not null default false,
  bot_name text,
  bot_rating int,
  winner uuid,
  score_a int not null default 0,
  score_b int not null default 0,
  rating_delta_a int not null default 0,
  rating_delta_b int not null default 0,
  categories text[] not null default '{}',
  season_id int references seasons (id),
  created_at timestamptz not null default now()
);

create index if not exists matches_player_a on matches (player_a, created_at desc);
create index if not exists matches_player_b on matches (player_b, created_at desc);

-- Every answered question across ranked matches, Daily Naija and challenges.
create table if not exists match_answers (
  id bigint generated always as identity primary key,
  match_id uuid references matches (id) on delete cascade,
  mode text not null default 'match',
  user_id uuid not null references profiles (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  category_id uuid references categories (id),
  round int not null,
  option_index int,
  correct boolean not null,
  points int not null default 0,
  ms int not null,
  created_at timestamptz not null default now()
);

create index if not exists match_answers_user on match_answers (user_id, created_at desc);
create index if not exists match_answers_match on match_answers (match_id);
create index if not exists match_answers_fast on match_answers (user_id, created_at) where correct and ms < 400;

-- ── Friend challenges ──────────────────────────────────────────────────────
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references profiles (id) on delete cascade,
  question_ids uuid[] not null,
  categories text[] not null default '{}',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists challenges_creator on challenges (created_by, created_at desc);

create table if not exists challenge_entries (
  challenge_id uuid not null references challenges (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  current_index int not null default 0,
  served_at timestamptz,
  score int not null default 0,
  correct int not null default 0,
  total_ms int not null default 0,
  answers jsonb not null default '[]'::jsonb,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

-- ── Daily Naija ────────────────────────────────────────────────────────────
create table if not exists daily_sets (
  daily_date date primary key,
  question_ids uuid[] not null,
  created_at timestamptz not null default now()
);

create table if not exists daily_entries (
  daily_date date not null references daily_sets (daily_date) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  state_code text references states (code),
  current_index int not null default 0,
  served_at timestamptz,
  score int not null default 0,
  correct int not null default 0,
  total_ms int not null default 0,
  answers jsonb not null default '[]'::jsonb,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (daily_date, user_id)
);

create index if not exists daily_entries_rank on daily_entries (daily_date, score desc, total_ms asc) where finished_at is not null;
create index if not exists daily_entries_state_rank on daily_entries (daily_date, state_code, score desc, total_ms asc) where finished_at is not null;

create table if not exists streaks (
  user_id uuid primary key references profiles (id) on delete cascade,
  current int not null default 0,
  best int not null default 0,
  last_date date,
  freeze_used_week date,
  updated_at timestamptz not null default now()
);

-- ── Missions ───────────────────────────────────────────────────────────────
create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  metric text not null,
  target int not null,
  reward int not null check (reward between 25 and 50),
  active boolean not null default true
);

create table if not exists user_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  mission_id uuid not null references missions (id) on delete cascade,
  mission_date date not null,
  progress int not null default 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  unique (user_id, mission_id, mission_date)
);

create index if not exists user_missions_day on user_missions (user_id, mission_date);

-- ── Economy ────────────────────────────────────────────────────────────────
create table if not exists inventory (
  user_id uuid not null references profiles (id) on delete cascade,
  item_id text not null,
  kind text not null check (kind in ('power_up', 'cosmetic')),
  quantity int not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- Mock purchases (real IAP / Paystack adapters will write the same rows).
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  product_id text not null,
  platform text not null,
  amount_naira int not null,
  provider text not null default 'mock',
  status text not null default 'completed',
  receipt text,
  created_at timestamptz not null default now()
);

create index if not exists purchases_user on purchases (user_id, created_at desc);

-- ── State Wars ─────────────────────────────────────────────────────────────
create table if not exists state_weekly_points (
  week_start date not null,
  state_code text not null references states (code),
  user_id uuid not null references profiles (id) on delete cascade,
  points int not null default 0,
  wins int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (week_start, state_code, user_id)
);

create index if not exists swp_week_state on state_weekly_points (week_start, state_code, points desc);

-- ── Moderation & fairness ──────────────────────────────────────────────────
create table if not exists question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions (id) on delete cascade,
  user_id uuid references profiles (id) on delete set null,
  reason text not null,
  note text,
  match_id uuid,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (question_id, user_id)
);

create index if not exists question_reports_open on question_reports (status, question_id);

create table if not exists seen_questions (
  user_id uuid not null references profiles (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists seen_questions_recent on seen_questions (user_id, seen_at desc);

create table if not exists anticheat_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  flag_date date not null,
  fast_correct int not null,
  status text not null default 'open' check (status in ('open', 'cleared', 'banned')),
  created_at timestamptz not null default now(),
  unique (user_id, flag_date)
);

create table if not exists notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null,
  marketing boolean not null default false,
  sent_at timestamptz not null default now()
);

create index if not exists notification_log_user on notification_log (user_id, sent_at desc);
