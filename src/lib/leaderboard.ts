/** Arcade leaderboard — TWO-TIER storage.
 *
 *  ┌─ 1. TEMPORARY (always) ──────────────────────────────────────────────────┐
 *  │  The player's BEST time per game is kept in memory for the current        │
 *  │  session only. A page reload / refresh wipes it — by design.             │
 *  └──────────────────────────────────────────────────────────────────────────┘
 *  ┌─ 2. PERMANENT (opt-in) ──────────────────────────────────────────────────┐
 *  │  Only when the player gives an email + consent: the score is written to   │
 *  │  the Supabase `leaderboard` (the global grid) and the email to `signups`. │
 *  │  These survive reloads and show on every visitor's board.                 │
 *  └──────────────────────────────────────────────────────────────────────────┘
 *
 *  De-duplication: the board is collapsed on read to ONE row per driver name,
 *  keeping their fastest time — so replays never stack as duplicate rows.
 *
 *  NOTE: client-submitted scores are inherently forgeable — acceptable for a
 *  portfolio arcade with no prize. Server CHECK constraints are the only guard. */

import { supabase, supabaseReady } from "./supabase";
import { ARCADE_BOTS, LEADERBOARD_ENDPOINT } from "../data/portfolio";

export type Game = "reaction" | "pitstop" | "hotlap" | "gridrun";

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
  /** true when the score was written to the permanent global grid (email given) */
  savedPermanently?: boolean;
};

// ── TEMPORARY session store: in-memory only, wiped on reload. Best per game. ──
const sessionBest: Record<Game, Entry | null> = {
  reaction: null,
  pitstop: null,
  hotlap: null,
  gridrun: null,
};

/** Clears the in-memory session scores (used on tests; could power a reset UI). */
export function resetSessionScores(): void {
  sessionBest.reaction = null;
  sessionBest.pitstop = null;
  sessionBest.hotlap = null;
  sessionBest.gridrun = null;
}

export function personalBest(game: Game): number | null {
  return sessionBest[game]?.ms ?? null;
}

/** Collapse duplicates: one row per driver name, keeping the fastest time.
 *  OR-merges the you/bot flags so they survive the merge. */
function dedupeByName(entries: Entry[]): Entry[] {
  const best = new Map<string, Entry>();
  for (const e of entries) {
    if (!Number.isFinite(e.ms) || e.ms <= 0) continue;
    const key = e.name.toUpperCase();
    const cur = best.get(key);
    if (!cur) {
      best.set(key, { ...e });
      continue;
    }
    // keep the faster of the two, then OR-merge the flags
    const keep = e.ms < cur.ms ? { ...e } : { ...cur };
    keep.you = Boolean(cur.you || e.you);
    keep.bot = Boolean(cur.bot || e.bot);
    best.set(key, keep);
  }
  return [...best.values()];
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
        .limit(50);
      if (data) {
        remote = data.map((r) => ({
          name: r.player_name,
          ms: r.score,
          date: r.created_at.slice(0, 10),
        }));
      }
    } catch {
      /* offline / network error — fall through */
    }
  } else if (LEADERBOARD_ENDPOINT) {
    try {
      const res = await fetch(`${LEADERBOARD_ENDPOINT}/${game}`);
      if (res.ok) remote = (await res.json()) as Entry[];
    } catch {
      /* offline / unconfigured */
    }
  }

  // Your TEMPORARY (session) best for this game sits alongside the permanent grid
  const mine = sessionBest[game] ? [sessionBest[game] as Entry] : [];

  return dedupeByName([...bots, ...remote, ...mine])
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
  const email = entry.email?.trim().toLowerCase();

  const scored: Entry = {
    name: cleanName,
    ms: cleanMs,
    email,
    date: new Date().toISOString().slice(0, 10),
    you: true,
  };

  // ── 1) TEMPORARY: keep only the player's BEST time this session ──
  const prev = sessionBest[game];
  const isBest = !prev || cleanMs < prev.ms;
  if (isBest) sessionBest[game] = scored;

  // ── 2) PERMANENT: only when an email + consent is supplied ──
  if (supabaseReady && email && entry.consent) {
    // a) permanent email capture — unique constraint dedupes repeat signups
    const { error: sErr } = await supabase.from("signups").insert({ email, consent: true });
    const alreadySignedUp = sErr?.code === "23505";

    // b) permanent score on the global grid (only the session best is worth posting)
    if (isBest) {
      await supabase.from("leaderboard").insert({
        player_name: cleanName,
        score: cleanMs,
        game,
      });
    }
    return { alreadySignedUp, savedPermanently: true };
  }

  // Legacy HTTP endpoint fallback — only when configured AND an email is given
  if (!supabaseReady && LEADERBOARD_ENDPOINT && email) {
    try {
      await fetch(`${LEADERBOARD_ENDPOINT}/${game}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, ms: cleanMs, email }),
      });
      return { savedPermanently: true };
    } catch {
      /* session copy is kept regardless */
    }
  }

  return { savedPermanently: false };
}

export function fmtMs(ms: number, game: Game): string {
  if (game === "gridrun") {
    const pts = Math.round((600000 - ms) / 10);
    return `${pts.toLocaleString()} PTS`;
  }
  if (game === "hotlap") {
    const m = Math.floor(ms / 60000);
    const s = ((ms % 60000) / 1000).toFixed(3);
    return `${m}:${s.padStart(6, "0")}`;
  }
  return `${(ms / 1000).toFixed(3)}s`;
}
