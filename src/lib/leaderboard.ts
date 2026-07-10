/** Arcade leaderboard — TWO-TIER storage.
 *
 *  1. SESSION (no email) — best time per game in memory only; cleared on refresh.
 *  2. GLOBAL (email + consent) — one email = one call sign across all games,
 *     via the arcade-submit Edge Function (Turnstile + rate limits).
 */

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
  savedPermanently?: boolean;
  improved?: boolean;
  playerName?: string;
  renamed?: boolean;
  error?: string;
};

const ARCADE_SUBMIT_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/arcade-submit`
  : null;

const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

export const DRIVER_PROFILE_KEY = "apex_driver_profile";

// ── In-memory session store — wiped on page refresh ──
const sessionBest: Record<Game, Entry | null> = {
  reaction: null,
  pitstop: null,
  hotlap: null,
  gridrun: null,
};

export function sanitizeDriverName(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9·]/g, "").slice(0, 3).padEnd(3, "·");
}

export function loadDriverProfile(): { email: string; playerName: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRIVER_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string; playerName?: string };
    if (!parsed.email || !parsed.playerName) return null;
    return { email: parsed.email, playerName: parsed.playerName };
  } catch {
    return null;
  }
}

export function saveDriverProfile(email: string, playerName: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify({ email, playerName }));
  } catch {
    /* quota / private mode */
  }
}

/** Clears in-memory session scores (tests / manual reset). */
export function resetSessionScores(): void {
  sessionBest.reaction = null;
  sessionBest.pitstop = null;
  sessionBest.hotlap = null;
  sessionBest.gridrun = null;
}

export function personalBest(game: Game): number | null {
  return sessionBest[game]?.ms ?? null;
}

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
        .from("arcade_leaderboard")
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
      /* fallback: legacy leaderboard rows */
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
        /* offline */
      }
    }
  } else if (LEADERBOARD_ENDPOINT) {
    try {
      const res = await fetch(`${LEADERBOARD_ENDPOINT}/${game}`);
      if (res.ok) remote = (await res.json()) as Entry[];
    } catch {
      /* offline */
    }
  }

  const mine = sessionBest[game] ? [sessionBest[game] as Entry] : [];

  return dedupeByName([...bots, ...remote, ...mine])
    .sort((a, b) => a.ms - b.ms)
    .slice(0, 10);
}

async function submitToGlobal(
  game: Game,
  name: string,
  ms: number,
  email: string,
  turnstileToken: string,
): Promise<SubmitResult> {
  if (!ARCADE_SUBMIT_URL || !ANON_KEY) {
    return { savedPermanently: false, error: "Arcade service not configured." };
  }

  const res = await fetch(ARCADE_SUBMIT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({
      name,
      email,
      game,
      score: ms,
      consent: true,
      turnstileToken,
    }),
  });

  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    /* empty */
  }

  if (!res.ok) {
    const msg = typeof body.error === "string" ? body.error : `Server error (${res.status})`;
    return { savedPermanently: false, error: msg };
  }

  const playerName = typeof body.playerName === "string" ? body.playerName : name;
  saveDriverProfile(email, playerName);

  return {
    savedPermanently: Boolean(body.savedPermanently),
    improved: body.improved !== false,
    playerName,
    renamed: Boolean(body.renamed),
  };
}

export async function submitScore(
  game: Game,
  entry: {
    name: string;
    ms: number;
    email?: string;
    consent?: boolean;
    turnstileToken?: string;
  },
): Promise<SubmitResult> {
  const cleanName = sanitizeDriverName(entry.name);
  const cleanMs = Math.max(0, Math.min(600000, Math.round(entry.ms)));
  const email = entry.email?.trim().toLowerCase();

  const scored: Entry = {
    name: cleanName,
    ms: cleanMs,
    email,
    date: new Date().toISOString().slice(0, 10),
    you: true,
  };

  const prev = sessionBest[game];
  const isBest = !prev || cleanMs < prev.ms;

  let globalResult: SubmitResult | null = null;

  if (supabaseReady && email && entry.consent && isBest) {
    if (!entry.turnstileToken) {
      return { savedPermanently: false, error: "Complete the bot check below." };
    }
    globalResult = await submitToGlobal(game, cleanName, cleanMs, email, entry.turnstileToken);
    if (globalResult.playerName) {
      scored.name = globalResult.playerName;
    }
    if (!globalResult.savedPermanently && globalResult.error) {
      if (isBest) {
        sessionBest[game] = scored;
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("apex:score-posted", { detail: { game } }));
        }
      }
      return globalResult;
    }
  }

  if (isBest) {
    sessionBest[game] = scored;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("apex:score-posted", { detail: { game } }));
    }
  }

  if (globalResult?.savedPermanently) {
    return globalResult;
  }

  if (!supabaseReady && LEADERBOARD_ENDPOINT && email) {
    try {
      await fetch(`${LEADERBOARD_ENDPOINT}/${game}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, ms: cleanMs, email }),
      });
      return { savedPermanently: true };
    } catch {
      /* session only */
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
