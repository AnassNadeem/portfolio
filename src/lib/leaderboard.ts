/** Arcade leaderboard. Works fully offline against localStorage with seeded
 *  bot rivals; if LEADERBOARD_ENDPOINT is configured it becomes global:
 *    GET  {endpoint}/{game}        → Entry[]
 *    POST {endpoint}/{game}        ← { name, ms, email? }
 *  (A ~40-line Cloudflare Worker for this lives in the README.) */

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
  if (LEADERBOARD_ENDPOINT) {
    try {
      const res = await fetch(`${LEADERBOARD_ENDPOINT}/${game}`);
      if (res.ok) remote = (await res.json()) as Entry[];
    } catch {
      /* offline / unconfigured — local mode */
    }
  }
  const locals = remote.length ? localEntries(game).filter((e) => e.you) : localEntries(game);
  return [...bots, ...remote, ...locals]
    .filter((e) => Number.isFinite(e.ms) && e.ms > 0)
    .sort((a, b) => a.ms - b.ms)
    .slice(0, 10);
}

export async function submitScore(game: Game, entry: { name: string; ms: number; email?: string }) {
  const clean: Entry = {
    name: entry.name.toUpperCase().slice(0, 3).padEnd(3, "·"),
    ms: Math.round(entry.ms),
    date: new Date().toISOString().slice(0, 10),
    you: true,
  };
  const list = localEntries(game);
  list.push(clean);
  try {
    localStorage.setItem(KEY(game), JSON.stringify(list.slice(-50)));
  } catch {
    /* fine */
  }
  if (LEADERBOARD_ENDPOINT) {
    try {
      await fetch(`${LEADERBOARD_ENDPOINT}/${game}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean.name, ms: clean.ms, email: entry.email || undefined }),
      });
    } catch {
      /* stored locally regardless */
    }
  }
}

export function fmtMs(ms: number, game: Game): string {
  if (game === "hotlap") {
    const m = Math.floor(ms / 60000);
    const s = ((ms % 60000) / 1000).toFixed(3);
    return `${m}:${s.padStart(6, "0")}`;
  }
  return `${(ms / 1000).toFixed(3)}s`;
}
