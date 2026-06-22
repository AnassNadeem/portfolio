/** Hand-off between the podium overlay and the arcade: "submit this score". */
import type { Game } from "./leaderboard";

let pending: { game: Game; ms: number } | null = null;

export function setPending(p: { game: Game; ms: number }) {
  pending = p;
}

export function takePending() {
  const p = pending;
  pending = null;
  return p;
}
