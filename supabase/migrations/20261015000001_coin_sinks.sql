-- Coin sinks: streak freezes bought with coins, and coin stakes on direct friend challenges.

-- Bought freezes are held here until a missed day uses them (after the week's free freezes).
alter table streaks add column if not exists freezes_owned int not null default 0 check (freezes_owned >= 0);

-- Each side of a direct challenge puts in `stake` coins; the winner takes both.
alter table challenges add column if not exists stake int not null default 0 check (stake >= 0);
alter table challenges add column if not exists stake_settled_at timestamptz;
alter table challenges add column if not exists stake_winner uuid references profiles (id) on delete set null;
alter table challenges add column if not exists stake_outcome text check (stake_outcome in ('won', 'draw', 'refunded'));
-- True once this entrant's stake has been taken from their coins.
alter table challenge_entries add column if not exists staked boolean not null default false;

create index if not exists challenges_unsettled_stakes on challenges (expires_at) where stake > 0 and stake_settled_at is null;
