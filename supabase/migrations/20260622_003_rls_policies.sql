-- Migration 003: Row-Level Security policies
-- Run AFTER 002.

-- ── LEADERBOARD policies ─────────────────────────────────────────────────────
-- anon: read top scores (needed to display global leaderboard)
create policy "anon_select_leaderboard"
  on public.leaderboard for select
  to anon
  using (true);

-- anon: submit a score (client inserts; score validity enforced by CHECK constraints)
create policy "anon_insert_leaderboard"
  on public.leaderboard for insert
  to anon
  with check (true);

-- NO update or delete for anon. service_role (Edge Functions) retains full access.

-- ── SIGNUPS policies ─────────────────────────────────────────────────────────
-- anon: insert only (opt-in signup). The unique constraint on email handles dedupes.
create policy "anon_insert_signups"
  on public.signups for insert
  to anon
  with check (consent = true);

-- NO select for anon — the email list is never exposed to the browser.
-- NO update or delete for anon.

-- ── MESSAGES policies ────────────────────────────────────────────────────────
-- No anon access at all. The contact-submit Edge Function uses the service_role
-- key (set in Supabase Edge Function secrets) to bypass RLS on insert.
-- This means a rogue client cannot directly write to messages even with the anon key.
