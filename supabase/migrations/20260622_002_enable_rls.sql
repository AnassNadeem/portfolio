-- Migration 002: Enable Row-Level Security on all tables
-- Run AFTER 001. RLS blocks ALL access until explicit policies are added (003).

alter table public.leaderboard enable row level security;
alter table public.signups     enable row level security;
alter table public.messages    enable row level security;
