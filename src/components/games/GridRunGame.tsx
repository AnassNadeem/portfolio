import { useCallback, useEffect, useRef, useState } from "react";
import { playShift } from "../../lib/sound";
import { submitScore, fmtMs } from "../../lib/leaderboard";
import "./GridRunGame.css";

const LANES = 3;
const W = 320;
const H = 480;

type Obstacle = { lane: number; y: number; kind: "barrier" | "oil" | "rival" };
type Gem = { lane: number; y: number };

const LEVELS = [
  { target: 400, speed: 3.2, spawn: 0.018, label: "ROOKIE" },
  { target: 700, speed: 4.0, spawn: 0.024, label: "PRO" },
  { target: 1000, speed: 4.8, spawn: 0.03, label: "EXPERT" },
  { target: 1400, speed: 5.6, spawn: 0.036, label: "ELITE" },
  { target: 2000, speed: 6.5, spawn: 0.044, label: "CHAMPION" },
];

function laneX(lane: number): number {
  return (W / LANES) * lane + W / LANES / 2;
}

function rawScore(distance: number, gems: number): number {
  return distance + gems * 80;
}

function toLeaderboardMs(raw: number): number {
  return Math.max(0, 600000 - raw * 10);
}

export default function GridRunGame({ soundOn }: { soundOn: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "level" | "done">("idle");
  const [level, setLevel] = useState(0);
  const [hud, setHud] = useState({ distance: 0, gems: 0 });
  const [finalMs, setFinalMs] = useState(0);
  const gameRef = useRef({
    lane: 1,
    distance: 0,
    gems: 0,
    obstacles: [] as Obstacle[],
    gemsList: [] as Gem[],
    speed: LEVELS[0].speed,
    spawn: LEVELS[0].spawn,
    slow: 0,
    raf: 0,
    alive: false,
  });

  const draw = useCallback((ctx: CanvasRenderingContext2D, g: typeof gameRef.current) => {
    ctx.clearRect(0, 0, W, H);

    // road
    ctx.fillStyle = "#121217";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < LANES - 1; i++) {
      ctx.strokeStyle = "#2a2a33";
      ctx.setLineDash([12, 16]);
      ctx.beginPath();
      ctx.moveTo((W / LANES) * (i + 1), 0);
      ctx.lineTo((W / LANES) * (i + 1), H);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // scrolling lines
    const offset = (g.distance * 4) % 40;
    ctx.strokeStyle = "rgba(245,245,247,0.08)";
    for (let y = -40 + offset; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(W / 2, y);
      ctx.lineTo(W / 2, y + 20);
      ctx.stroke();
    }

    // gems
    ctx.fillStyle = "#c77dff";
    for (const gem of g.gemsList) {
      const x = laneX(gem.lane);
      ctx.beginPath();
      ctx.moveTo(x, gem.y);
      ctx.lineTo(x + 8, gem.y + 12);
      ctx.lineTo(x, gem.y + 24);
      ctx.lineTo(x - 8, gem.y + 12);
      ctx.closePath();
      ctx.fill();
    }

    // obstacles
    for (const o of g.obstacles) {
      const x = laneX(o.lane);
      if (o.kind === "barrier") {
        ctx.fillStyle = "#e10600";
        ctx.fillRect(x - 22, o.y, 44, 28);
      } else if (o.kind === "oil") {
        ctx.fillStyle = "#3a3a46";
        ctx.beginPath();
        ctx.ellipse(x, o.y + 14, 26, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#e10600";
        ctx.fillRect(x - 18, o.y, 36, 50);
        ctx.fillStyle = "#0a0a0c";
        ctx.fillRect(x - 12, o.y + 8, 24, 12);
      }
    }

    // player car
    const px = laneX(g.lane);
    const py = H - 70;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#e10600";
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 20, py + 44);
    ctx.lineTo(px - 20, py + 44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0a0a0c";
    ctx.fillRect(px - 10, py + 10, 20, 14);
  }, []);

  const endGame = useCallback((g: typeof gameRef.current) => {
    g.alive = false;
    cancelAnimationFrame(g.raf);
    const raw = rawScore(Math.floor(g.distance), g.gems);
    setFinalMs(toLeaderboardMs(raw));
    setState("done");
  }, []);

  const startLevel = useCallback((lvl: number) => {
    const cfg = LEVELS[lvl];
    const g = gameRef.current;
    g.lane = 1;
    g.distance = 0;
    g.gems = 0;
    g.obstacles = [];
    g.gemsList = [];
    g.speed = cfg.speed;
    g.spawn = cfg.spawn;
    g.slow = 0;
    g.alive = true;
    setLevel(lvl);
    setHud({ distance: 0, gems: 0 });
    setState("playing");

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const tick = () => {
      if (!g.alive) return;
      const spd = g.speed * (g.slow > 0 ? 0.55 : 1);
      if (g.slow > 0) g.slow -= 1;

      g.distance += spd * 0.35;
      setHud({ distance: Math.floor(g.distance), gems: g.gems });

      if (Math.random() < g.spawn) {
        const lane = Math.floor(Math.random() * LANES);
        const roll = Math.random();
        const kind: Obstacle["kind"] = roll < 0.55 ? "barrier" : roll < 0.8 ? "rival" : "oil";
        g.obstacles.push({ lane, y: -30, kind });
      }
      if (Math.random() < g.spawn * 0.45) {
        g.gemsList.push({ lane: Math.floor(Math.random() * LANES), y: -20 });
      }

      g.obstacles.forEach((o) => { o.y += spd; });
      g.gemsList.forEach((gem) => { gem.y += spd; });
      g.obstacles = g.obstacles.filter((o) => o.y < H + 40);
      g.gemsList = g.gemsList.filter((gem) => gem.y < H + 40);

      const py = H - 70;
      for (const o of g.obstacles) {
        if (o.lane === g.lane && o.y > py - 10 && o.y < py + 36) {
          if (o.kind === "oil") g.slow = 45;
          else {
            endGame(g);
            return;
          }
        }
      }
      g.gemsList = g.gemsList.filter((gem) => {
        if (gem.lane === g.lane && gem.y > py && gem.y < py + 40) {
          g.gems += 1;
          if (soundOn) playShift(0.08);
          return false;
        }
        return true;
      });

      if (g.distance >= cfg.target) {
        g.alive = false;
        cancelAnimationFrame(g.raf);
        if (lvl < LEVELS.length - 1) {
          setState("level");
        } else {
          const raw = rawScore(Math.floor(g.distance), g.gems);
          setFinalMs(toLeaderboardMs(raw));
          setState("done");
        }
        return;
      }

      draw(ctx, g);
      g.raf = requestAnimationFrame(tick);
    };
    g.raf = requestAnimationFrame(tick);
  }, [draw, endGame, soundOn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state !== "playing") return;
      const g = gameRef.current;
      if (e.key === "ArrowLeft" || e.key === "a") g.lane = Math.max(0, g.lane - 1);
      if (e.key === "ArrowRight" || e.key === "d") g.lane = Math.min(LANES - 1, g.lane + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  const onSwipe = (dir: -1 | 1) => {
    if (state !== "playing") return;
    const g = gameRef.current;
    g.lane = Math.max(0, Math.min(LANES - 1, g.lane + dir));
  };

  return (
    <div className="gridrun">
      <canvas ref={canvasRef} width={W} height={H} className="gridrun-canvas" aria-label="Grid Run game" />
      <div className="gridrun-touch">
        <button type="button" onPointerDown={() => onSwipe(-1)} aria-label="Move left">◀</button>
        <button type="button" onPointerDown={() => onSwipe(1)} aria-label="Move right">▶</button>
      </div>

      {state === "idle" && (
        <div className="gridrun-overlay">
          <p className="gc-copy">GRID RUN — dodge barriers, collect gems, clear 5 levels. Arrow keys or swipe.</p>
          <button className="btn" type="button" onClick={() => startLevel(0)} data-cursor="link">
            <span>Start Engine</span>
          </button>
        </div>
      )}

      {state === "playing" && (
        <div className="gridrun-hud mono">
          <span>LVL {level + 1} — {LEVELS[level].label}</span>
          <span>{hud.distance}m</span>
          <span>◆ {hud.gems}</span>
        </div>
      )}

      {state === "level" && (
        <div className="gridrun-overlay">
          <p className="gc-copy display">SECTOR {level + 1} CLEAR</p>
          <button className="btn" type="button" onClick={() => startLevel(level + 1)} data-cursor="link">
            <span>Next Level ▸</span>
          </button>
        </div>
      )}

      {state === "done" && (
        <div className="gridrun-overlay">
          <GridRunSubmit ms={finalMs} onDone={() => setState("idle")} />
        </div>
      )}
    </div>
  );
}

export { toLeaderboardMs, rawScore };

function GridRunSubmit({ ms, onDone }: { ms: number; onDone: () => void }) {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await submitScore("gridrun", { name: name || "AAA", ms });
    setSaved(true);
    setTimeout(onDone, 1200);
  };

  return (
    <div className="gc-submit">
      <div className="gc-submit-time display">{fmtMs(ms, "gridrun")}</div>
      <p className="gc-copy">Race complete — post your score to the grid.</p>
      {!saved && (
        <>
          <div className="gc-submit-row">
            <label className="mono" htmlFor="gr-initials">INITIALS</label>
            <input
              id="gr-initials"
              className="gc-initials"
              value={name}
              maxLength={3}
              placeholder="AAA"
              onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            />
          </div>
          <button className="btn" type="button" onClick={save} data-cursor="link">
            <span>Post Score</span>
          </button>
        </>
      )}
      {saved && <p className="mono text-accent">ON THE GRID ✓</p>}
    </div>
  );
}
