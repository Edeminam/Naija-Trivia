-- Season finishes: one row per ranked player per finished season, written by the rollover
-- before ratings are reset. Kept forever so players keep a record of every league they reached.
create table if not exists season_results (
  season_number int not null,
  user_id uuid not null references profiles (id) on delete cascade,
  league text not null,
  rating int not null,
  created_at timestamptz not null default now(),
  primary key (season_number, user_id)
);

create index if not exists season_results_user on season_results (user_id, season_number desc);

alter table season_results enable row level security;
drop policy if exists "own season results" on season_results;
create policy "own season results" on season_results for select to authenticated using (user_id = auth.uid());
