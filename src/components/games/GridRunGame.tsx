import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { playShift, playRev } from "../../lib/sound";
import { fmtMs } from "../../lib/leaderboard";
import SubmitScore from "../SubmitScore";
import "./GridRunGame.css";

/** ─────────────────────────────────────────────────────────────────────────
 *  GRID RUN — lane-dodger with 5 timed sectors (~2 min of racing total).
 *  All movement is dt-based so speed is identical at any frame rate.
 *  Scoring: distance + gems → mapped onto the shared ms leaderboard
 *  (lower ms = better rank), submitted through the arcade's SubmitScore
 *  flow: email = permanent global-grid save, no email = session only.
 *  ──────────────────────────────────────────────────────────────────────── */

const LANES = 3;

type Dims = { w: number; h: number };
type Obstacle = { lane: number; y: number; kind: "barrier" | "oil" | "rival"; wobble: number };
type Gem = { lane: number; y: number; spin: number };
type Streak = { x: number; y: number; len: number; spd: number };

function laneX(lane: number, w: number): number {
  return (w / LANES) * lane + w / LANES / 2;
}

function playerY(h: number): number {
  return h - Math.max(72, h * 0.17);
}

function readDims(el: HTMLElement | null): Dims {
  if (!el) return { w: 340, h: 480 };
  const rect = el.getBoundingClientRect();
  return {
    w: Math.max(260, Math.floor(rect.width)),
    h: Math.max(300, Math.floor(rect.height)),
  };
}
const LEVELS = [
  { dur: 22, speed: 240, spawn: 1.0, label: "ROOKIE" },
  { dur: 24, speed: 300, spawn: 1.15, label: "PRO" },
  { dur: 26, speed: 360, spawn: 1.35, label: "EXPERT" },
  { dur: 28, speed: 425, spawn: 1.55, label: "ELITE" },
  { dur: 30, speed: 500, spawn: 1.8, label: "CHAMPION" },
];

function rawScore(distance: number, gems: number): number {
  return distance + gems * 80;
}

function toLeaderboardMs(raw: number): number {
  return Math.max(0, 600000 - raw * 10);
}

