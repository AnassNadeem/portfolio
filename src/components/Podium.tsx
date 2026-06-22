import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { on as busOn } from "../lib/bus";
import { setPending } from "../lib/podium-bridge";
import { fmtMs } from "../lib/leaderboard";
import "./Podium.css";

/** champagne + ticker tape on the finish line */
function Confetti({ accent }: { accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const colors = [accent, "#f5f5f7", "#ffd320", "#2bd354"];
    const bits = Array.from({ length: 130 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      vy: 2.2 + Math.random() * 3.4,
      vx: -1.2 + Math.random() * 2.4,
      rot: Math.random() * Math.PI,
      vr: -0.12 + Math.random() * 0.24,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let raf = 0;
    let alive = true;
    const draw = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const b of bits) {
        b.y += b.vy;
        b.x += b.vx + Math.sin(b.y * 0.02) * 0.8;
        b.rot += b.vr;
        if (b.y > canvas.height + 30) {
          b.y = -20;
          b.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.c;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [accent]);
  return <canvas ref={ref} className="podium-confetti" aria-hidden="true" />;
}

export default function Podium() {
  const { accent, setGamesOpen, scrollTo, unlockGold, goldUnlocked } = useApp();
  const [result, setResult] = useState<{ ms: number; pb: boolean } | null>(null);
  const [newGold, setNewGold] = useState(false);

  useEffect(
    () =>
      busOn("finish", ({ ms, pb }) => {
        setNewGold(!goldUnlocked);
        unlockGold(); // finishing a lap unlocks the champion livery
        setResult({ ms, pb });
      }),
    [unlockGold, goldUnlocked]
  );

  const close = () => setResult(null);

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          className="podium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          role="dialog"
          aria-label="Lap complete"
        >
          <Confetti accent={accent} />
          <motion.div
            className="podium-card"
            initial={{ y: 60, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <button className="podium-close mono" onClick={close} aria-label="Close" data-cursor="link">✕</button>
            <div className="podium-flag" aria-hidden="true" />
            <div className="mono podium-eyebrow">CHEQUERED FLAG — LAP COMPLETE</div>
            <div className="podium-time display">{fmtMs(result.ms, "hotlap")}</div>
            {result.pb && <div className="podium-pb mono">▰ NEW PERSONAL BEST</div>}
            {newGold && (
              <div className="podium-gold mono">🏆 CHAMPION GOLD LIVERY UNLOCKED — CHECK THE GARAGE SWATCHES</div>
            )}
            <p className="podium-copy">
              You just read the whole lap — that's the full pitch. P1 move: let's talk.
            </p>
            <div className="podium-ctas">
              <button
                className="btn"
                onClick={() => {
                  close();
                  scrollTo("#contact");
                }}
                data-cursor="link"
              >
                <span>Sign Me For Your Team</span>
                <span className="arrow">▸</span>
              </button>
              <button
                className="btn btn--ghost"
                onClick={() => {
                  setPending({ game: "hotlap", ms: result.ms });
                  close();
                  setGamesOpen(true);
                }}
                data-cursor="link"
              >
                <span>Join Leaderboard</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
