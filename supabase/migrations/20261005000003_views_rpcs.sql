-- Leaderboard & stats RPCs

-- Weekly State Wars table: all 38 teams, ranked by points (ties → more players, then name).
create or replace function public.state_weekly_leaderboard(p_week date)
returns table (
  code text, name text, region text, points bigint, players bigint, rank bigint,
  top_user_id uuid, top_username text, top_avatar_id text, top_points int
)
language sql stable security definer set search_path = public as $$
  with totals as (
    select s.code, s.name, s.region,
           coalesce(sum(p.points), 0)::bigint as points,
           count(p.user_id)::bigint as players
    from states s
    left join state_weekly_points p on p.state_code = s.code and p.week_start = p_week
    group by s.code, s.name, s.region
  ),
  tops as (
    select distinct on (p.state_code) p.state_code, p.user_id, p.points, pr.username, pr.avatar_id
    from state_weekly_points p
    join profiles pr on pr.id = p.user_id
    where p.week_start = p_week and p.points > 0
    order by p.state_code, p.points desc, p.updated_at asc
  )
  select t.code, t.name, t.region, t.points, t.players,
         rank() over (order by t.points desc, t.players desc, t.name asc) as rank,
         tops.user_id, tops.username, tops.avatar_id, tops.points
  from totals t
  left join tops on tops.state_code = t.code
  order by rank, t.name;
$$;

-- Top players inside one state for a week.
create or replace function public.state_top_players(p_state text, p_week date, p_limit int default 20)
returns table (rank bigint, user_id uuid, username text, avatar_id text, league text, frame_id text, points int, wins int)
language sql stable security definer set search_path = public as $$
  select rank() over (order by p.points desc, p.updated_at asc), p.user_id, pr.username, pr.avatar_id, pr.league, pr.frame_id, p.points, p.wins
  from state_weekly_points p
  join profiles pr on pr.id = p.user_id
  where p.week_start = p_week and p.state_code = p_state and p.points > 0
  order by p.points desc, p.updated_at asc
  limit p_limit;
$$;

-- Daily Naija ranking (national, or one state when p_state is given).
create or replace function public.daily_leaderboard(p_date date, p_state text default null, p_limit int default 50)
returns table (rank bigint, user_id uuid, username text, avatar_id text, state_code text, league text, frame_id text, score int, correct int, total_ms int)
language sql stable security definer set search_path = public as $$
  select rank() over (order by e.score desc, e.total_ms asc), e.user_id, pr.username, pr.avatar_id, e.state_code, pr.league, pr.frame_id, e.score, e.correct, e.total_ms
  from daily_entries e
  join profiles pr on pr.id = e.user_id
  where e.daily_date = p_date and e.finished_at is not null and (p_state is null or e.state_code = p_state)
  order by e.score desc, e.total_ms asc
  limit p_limit;
$$;

-- A player's rank for a day (national + state), without pulling the whole board.
create or replace function public.daily_rank(p_date date, p_user uuid)
returns table (national_rank bigint, state_rank bigint, players bigint)
language sql stable security definer set search_path = public as $$
  with me as (select * from daily_entries where daily_date = p_date and user_id = p_user and finished_at is not null)
  select
    (select count(*) + 1 from daily_entries e, me where e.daily_date = p_date and e.finished_at is not null
       and (e.score > me.score or (e.score = me.score and e.total_ms < me.total_ms))),
    (select count(*) + 1 from daily_entries e, me where e.daily_date = p_date and e.finished_at is not null and e.state_code = me.state_code
       and (e.score > me.score or (e.score = me.score and e.total_ms < me.total_ms))),
    (select count(*) from daily_entries where daily_date = p_date and finished_at is not null)
  from me;
$$;

-- Accuracy by category for one player (RLS on match_answers limits clients to themselves).
create or replace function public.user_category_stats(p_user uuid)
returns table (slug text, answered bigint, correct bigint, accuracy numeric)
language sql stable security invoker set search_path = public as $$
  select c.slug,
         count(a.id) as answered,
         count(a.id) filter (where a.correct) as correct,
         case when count(a.id) = 0 then 0 else round(count(a.id) filter (where a.correct)::numeric / count(a.id), 3) end as accuracy
  from categories c
  left join match_answers a on a.category_id = c.id and a.user_id = p_user
  group by c.slug, c.sort
  order by c.sort;
$$;

-- Admin overview of the bank.
create or replace view public.question_bank_stats as
  select c.slug, q.difficulty, q.status, count(*)::int as total,
         round(avg(case when q.times_shown > 0 then q.times_correct::numeric / q.times_shown end), 3) as pct_correct
  from questions q join categories c on c.id = q.category_id
  group by c.slug, q.difficulty, q.status;

revoke all on public.question_bank_stats from anon, authenticated;
grant execute on function public.state_weekly_leaderboard(date) to anon, authenticated;
grant execute on function public.state_top_players(text, date, int) to anon, authenticated;
grant execute on function public.daily_leaderboard(date, text, int) to anon, authenticated;
