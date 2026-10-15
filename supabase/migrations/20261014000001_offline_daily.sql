-- Offline Daily Naija: a run downloaded for offline play is locked to offline mode for that day
-- (no previewing the questions and then playing online). Offline answers are scored on submit.
alter table daily_entries add column if not exists mode text not null default 'online' check (mode in ('online', 'offline'));
