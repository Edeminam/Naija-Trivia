-- Premium perks: monthly coins, a second weekly streak freeze, the Season Pass every season.

-- How many freezes were used in `freeze_used_week` (Premium gets two a week).
alter table streaks add column if not exists freezes_used int not null default 0;
update streaks set freezes_used = 1 where freeze_used_week is not null and freezes_used = 0;

-- When the last monthly Premium coin grant was paid, and the last season whose pass was granted.
alter table profiles add column if not exists premium_stipend_at timestamptz;
alter table profiles add column if not exists premium_pass_season int;
