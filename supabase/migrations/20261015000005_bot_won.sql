-- A bot has no profile id, so a bot win can't go in `winner` (uuid). Record it here instead;
-- `winner` stays null for both a bot win and a draw, and readers check bot_won to tell them apart.
alter table matches add column if not exists bot_won boolean not null default false;
