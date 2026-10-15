-- Live national events: scheduled one-hour quizzes (the schedule lives in @ntc/shared LIVE_EVENTS).

create table if not exists event_sets (
  event_id text primary key,
  question_ids uuid[] not null,
  created_at timestamptz not null default now()
);

create table if not exists event_entries (
  event_id text not null references event_sets (event_id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  state_code text references states (code),
  current_index int not null default 0,
  served_at timestamptz,
  score int not null default 0,
  correct int not null default 0,
  total_ms int not null default 0,
  answers jsonb not null default '[]'::jsonb,
  finished_at timestamptz,
  -- Coins paid for final place once the event closes
  prize int,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists event_entries_rank on event_entries (event_id, score desc, total_ms asc) where finished_at is not null;

-- One row per event once its prizes are paid (settlement is idempotent).
create table if not exists events_settled (
  event_id text primary key,
  settled_at timestamptz not null default now()
);

alter table event_sets enable row level security;
alter table event_entries enable row level security;
alter table events_settled enable row level security;
-- Players can read their own entries; question ids stay server-only like daily_sets.
drop policy if exists "own event entries" on event_entries;
create policy "own event entries" on event_entries for select to authenticated using (user_id = auth.uid());
