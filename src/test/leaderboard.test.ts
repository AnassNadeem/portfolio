import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase so tests run offline
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

// Reset localStorage between tests
beforeEach(() => localStorage.clear());

describe("submitScore sanitisation", () => {
  it("upcases and trims player name to 3 chars", async () => {
    const { submitScore } = await import("../lib/leaderboard");
    await submitScore("reaction", { name: "alice", ms: 250 });
    const saved = JSON.parse(localStorage.getItem("apex_lb_reaction") ?? "[]");
    expect(saved[0].name).toBe("ALI");
  });

  it("strips non-alphanumeric characters from name", async () => {
    const { submitScore } = await import("../lib/leaderboard");
    await submitScore("reaction", { name: "a!b@c#", ms: 250 });
    const saved = JSON.parse(localStorage.getItem("apex_lb_reaction") ?? "[]");
    expect(saved[0].name).toBe("ABC");
  });

  it("pads short names with middle-dot", async () => {
    const { submitScore } = await import("../lib/leaderboard");
    await submitScore("reaction", { name: "x", ms: 300 });
    const saved = JSON.parse(localStorage.getItem("apex_lb_reaction") ?? "[]");
    expect(saved[0].name).toBe("X··");
  });

  it("clamps ms below 0 to 0", async () => {
    const { submitScore } = await import("../lib/leaderboard");
    await submitScore("hotlap", { name: "ABC", ms: -100 });
    const saved = JSON.parse(localStorage.getItem("apex_lb_hotlap") ?? "[]");
    expect(saved[0].ms).toBe(0);
  });

  it("clamps ms above 600000 to 600000", async () => {
    const { submitScore } = await import("../lib/leaderboard");
    await submitScore("pitstop", { name: "ABC", ms: 999999 });
    const saved = JSON.parse(localStorage.getItem("apex_lb_pitstop") ?? "[]");
    expect(saved[0].ms).toBe(600000);
  });

  it("always marks local entry as yours", async () => {
    const { submitScore } = await import("../lib/leaderboard");
    await submitScore("reaction", { name: "YOU", ms: 200 });
    const saved = JSON.parse(localStorage.getItem("apex_lb_reaction") ?? "[]");
    expect(saved[0].you).toBe(true);
  });
});

describe("personalBest", () => {
  it("returns null when no local entries exist", async () => {
    const { personalBest } = await import("../lib/leaderboard");
    expect(personalBest("reaction")).toBeNull();
  });

  it("returns the minimum ms from local your-entries", async () => {
    localStorage.setItem(
      "apex_lb_reaction",
      JSON.stringify([
        { name: "YOU", ms: 300, you: true },
        { name: "YOU", ms: 200, you: true },
        { name: "BOT", ms: 100, you: false },
      ])
    );
    const { personalBest } = await import("../lib/leaderboard");
    expect(personalBest("reaction")).toBe(200);
  });
});
