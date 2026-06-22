-- Migration 001: Create core tables
-- Apply in Supabase: Dashboard → SQL Editor → paste & run

-- ── LEADERBOARD ──────────────────────────────────────────────────────────────
-- Stores arcade game times. `score` is milliseconds (lower = faster).
-- Client-submitted scores are intentionally not tamper-proof — acceptable for
-- a portfolio arcade where there is no prize. Server constraints are the guard.
create table if not exists public.leaderboard (
  id           uuid primary key default gen_random_uuid(),
  player_name  text        not null,
  score        integer     not null,
  game         text        not null,
  created_at   timestamptz not null default now(),

  -- server-side constraints
  constraint leaderboard_player_name_length  check (char_length(player_name) between 1 and 3),
  constraint leaderboard_score_non_negative  check (score >= 0),
  -- 10 min ceiling covers every game mode with headroom
  constraint leaderboard_score_max           check (score <= 600000),
  constraint leaderboard_game_valid          check (game in ('reaction', 'pitstop', 'hotlap'))
);

-- ── SIGNUPS ───────────────────────────────────────────────────────────────────
-- Arcade opt-in email list. Unique constraint dedupes double submits gracefully.
create table if not exists public.signups (
  id          uuid primary key default gen_random_uuid(),
  email       text        not null unique,
  consent     boolean     not null default false,
  created_at  timestamptz not null default now(),

  constraint signups_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint signups_consent_required check (consent = true)
);

-- ── MESSAGES ─────────────────────────────────────────────────────────────────
-- Contact form submissions. No direct anon write — all inserts go through the
-- contact-submit Edge Function which validates, verifies Turnstile, then inserts
-- using the service_role key. Anon has zero access to this table.
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  email       text        not null,
  subject     text        not null default 'General',
  message     text        not null,
  created_at  timestamptz not null default now(),

  constraint messages_name_length    check (char_length(name)    between 1 and 120),
  constraint messages_email_format   check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint messages_message_length check (char_length(message) between 10 and 5000)
);
