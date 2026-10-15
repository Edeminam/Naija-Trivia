-- Questions in other languages (Nigerian Pidgin first). Options are stored in the same order as the
-- English question's options, so correct_index and answer stats carry over unchanged.

create table if not exists question_translations (
  question_id uuid not null references questions (id) on delete cascade,
  locale text not null check (locale in ('pcm', 'yo', 'ig', 'ha')),
  text text not null,
  options jsonb not null check (jsonb_array_length(options) = 4),
  fact text not null,
  status text not null default 'live' check (status in ('live', 'paused')),
  updated_at timestamptz not null default now(),
  primary key (question_id, locale)
);

-- Like questions, translations carry answers by position: server-only.
alter table question_translations enable row level security;
