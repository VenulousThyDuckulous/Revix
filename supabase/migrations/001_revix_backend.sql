-- Revix online backend: profiles, validated activity, weekly leagues, season results.
-- Run in the Supabase SQL editor (or via supabase CLI). Safe to re-run: uses IF NOT EXISTS / upserts.
--
-- Season model: ISO week id "YYYY-Www" (UTC), Monday 00:00 UTC boundary (matches src/lib/leagues.ts).
-- Reward catalogue (mirrors src/lib/leagues.ts REWARDS):
--   quiz correct 10, completion 5, perfect 10 | flashcard session 15 | game 10+win 10
--   exam session 20 | topic mastered 25 | daily league cap 500 per user (UTC day).

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar text not null default '🚀',
  tier text not null default 'bronze'
    check (tier in ('bronze','silver','gold','platinum','diamond','champion')),
  week_xp integer not null default 0,
  lifetime_xp integer not null default 0,
  season_id text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_display_name_unique on public.profiles (lower(display_name));

-- ---------- activity (validated rewards, duplicate-proof) ----------
create table if not exists public.revision_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_key text not null,
  kind text not null check (kind in ('quiz','flashcards','game','exam','topic')),
  subject_id text,
  detail text not null default '',
  xp integer not null check (xp >= 0 and xp <= 200),
  league_xp integer not null check (league_xp >= 0 and league_xp <= 200),
  correct integer not null default 0,
  total integer not null default 0,
  season_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, event_key)
);
create index if not exists activity_user_season on public.revision_activity (user_id, season_id);
create index if not exists activity_season on public.revision_activity (season_id);

-- ---------- seasons ----------
create table if not exists public.league_seasons (
  season_id text primary key,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  processed boolean not null default false,
  processed_at timestamptz
);

-- ---------- final standings snapshot per season ----------
create table if not exists public.league_results (
  season_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tier text not null,
  week_xp integer not null,
  rank integer not null,
  movement text not null check (movement in ('promoted','relegated','stayed')),
  primary key (season_id, user_id)
);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.revision_activity enable row level security;
alter table public.league_seasons enable row level security;
alter table public.league_results enable row level security;

drop policy if exists "profiles readable by all" on public.profiles;
create policy "profiles readable by all" on public.profiles for select using (true);

drop policy if exists "users manage own profile row" on public.profiles;
create policy "users manage own profile row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- NOTE: tier/week_xp/lifetime_xp/season_id must NOT be user-editable.
-- Enforce with a trigger that resets privileged columns on direct writes.
create or replace function public.protect_profile_ranks()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'UPDATE' then
    NEW.tier := OLD.tier;
    NEW.week_xp := OLD.week_xp;
    NEW.lifetime_xp := OLD.lifetime_xp;
    NEW.season_id := OLD.season_id;
  else
    NEW.tier := 'bronze';
    NEW.week_xp := 0;
    NEW.lifetime_xp := 0;
    NEW.season_id := '';
  end if;
  return NEW;
end $$;
drop trigger if exists trg_protect_profile_ranks on public.profiles;
create trigger trg_protect_profile_ranks before insert or update on public.profiles
  for each row execute function public.protect_profile_ranks();

-- New auth users get a profile row automatically (display name from metadata, unique-suffixed).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; nm text; i int := 0;
begin
  base := coalesce(nullif(NEW.raw_user_meta_data->>'display_name',''), 'revixer');
  base := regexp_replace(lower(base), '[^a-z0-9_]+', '_', 'g');
  loop
    nm := case when i = 0 then base else base || '_' || i::text end;
    begin
      insert into public.profiles (id, display_name) values (NEW.id, nm);
      exit;
    exception when unique_violation then i := i + 1;
    end;
  end loop;
  return NEW;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Activity: users can insert their own rows (validated by award_activity) and read their own.
drop policy if exists "users read own activity" on public.revision_activity;
create policy "users read own activity" on public.revision_activity
  for select using (auth.uid() = user_id);
-- No direct-insert policy: all writes go through award_activity().

-- Seasons/results are world-readable; only the service role / owner writes them (no write policies).
drop policy if exists "seasons readable by all" on public.league_seasons;
create policy "seasons readable by all" on public.league_seasons for select using (true);
drop policy if exists "results readable by all" on public.league_results;
create policy "results readable by all" on public.league_results for select using (true);

