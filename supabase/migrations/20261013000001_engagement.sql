-- Engagement: first-win bonus, achievements, friends, direct challenges, State Wars weekly results.

-- First win of the day + highest rating ever (for league achievements).
alter table profiles add column if not exists first_win_date date;
alter table profiles add column if not exists peak_rating int not null default 1000;
update profiles set peak_rating = greatest(peak_rating, rating);

-- ── Achievements ───────────────────────────────────────────────────────────
create table if not exists user_achievements (
  user_id uuid not null references profiles (id) on delete cascade,
  slug text not null,
  unlocked_at timestamptz not null default now(),
  claimed_at timestamptz,
  primary key (user_id, slug)
);

-- ── Friends ────────────────────────────────────────────────────────────────
-- One row per pair; the requester is whoever asked first.
create table if not exists friendships (
  requester_id uuid not null references profiles (id) on delete cascade,
  addressee_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee on friendships (addressee_id, status);

-- A challenge can be sent straight to one friend (shown on their home screen).
alter table challenges add column if not exists target_id uuid references profiles (id) on delete set null;
create index if not exists challenges_target on challenges (target_id, created_at desc) where target_id is not null;

-- Head-to-head lookups.
create index if not exists matches_pair on matches (player_a, player_b);

-- ── State Wars weekly results ──────────────────────────────────────────────
create table if not exists state_weeks (
  week_start date primary key,
  settled_at timestamptz not null default now()
);

create table if not exists state_week_results (
  week_start date not null references state_weeks (week_start) on delete cascade,
  rank int not null,
  state_code text not null references states (code),
  points int not null,
  prize int not null,
  primary key (week_start, rank)
);

create table if not exists state_week_prizes (
  week_start date not null,
  user_id uuid not null references profiles (id) on delete cascade,
  state_code text not null,
  coins int not null,
  primary key (week_start, user_id)
);

-- Last ranking seen by the overtake notifier.
create table if not exists state_rank_snapshot (
  week_start date not null,
  state_code text not null references states (code),
  rank int not null,
  points int not null,
  primary key (week_start, state_code)
);

alter table user_achievements enable row level security;
alter table friendships enable row level security;
alter table state_weeks enable row level security;
alter table state_week_results enable row level security;
alter table state_week_prizes enable row level security;
alter table state_rank_snapshot enable row level security;

drop policy if exists "own achievements" on user_achievements;
create policy "own achievements" on user_achievements for select to authenticated using (user_id = auth.uid());
drop policy if exists "own friendships" on friendships;
create policy "own friendships" on friendships for select to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists "public state weeks" on state_weeks;
create policy "public state weeks" on state_weeks for select to authenticated using (true);
drop policy if exists "public state week results" on state_week_results;
create policy "public state week results" on state_week_results for select to authenticated using (true);
drop policy if exists "own state prizes" on state_week_prizes;
create policy "own state prizes" on state_week_prizes for select to authenticated using (user_id = auth.uid());
