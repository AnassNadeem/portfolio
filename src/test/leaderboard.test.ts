import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase so tests run offline (forces the in-memory / session path)
vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
    }),
  },
  supabaseReady: false,
}));

// Reset the in-memory session store between tests
beforeEach(async () => {
  const { resetSessionScores } = await import("../lib/leaderboard");
  resetSessionScores();
});

/** Helper: find the player's own row on the offline board. */
async function youRow(game: "reaction" | "pitstop" | "hotlap") {
  const { getBoard } = await import("../lib/leaderboard");
  const board = await getBoard(game);
  return board.find((e) => e.you);
}

describe("submitScore sanitisation", () => {
  it("upcases and trims player name to 3 chars", async () => {
    const { submitScore } = await import("../lib/leaderboard");
    await submitScore("reaction", { name: "alice", ms: 250 });
    expect((await youRow("reaction"))?.name).toBe("ALI");
  });

  it("strips non-alphanumeric characters from name", async () => {
    const { submitScore } = await import("../lib/leaderboard");
    await submitScore("reaction", { name: "a!b@c#", ms: 250 });
    expect((await youRow("reaction"))?.name).toBe("ABC");
  });

  it("pads short names with middle-dot", async () => {
    const { submitScore } = await import("../lib/leaderboard");
    await submitScore("reaction", { name: "x", ms: 300 });
    expect((await youRow("reaction"))?.name).toBe("X··");
  });

  it("clamps ms below 0 to 0", async () => {
    const { submitScore, personalBest } = await import("../lib/leaderboard");
    await submitScore("hotlap", { name: "ABC", ms: -100 });
    expect(personalBest("hotlap")).toBe(0);
  });

  it("clamps ms above 600000 to 600000", async () => {
    const { submitScore, personalBest } = await import("../lib/leaderboard");
    await submitScore("pitstop", { name: "ABC", ms: 999999 });
    expect(personalBest("pitstop")).toBe(600000);
  });

  it("marks the player's session entry as theirs", async () => {
    const { submitScore } = await import("../lib/leaderboard");
    await submitScore("reaction", { name: "YOU", ms: 200 });
    expect((await youRow("reaction"))?.you).toBe(true);
  });
});

describe("two-tier storage", () => {
  it("keeps only the BEST time per session, not every attempt", async () => {
    const { submitScore, personalBest } = await import("../lib/leaderboard");
    await submitScore("reaction", { name: "YOU", ms: 300 });
    await submitScore("reaction", { name: "YOU", ms: 210 });
    await submitScore("reaction", { name: "YOU", ms: 250 }); // slower — ignored
    expect(personalBest("reaction")).toBe(210);
  });

  it("does not persist a no-email score permanently", async () => {
    const { submitScore } = await import("../lib/leaderboard");
    const res = await submitScore("reaction", { name: "YOU", ms: 200 });
    expect(res.savedPermanently).toBe(false);
  });

  it("collapses duplicate names to a single board row (best time wins)", async () => {
    const { submitScore, getBoard } = await import("../lib/leaderboard");
    await submitScore("reaction", { name: "TTT", ms: 337 });
    await submitScore("reaction", { name: "TTT", ms: 337 }); // duplicate
    const board = await getBoard("reaction");
    expect(board.filter((e) => e.name === "TTT")).toHaveLength(1);
  });
});

describe("personalBest", () => {
  it("returns null when no session entry exists", async () => {
    const { personalBest } = await import("../lib/leaderboard");
    expect(personalBest("reaction")).toBeNull();
  });

  it("returns the fastest ms set this session", async () => {
    const { submitScore, personalBest } = await import("../lib/leaderboard");
    await submitScore("reaction", { name: "YOU", ms: 300 });
    await submitScore("reaction", { name: "YOU", ms: 200 });
    expect(personalBest("reaction")).toBe(200);
  });

  it("is cleared by resetSessionScores", async () => {
    const { submitScore, personalBest, resetSessionScores } = await import("../lib/leaderboard");
    await submitScore("reaction", { name: "YOU", ms: 200 });
    resetSessionScores();
    expect(personalBest("reaction")).toBeNull();
  });
});