-- ---------- trusted reward function ----------
-- Validates the reward server-side: known kind, xp within per-kind caps, daily cap 500 (UTC),
-- duplicate event_key ignored (returns 0, idempotent).
create or replace function public.award_activity(
  p_event_key text, p_kind text, p_subject_id text, p_detail text,
  p_xp integer, p_league_xp integer, p_correct integer, p_total integer, p_season_id text
) returns integer language plpgsql security definer set search_path = public as $$
declare
  cap integer;
  day_total integer;
  give_league integer;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  cap := case p_kind
    when 'quiz' then 115 when 'flashcards' then 15 when 'game' then 30
    when 'exam' then 70 when 'topic' then 25 else -1 end;
  if cap < 0 then raise exception 'unknown activity kind'; end if;
  if p_xp < 0 or p_xp > cap then raise exception 'xp out of range'; end if;
  if p_league_xp < 0 or p_league_xp > cap then raise exception 'league xp out of range'; end if;

  select coalesce(sum(league_xp),0) into day_total from public.revision_activity
    where user_id = auth.uid() and created_at >= date_trunc('day', now());
  give_league := least(p_league_xp, greatest(0, 500 - day_total));

  begin
    insert into public.revision_activity
      (user_id, event_key, kind, subject_id, detail, xp, league_xp, correct, total, season_id)
    values
      (auth.uid(), p_event_key, p_kind, p_subject_id, p_detail, p_xp, give_league, p_correct, p_total, p_season_id);
  exception when unique_violation then
    return 0; -- duplicate event: no double reward
  end;

  -- roll up into profile (week reset when season changes)
  update public.profiles set
    lifetime_xp = lifetime_xp + p_xp,
    week_xp = case when season_id = p_season_id then week_xp + give_league else give_league end,
    season_id = p_season_id
  where id = auth.uid();
  return give_league;
end $$;

-- ---------- season processing (run weekly; service role only) ----------
-- Call via pg_cron / scheduled GitHub Action with the SERVICE ROLE key (never in the frontend).
-- Processes each unprocessed season whose ends_at has passed: snapshots standings, applies
-- promotion/relegation (top/bottom 20%, min 3 eligible, bronze/champion boundaries), resets week_xp.
create or replace function public.process_due_seasons()
returns table (season_id text, promoted integer, relegated integer) language plpgsql security definer set search_path = public as $$
declare s record; n integer; up integer; down integer;
begin
  for s in select * from public.league_seasons where not processed and ends_at <= now() loop
    select count(*) into n from public.profiles where season_id = s.season_id and week_xp >= 1;
    if n >= 3 then
      up := greatest(1, floor(n * 0.2)::int);
      down := greatest(1, floor(n * 0.2)::int);
      if up + down > n then up := 1; down := case when n > 1 then 1 else 0 end; end if;

      -- snapshot ranks
      insert into public.league_results (season_id, user_id, tier, week_xp, rank, movement)
      select s.season_id, p.id, p.tier, p.week_xp,
        row_number() over (order by p.week_xp desc, p.created_at asc),
        'stayed'
      from public.profiles p where p.season_id = s.season_id
      on conflict (season_id, user_id) do nothing;

      -- promote top slice (except champions), relegate bottom slice (except bronze)
      with ranked as (
        select user_id, rank from public.league_results where season_id = s.season_id order by rank
      ),
      top_slice as (select user_id from ranked order by rank limit up),
      bot_slice as (select user_id from ranked order by rank desc limit down)
      update public.league_results r set movement = 'promoted'
        from top_slice t join public.profiles p on p.id = t.user_id
        where r.season_id = s.season_id and r.user_id = t.user_id
          and p.tier <> 'champion' and not exists (select 1 from bot_slice b where b.user_id = t.user_id);
      with ranked as (
        select user_id, rank from public.league_results where season_id = s.season_id order by rank
      ),
      top_slice as (select user_id from ranked order by rank limit up),
      bot_slice as (select user_id from ranked order by rank desc limit down)
      update public.league_results r set movement = 'relegated'
        from bot_slice b join public.profiles p on p.id = b.user_id
        where r.season_id = s.season_id and r.user_id = b.user_id
          and p.tier <> 'bronze' and not exists (select 1 from top_slice t where t.user_id = b.user_id);

      -- apply tier changes
      update public.profiles p set tier = case r.movement
          when 'promoted' then (array['bronze','silver','gold','platinum','diamond','champion'])[array_position(array['bronze','silver','gold','platinum','diamond','champion'], p.tier)+1]
          when 'relegated' then (array['bronze','silver','gold','platinum','diamond','champion'])[greatest(1, array_position(array['bronze','silver','gold','platinum','diamond','champion'], p.tier)-1)]
          else p.tier end
        from public.league_results r
        where r.season_id = s.season_id and r.user_id = p.id;

      update public.league_seasons set processed = true, processed_at = now() where season_id = s.season_id;
      -- reset weekly counters for the new season
      update public.profiles set week_xp = 0 where season_id = s.season_id;
      return query select s.season_id, up, down;
    else
      update public.league_seasons set processed = true, processed_at = now() where season_id = s.season_id;
      return query select s.season_id, 0, 0;
    end if;
  end loop;
end $$;