export default function GridRunGame({ soundOn }: { soundOn: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dimsRef = useRef<Dims>({ w: 340, h: 480 });
  const [state, setState] = useState<"idle" | "playing" | "done" | "crash">("idle");
  const [level, setLevel] = useState(0);
  const [hud, setHud] = useState({ distance: 0, gems: 0, t: 0 });
  const [finalMs, setFinalMs] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const gameRef = useRef({
    lane: 1,
    px: laneX(1, 340),
    vx: 0,
    distance: 0,
    gems: 0,
    elapsed: 0,
    spawnAcc: 0,
    gemAcc: 0,
    obstacles: [] as Obstacle[],
    gemsList: [] as Gem[],
    streaks: [] as Streak[],
    speed: LEVELS[0].speed,
    spawn: LEVELS[0].spawn,
    slow: 0, // seconds of oil-slick slowdown remaining
    grace: 0, // seconds of crash-proof buffer after a level change
    shake: 0,
    raf: 0,
    lastT: 0,
    alive: false,
    totalDistance: 0, // carried across sectors
    totalGems: 0,
  });

  const accent = () =>
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#e10600";

  const draw = useCallback((ctx: CanvasRenderingContext2D, g: typeof gameRef.current, dims: Dims) => {
    const { w: W, h: H } = dims;
    const PY = playerY(H);
    const ac = accent();
    ctx.save();
    if (g.shake > 0) {
      ctx.translate((Math.random() - 0.5) * g.shake * 8, (Math.random() - 0.5) * g.shake * 8);
    }

    // tarmac with subtle depth gradient
    const road = ctx.createLinearGradient(0, 0, 0, H);
    road.addColorStop(0, "#0d0d12");
    road.addColorStop(1, "#15151b");
    ctx.fillStyle = road;
    ctx.fillRect(-8, -8, W + 16, H + 16);

    // kerb stripes down both edges, scrolling
    const kerbOff = (g.distance * 3.2) % 28;
    for (let y = -28 + kerbOff; y < H; y += 28) {
      ctx.fillStyle = Math.floor((y - kerbOff) / 28) % 2 === 0 ? ac : "#f5f5f7";
      ctx.fillRect(0, y, 7, 14);
      ctx.fillRect(W - 7, y + 14, 7, 14);
    }

    // lane dividers
    ctx.strokeStyle = "rgba(245,245,247,0.14)";
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 22]);
    ctx.lineDashOffset = -(g.distance * 4) % 38;
    for (let i = 1; i < LANES; i++) {
      ctx.beginPath();
      ctx.moveTo((W / LANES) * i, 0);
      ctx.lineTo((W / LANES) * i, H);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // speed streaks
    ctx.strokeStyle = "rgba(245,245,247,0.1)";
    ctx.lineWidth = 1.4;
    for (const s of g.streaks) {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, s.y + s.len);
      ctx.stroke();
    }

    // gems — spinning diamonds with glow
    for (const gem of g.gemsList) {
      const x = laneX(gem.lane, W);
      const w = 8 * Math.abs(Math.cos(gem.spin)) + 3;
      ctx.save();
      ctx.shadowColor = "#c77dff";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#c77dff";
      ctx.beginPath();
      ctx.moveTo(x, gem.y);
      ctx.lineTo(x + w, gem.y + 12);
      ctx.lineTo(x, gem.y + 24);
      ctx.lineTo(x - w, gem.y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // obstacles
    for (const o of g.obstacles) {
      const x = laneX(o.lane, W);
      if (o.kind === "barrier") {
        // striped TecPro barrier
        ctx.fillStyle = "#c2352c";
        ctx.fillRect(x - 26, o.y, 52, 26);
        ctx.fillStyle = "#f5f5f7";
        for (let i = 0; i < 3; i++) ctx.fillRect(x - 26 + 6 + i * 18, o.y + 4, 8, 18);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(x - 26, o.y + 22, 52, 4);
      } else if (o.kind === "oil") {
        ctx.fillStyle = "#26262f";
        ctx.beginPath();
        ctx.ellipse(x + Math.sin(o.wobble) * 2, o.y + 14, 27, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(125,155,255,0.18)"; // petrol sheen
        ctx.beginPath();
        ctx.ellipse(x - 6, o.y + 10, 10, 4, -0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // rival car — simple F1 silhouette
        drawCar(ctx, x, o.y, 0, "#3671c6", "#0a0a0c");
      }
    }

    // player car with lane-change tilt
    const tilt = Math.max(-0.3, Math.min(0.3, g.vx * 0.0022));
    drawCar(ctx, g.px, PY, tilt, ac, "#0a0a0c", true, g.slow > 0);

    ctx.restore();

    // oil-slick vignette
    if (g.slow > 0) {
      ctx.fillStyle = `rgba(125,155,255,${Math.min(0.14, g.slow * 0.1)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // crash-proof buffer: dull the scene, fading back in over the last moments
    if (g.grace > 0) {
      ctx.fillStyle = `rgba(10,10,12,${0.6 * Math.min(1, g.grace / 0.6)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }, []);

  const endRun = useCallback((g: typeof gameRef.current, crashed: boolean) => {
    g.alive = false;
    cancelAnimationFrame(g.raf);
    const raw = rawScore(Math.floor(g.totalDistance + g.distance), g.totalGems + g.gems);
    setFinalMs(toLeaderboardMs(raw));
    setState(crashed ? "crash" : "done");
    if (soundOn && crashed) playShift(0.4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn]);

  const syncCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dims: Dims) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const bw = dims.w * dpr;
    const bh = dims.h * dpr;
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const startLevel = useCallback((lvl: number) => {
    const cfg = LEVELS[lvl];
    const g = gameRef.current;
    const stage = stageRef.current;
    const dims = readDims(stage);
    dimsRef.current = dims;
    const { w: W, h: H } = dims;

    if (lvl === 0) {
      // fresh run: reset everything
      g.totalDistance = 0;
      g.totalGems = 0;
      g.lane = 1;
      g.px = laneX(1, W);
      g.vx = 0;
      g.obstacles = [];
      g.gemsList = [];
      g.streaks = Array.from({ length: 10 }, () => ({
        x: 12 + Math.random() * (W - 24),
        y: Math.random() * H,
        len: 20 + Math.random() * 40,
        spd: 1.6 + Math.random() * 1.2,
      }));
      g.slow = 0;
      g.shake = 0;
      g.grace = 0;
    } else {
      // seamless level change: keep car position and traffic, just get harder,
      // with a 3s crash-proof buffer so the speed jump can't insta-kill you
      g.totalDistance += g.distance;
      g.totalGems += g.gems;
      g.grace = 3;
    }
    g.distance = 0;
    g.gems = 0;
    g.elapsed = 0;
    g.spawnAcc = 0;
    g.gemAcc = 0;
    g.speed = cfg.speed;
    g.spawn = cfg.spawn;
    g.alive = true;
    g.lastT = performance.now();
    setLevel(lvl);
    setHud({ distance: 0, gems: 0, t: 0 });
    setState("playing");
    setFlashKey((k) => k + 1); // re-trigger the level-start glow + announce
    if (soundOn) playRev(0.25);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    syncCanvas(canvas, ctx, dims);

    let hudAcc = 0;

    const tick = (now: number) => {
      if (!g.alive) return;
      const dimsNow = dimsRef.current;
      const Wn = dimsNow.w;
      const Hn = dimsNow.h;
      const PY = playerY(Hn);
      const dt = Math.min(0.05, (now - g.lastT) / 1000);
      g.lastT = now;

      syncCanvas(canvas, ctx, dimsNow);

      const spd = g.speed * (g.slow > 0 ? 0.55 : 1);
      if (g.slow > 0) g.slow = Math.max(0, g.slow - dt);
      if (g.grace > 0) g.grace = Math.max(0, g.grace - dt);
      g.shake = Math.max(0, g.shake - dt * 3);
      g.elapsed += dt;
      g.distance += spd * dt * 0.14; // cosmetic metres

      // smooth lane easing
      const targetX = laneX(g.lane, Wn);
      const prevPx = g.px;
      g.px += (targetX - g.px) * Math.min(1, dt * 14);
      g.vx = (g.px - prevPx) / Math.max(dt, 0.001);

      // spawn obstacles / gems on accumulated probability (per second)
      g.spawnAcc += g.spawn * dt;
      while (g.spawnAcc >= 1) {
        g.spawnAcc -= 1;
        const lane = Math.floor(Math.random() * LANES);
        const roll = Math.random();
        const kind: Obstacle["kind"] = roll < 0.55 ? "barrier" : roll < 0.82 ? "rival" : "oil";
        // never spawn on top of an existing obstacle in the same lane
        if (!g.obstacles.some((o) => o.lane === lane && o.y < 60)) {
          g.obstacles.push({ lane, y: -40, kind, wobble: Math.random() * Math.PI * 2 });
        }
      }
      g.gemAcc += g.spawn * 0.5 * dt;
      while (g.gemAcc >= 1) {
        g.gemAcc -= 1;
        g.gemsList.push({ lane: Math.floor(Math.random() * LANES), y: -24, spin: 0 });
      }

      // advance world
      for (const o of g.obstacles) {
        o.y += spd * dt;
        o.wobble += dt * 4;
      }
      for (const gem of g.gemsList) {
        gem.y += spd * dt;
        gem.spin += dt * 5;
      }
      for (const s of g.streaks) {
        s.y += spd * dt * s.spd;
        if (s.y > Hn) {
          s.y = -s.len;
          s.x = 12 + Math.random() * (Wn - 24);
        }
      }
      g.obstacles = g.obstacles.filter((o) => o.y < Hn + 60);
      g.gemsList = g.gemsList.filter((gem) => gem.y < Hn + 40);

      const pLane = Math.round((g.px - Wn / LANES / 2) / (Wn / LANES));
      for (const o of g.obstacles) {
        if (o.lane === pLane && o.y > PY - 18 && o.y < PY + 40) {
          if (o.kind === "oil") {
            if (g.slow <= 0 && soundOn) playShift(0.15);
            g.slow = 1.4;
            g.shake = 0.5;
            o.y = Hn + 100;
          } else if (g.grace > 0) {
            // crash-proof buffer after a level change: ghost through it
            o.y = Hn + 100;
          } else {
            g.shake = 1;
            draw(ctx, g, dimsNow);
            endRun(g, true);
            return;
          }
        }
      }
      g.gemsList = g.gemsList.filter((gem) => {
        if (gem.lane === pLane && gem.y > PY - 14 && gem.y < PY + 44) {
          g.gems += 1;
          if (soundOn) playShift(0.08);
          return false;
        }
        return true;
      });

      // throttled HUD sync (~8fps is plenty for text)
      hudAcc += dt;
      if (hudAcc > 0.12) {
        hudAcc = 0;
        setHud({
          distance: Math.floor(g.totalDistance + g.distance),
          gems: g.totalGems + g.gems,
          t: Math.min(1, g.elapsed / cfg.dur),
        });
      }

      // sector complete when the clock runs out — roll straight into the next
      if (g.elapsed >= cfg.dur) {
        g.alive = false;
        cancelAnimationFrame(g.raf);
        if (soundOn) playShift(0.3);
        if (lvl < LEVELS.length - 1) {
          startLevel(lvl + 1);
        } else {
          g.totalDistance += g.distance;
          g.totalGems += g.gems;
          g.distance = 0;
          g.gems = 0;
          endRun(g, false);
        }
        return;
      }

      draw(ctx, g, dimsNow);
      g.raf = requestAnimationFrame(tick);
    };
    g.raf = requestAnimationFrame(tick);
  }, [draw, endRun, soundOn]);

  // stop the loop if the component unmounts mid-run
  useEffect(() => {
    const g = gameRef.current;
    return () => {
      g.alive = false;
      cancelAnimationFrame(g.raf);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const sync = () => {
      dimsRef.current = readDims(stage);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state !== "playing") return;
      const g = gameRef.current;
      if (e.key === "ArrowLeft" || e.key === "a") g.lane = Math.max(0, g.lane - 1);
      if (e.key === "ArrowRight" || e.key === "d") g.lane = Math.min(LANES - 1, g.lane + 1);
      if (e.key === "ArrowUp" || e.key === "w") g.lane = Math.max(0, g.lane - 1);
      if (e.key === "ArrowDown" || e.key === "s") g.lane = Math.min(LANES - 1, g.lane + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      if (state !== "playing") return;
      if (Math.abs(e.deltaY) < 4) return;
      e.preventDefault();
      const g = gameRef.current;
      g.lane = Math.max(0, Math.min(LANES - 1, g.lane + (e.deltaY > 0 ? 1 : -1)));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [state]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let startX: number | null = null;
    let startY: number | null = null;
    const down = (e: PointerEvent) => {
      startX = e.clientX;
      startY = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (startX === null || startY === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = null;
      startY = null;
      const g = gameRef.current;
      if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) >= 24) {
        g.lane = Math.max(0, Math.min(LANES - 1, g.lane + (dx > 0 ? 1 : -1)));
      } else if (Math.abs(dy) >= 24) {
        g.lane = Math.max(0, Math.min(LANES - 1, g.lane + (dy > 0 ? 1 : -1)));
      }
    };
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointerup", up);
    return () => {
      stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointerup", up);
    };
  }, []);

  const onSteer = (dir: -1 | 1) => {
    if (state !== "playing") return;
    const g = gameRef.current;
    g.lane = Math.max(0, Math.min(LANES - 1, g.lane + dir));
  };

  const totalRun = LEVELS.reduce((s, l) => s + l.dur, 0);

  // ── sector tracker: 0 ── 1 ── 2 ── 3 ── 4 ── 🏆 ─────────────────────────
  // node i is level i; the link after it fills as you race that level
  const nodeState = (i: number): "done" | "active" | "todo" => {
    if (state === "done") return "done";
    if (i < level) return "done";
    if (i === level) return state === "playing" || state === "crash" ? "active" : "todo";
    return "todo";
  };
  const linkFill = (i: number): number => {
    if (state === "done") return 1;
    if (i < level) return 1;
    if (i === level && (state === "playing" || state === "crash")) return hud.t;
    return 0;
  };

  return (
    <div className="gridrun">
      <div ref={stageRef} className="gridrun-stage">
        <canvas ref={canvasRef} className="gridrun-canvas" aria-label="Grid Run game" />

        {state === "playing" && (
          <div className="gridrun-track mono" aria-label="Sector progress">
            {LEVELS.map((cfg, i) => (
              <Fragment key={cfg.label}>
                <div className={`gridrun-node gridrun-node--${nodeState(i)}`}>
                  <span className="gridrun-node-num">{nodeState(i) === "done" ? "✓" : i}</span>
                </div>
                <div className="gridrun-link">
                  <div className="gridrun-link-fill" style={{ transform: `scaleX(${linkFill(i)})` }} />
                </div>
              </Fragment>
            ))}
            <div className="gridrun-node gridrun-node--trophy">
              <span className="gridrun-node-num">🏆</span>
            </div>
          </div>
        )}

        {state === "playing" && (
          <div className="gridrun-hud mono">
            <span>{hud.distance}m</span>
            <span className="gridrun-hud-gems">◆ {hud.gems}</span>
          </div>
        )}

        {state === "playing" && flashKey > 0 && (
          <div key={flashKey} className="gridrun-flash" aria-hidden="true">
            <span className="gridrun-flash-label display">LEVEL {level}</span>
          </div>
        )}

        {state === "idle" && (
          <div className="gridrun-overlay">
            <p className="gc-copy display gridrun-title">GRID RUN</p>
            <p className="gc-copy">
              Five timed sectors, ~{Math.round(totalRun / 60)} min flat out. Dodge barriers &amp; rivals,
              oil costs you speed, gems are +80. Arrow keys, scroll wheel, swipe, or the buttons below.
            </p>
            <button className="btn" type="button" onClick={() => startLevel(0)} data-cursor="link">
              <span>Lights Out — GO</span>
            </button>
          </div>
        )}

        {(state === "done" || state === "crash") && (
          <div className="gridrun-overlay gridrun-overlay--results">
            <div className="gridrun-results-left">
              {state === "crash" && <p className="gc-copy gc-copy--warn mono">CONTACT! THE RUN ENDS HERE.</p>}
              {state === "done" && <p className="gc-copy display gridrun-title">CHAMPION RUN COMPLETE 🏁</p>}
              <div className="gridrun-results-score display">{fmtMs(finalMs, "gridrun")}</div>
              <button
                className="btn btn--ghost gridrun-again"
                type="button"
                onClick={() => startLevel(0)}
                data-cursor="link"
              >
                <span>Run It Again</span>
              </button>
            </div>
            <div className="gridrun-results-right">
              <SubmitScore game="gridrun" ms={finalMs} formOnly onDone={() => setState("idle")} />
            </div>
          </div>
        )}
      </div>

      <div className="gridrun-touch">
        <button type="button" onPointerDown={() => onSteer(-1)} aria-label="Move left" data-cursor="link">◀</button>
        <button type="button" onPointerDown={() => onSteer(1)} aria-label="Move right" data-cursor="link">▶</button>
      </div>
    </div>
  );
}

/** tiny F1 silhouette used for both the player and rivals */
function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tilt: number,
  body: string,
  dark: string,
  glow = false,
  slipping = false
) {
  ctx.save();
  ctx.translate(x, y + 26);
  ctx.rotate(tilt);
  ctx.translate(0, -26);
  if (glow) {
    ctx.shadowColor = body;
    ctx.shadowBlur = slipping ? 6 : 16;
  }
  // rear wing
  ctx.fillStyle = dark;
  ctx.fillRect(-18, 44, 36, 6);
  // body
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, 0); // nose tip
  ctx.lineTo(6, 14);
  ctx.lineTo(8, 30);
  ctx.lineTo(14, 34);
  ctx.lineTo(14, 46);
  ctx.lineTo(-14, 46);
  ctx.lineTo(-14, 34);
  ctx.lineTo(-8, 30);
  ctx.lineTo(-6, 14);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // front wing
  ctx.fillStyle = dark;
  ctx.fillRect(-16, 2, 32, 4);
  // wheels
  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(-19, 8, 6, 12);
  ctx.fillRect(13, 8, 6, 12);
  ctx.fillRect(-20, 32, 7, 13);
  ctx.fillRect(13, 32, 7, 13);
  // cockpit + halo
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(0, 24, 5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export { toLeaderboardMs, rawScore, LEVELS };
