/** Arcade leaderboard.
 *  When Supabase is configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY):
 *    - getBoard()     → fetches global top scores via anon SELECT (RLS allows it)
 *    - submitScore()  → inserts into leaderboard via anon INSERT (RLS allows it)
 *    - email signup   → inserts into signups with consent=true via anon INSERT
 *  Falls back to localStorage-only when Supabase is not configured.
 *
 *  NOTE: client-submitted scores are inherently forgeable — a determined user
 *  can POST any ms value directly. This is acceptable for a portfolio arcade
 *  where there is no prize. The server CHECK constraints (score ≥ 0, ≤ 600000,
 *  player_name ≤ 3 chars) are the only integrity guarantee. */

import { supabase, supabaseReady } from "./supabase";
import { ARCADE_BOTS, LEADERBOARD_ENDPOINT } from "../data/portfolio";

export type Game = "reaction" | "pitstop" | "hotlap";

export type Entry = {
  name: string;
  ms: number;
  email?: string;
  bot?: boolean;
  date?: string;
  you?: boolean;
};

export type SubmitResult = {
  alreadySignedUp?: boolean;
};

const KEY = (g: Game) => `apex_lb_${g}`;

function localEntries(game: Game): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY(game)) ?? "[]") as Entry[];
  } catch {
    return [];
  }
}

export function personalBest(game: Game): number | null {
  const mine = localEntries(game).filter((e) => e.you);
  if (!mine.length) return null;
  return Math.min(...mine.map((e) => e.ms));
}

export async function getBoard(game: Game): Promise<Entry[]> {
  const bots: Entry[] = ARCADE_BOTS[game].map((b) => ({ ...b, bot: true }));
  let remote: Entry[] = [];

  if (supabaseReady) {
    try {
      const { data } = await supabase
        .from("leaderboard")
        .select("player_name, score, created_at")
        .eq("game", game)
        .order("score", { ascending: true })
        .limit(20);
      if (data) {
        remote = data.map((r) => ({
          name: r.player_name,
          ms: r.score,
          date: r.created_at.slice(0, 10),
        }));
      }
    } catch {
      /* offline / network error — fall through to local */
    }
  } else if (LEADERBOARD_ENDPOINT) {
    try {
      const res = await fetch(`${LEADERBOARD_ENDPOINT}/${game}`);
      if (res.ok) remote = (await res.json()) as Entry[];
    } catch {
      /* offline / unconfigured */
    }
  }

  // Show local "you" entries alongside remote ones; show all local if no remote
  const locals = remote.length
    ? localEntries(game).filter((e) => e.you)
    : localEntries(game);

  return [...bots, ...remote, ...locals]
    .filter((e) => Number.isFinite(e.ms) && e.ms > 0)
    .sort((a, b) => a.ms - b.ms)
    .slice(0, 10);
}

export async function submitScore(
  game: Game,
  entry: { name: string; ms: number; email?: string; consent?: boolean }
): Promise<SubmitResult> {
  // Sanitise before storing anywhere
  const cleanName = entry.name.toUpperCase().replace(/[^A-Z0-9·]/g, "").slice(0, 3).padEnd(3, "·");
  const cleanMs = Math.max(0, Math.min(600000, Math.round(entry.ms)));

  const local: Entry = {
    name: cleanName,
    ms: cleanMs,
    date: new Date().toISOString().slice(0, 10),
    you: true,
  };

  // Always persist locally so the score survives network failure
  const list = localEntries(game);
  list.push(local);
  try {
    localStorage.setItem(KEY(game), JSON.stringify(list.slice(-50)));
  } catch {
    /* storage full — fine */
  }

  if (supabaseReady) {
    // Insert score into global leaderboard (anon INSERT, RLS allows it)
    await supabase.from("leaderboard").insert({
      player_name: cleanName,
      score: cleanMs,
      game,
    });

    // Email opt-in: only insert if user provided email AND checked the consent box
    if (entry.email && entry.consent) {
      const { error } = await supabase.from("signups").insert({
        email: entry.email.trim().toLowerCase(),
        consent: true,
      });
      // Unique constraint violation (code 23505) = already signed up — handle gracefully
      if (error?.code === "23505") {
        return { alreadySignedUp: true };
      }
    }
    return { alreadySignedUp: false };
  }

  // Legacy HTTP endpoint fallback
  if (LEADERBOARD_ENDPOINT) {
    try {
      await fetch(`${LEADERBOARD_ENDPOINT}/${game}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, ms: cleanMs, email: entry.email || undefined }),
      });
    } catch {
      /* stored locally regardless */
    }
  }

  return { alreadySignedUp: false };
}

export function fmtMs(ms: number, game: Game): string {
  if (game === "hotlap") {
    const m = Math.floor(ms / 60000);
    const s = ((ms % 60000) / 1000).toFixed(3);
    return `${m}:${s.padStart(6, "0")}`;
  }
  return `${(ms / 1000).toFixed(3)}s`;
}
