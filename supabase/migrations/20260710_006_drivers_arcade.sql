-- Drivers + per-game scores: one email → one call sign across all arcade games.

create table if not exists public.drivers (
  id           uuid primary key default gen_random_uuid(),
  email        text        not null unique,
  player_name  text        not null unique,
  consent      boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint drivers_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint drivers_player_name_length check (char_length(player_name) between 1 and 3),
  constraint drivers_consent_required check (consent = true)
);

create table if not exists public.arcade_scores (
  driver_id  uuid        not null references public.drivers(id) on delete cascade,
  game       text        not null,
  score      integer     not null,
  updated_at timestamptz not null default now(),

  primary key (driver_id, game),
  constraint arcade_scores_score_non_negative check (score >= 0),
  constraint arcade_scores_score_max check (score <= 600000),
  constraint arcade_scores_game_valid check (game in ('reaction', 'pitstop', 'hotlap', 'gridrun'))
);

-- Public read view — exposes call sign only, never email.
create or replace view public.arcade_leaderboard as
select
  s.game,
  s.score,
  s.updated_at as created_at,
  d.player_name
from public.arcade_scores s
inner join public.drivers d on d.id = s.driver_id;

grant select on public.arcade_leaderboard to anon, authenticated;

alter table public.drivers enable row level security;
alter table public.arcade_scores enable row level security;

-- No direct anon access to drivers / arcade_scores — writes go through Edge Functions.

-- Retire client-side leaderboard inserts (legacy table kept for old rows).
drop policy if exists "anon_insert_leaderboard" on public.leaderboard;
