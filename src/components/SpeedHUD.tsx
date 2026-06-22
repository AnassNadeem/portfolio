import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "../lib/gsap";
import { useApp } from "../context/AppContext";
import { on as busOn, getLastPath } from "../lib/bus";
import "./SpeedHUD.css";

const GEARS = [0, 26, 62, 104, 150, 198, 246, 292, 326];
const MAX_SPEED = 346;
const ANGLE = (v: number) => -120 + (Math.min(v, MAX_SPEED) / MAX_SPEED) * 240;

type Pt = { x: number; y: number };

/** The racing line, miniaturized — fills with accent as the lap progresses */
function MiniMap({ progressRef }: { progressRef: React.RefObject<number> }) {
  const [points, setPoints] = useState<Pt[] | null>(() => getLastPath());
  const fillRef = useRef<SVGPolylineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const lenRef = useRef(0);

  useEffect(() => busOn("path", ({ points }) => setPoints(points)), []);

  const W = 44;
  const H = 64;
  const pts = points?.map((p) => `${(3 + p.x * (W - 6)).toFixed(1)},${(3 + p.y * (H - 6)).toFixed(1)}`).join(" ");

  useEffect(() => {
    if (fillRef.current) {
      lenRef.current = fillRef.current.getTotalLength();
      fillRef.current.style.strokeDasharray = String(lenRef.current);
    }
  }, [pts]);

  useEffect(() => {
    if (!points) return;
    const tick = () => {
      const p = progressRef.current ?? 0;
      if (fillRef.current && lenRef.current) {
        fillRef.current.style.strokeDashoffset = String(lenRef.current * (1 - p));
      }
      const dot = dotRef.current;
      if (dot && points.length) {
        const i = Math.min(points.length - 1, Math.floor(p * (points.length - 1)));
        dot.setAttribute("cx", String(3 + points[i].x * (W - 6)));
        dot.setAttribute("cy", String(3 + points[i].y * (H - 6)));
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [points, progressRef]);

  if (!pts) return null;

  return (
    <svg className="hud-map" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={pts} className="hud-map-base" />
      <polyline points={pts} className="hud-map-fill" ref={fillRef} />
      <circle ref={dotRef} r="2.2" className="hud-map-dot" />
    </svg>
  );
}

/** transient race-control messages: sectors, DRS, pit stops, finishes */
export function RaceToasts() {
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: string }[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const push = (text: string, tone = "plain") => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-1), { id, text, tone }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    };
    const offs = [
      busOn("toast", ({ text, tone }) => push(text, tone ?? "plain")),
      busOn("sector", ({ idx, ms, kind }) =>
        push(`S${idx} — ${(ms / 1000).toFixed(3)} ▮`, kind === "purple" ? "purple" : kind === "green" ? "green" : "plain")
      ),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  return (
    <div className="race-toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`race-toast race-toast--${t.tone} mono`}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact telemetry pill, bottom-right. It only asserts itself while you
 * scroll — at rest it fades to a whisper so it never sits "in front" of
 * content you're reading. Hover wakes it.
 */
export default function SpeedHUD() {
  const { ready, soundOn, toggleSound, setGamesOpen, lenisRef, reduced } = useApp();
  const rootRef = useRef<HTMLElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    if (reduced) return;
    let target = 0;
    let display = 0;
    let lastGear = 0;
    let lastMoveT = 0;
    let hovered = false;

    const root = rootRef.current;
    const onEnter = () => {
      hovered = true;
    };
    const onLeave = () => {
      hovered = false;
    };
    root?.addEventListener("pointerenter", onEnter);
    root?.addEventListener("pointerleave", onLeave);

    const lenis = lenisRef.current;
    const onLenis = (e: { velocity: number; progress: number }) => {
      target = Math.min(MAX_SPEED, Math.abs(e.velocity) * 2.4);
      progressRef.current = e.progress;
      if (Math.abs(e.velocity) > 0.5) lastMoveT = performance.now();
    };
    lenis?.on("scroll", onLenis);

    let lastY = window.scrollY;
    const onNative = () => {
      const y = window.scrollY;
      target = Math.min(MAX_SPEED, Math.abs(y - lastY) * 2.4);
      lastY = y;
      lastMoveT = performance.now();
      const max = document.documentElement.scrollHeight - innerHeight;
      progressRef.current = max > 0 ? y / max : 0;
    };
    if (!lenis) window.addEventListener("scroll", onNative, { passive: true });

    const tick = () => {
      target *= 0.92;
      display += (target - display) * 0.14;
      const v = Math.round(display);
      if (speedRef.current) speedRef.current.textContent = String(v);
      if (needleRef.current) needleRef.current.setAttribute("transform", `rotate(${ANGLE(display)} 40 42)`);
      let gear = 0;
      for (let i = 0; i < GEARS.length; i++) if (v >= GEARS[i]) gear = i;
      if (gearRef.current && gear !== lastGear) {
        lastGear = gear;
        gearRef.current.textContent = gear === 0 ? "N" : String(gear);
        gsap.fromTo(gearRef.current, { scale: 1.3 }, { scale: 1, duration: 0.3 });
      }
      // park the HUD when idle — wake it while moving or hovered
      if (root) {
        const idle = performance.now() - lastMoveT > 1800;
        root.style.opacity = hovered || !idle ? "1" : "0.22";
      }
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      lenis?.off("scroll", onLenis);
      window.removeEventListener("scroll", onNative);
      root?.removeEventListener("pointerenter", onEnter);
      root?.removeEventListener("pointerleave", onLeave);
    };
  }, [lenisRef, reduced]);

  if (reduced) return null;

  const ticks = Array.from({ length: 9 }, (_, i) => -120 + i * 30);

  return (
    <motion.aside
      className="hud"
      ref={rootRef}
      initial={{ y: 60, opacity: 0 }}
      animate={ready ? { y: 0 } : {}}
      transition={{ duration: 0.7, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden="true"
    >
      <div className="hud-gauge">
        <svg viewBox="0 0 80 80">
          {ticks.map((a, i) => (
            <line
              key={a}
              x1="40"
              y1="9"
              x2="40"
              y2={i % 2 === 0 ? "15" : "12.5"}
              className={a > 60 ? "hud-tick hud-tick--red" : "hud-tick"}
              transform={`rotate(${a} 40 42)`}
            />
          ))}
          <g ref={needleRef} transform="rotate(-120 40 42)">
            <line x1="40" y1="42" x2="40" y2="15" className="hud-needle" />
          </g>
          <circle cx="40" cy="42" r="3.6" className="hud-hub" />
        </svg>
        <span className="hud-gear-val" ref={gearRef}>N</span>
      </div>

      <div className="hud-readout">
        <span className="hud-speed-val" ref={speedRef}>0</span>
        <span className="hud-unit mono">KM/H</span>
      </div>

      <MiniMap progressRef={progressRef} />

      <div className="hud-actions">
        <button className={`hud-btn mono ${soundOn ? "is-on" : ""}`} onClick={toggleSound} data-cursor="link">
          {soundOn ? "SND✓" : "SND✗"}
        </button>
        <button className="hud-btn hud-btn--arcade mono" onClick={() => setGamesOpen(true)} data-cursor="link">
          ARCADE
        </button>
      </div>
    </motion.aside>
  );
}
