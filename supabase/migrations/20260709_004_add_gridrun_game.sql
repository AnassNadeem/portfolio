-- Add gridrun to arcade leaderboard game constraint
alter table public.leaderboard
  drop constraint if exists leaderboard_game_valid;

alter table public.leaderboard
  add constraint leaderboard_game_valid
    check (game in ('reaction', 'pitstop', 'hotlap', 'gridrun'));
