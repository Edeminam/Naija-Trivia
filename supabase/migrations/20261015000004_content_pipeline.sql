-- Weekly content drops: an approved question can be scheduled to go live at a set time.
-- A question is playable when status = 'live' and release_at is null or in the past.
alter table questions add column if not exists release_at timestamptz;
create index if not exists questions_release_at on questions (release_at) where release_at is not null;
