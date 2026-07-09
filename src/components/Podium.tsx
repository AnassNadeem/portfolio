import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { on as busOn } from "../lib/bus";
import { setPending } from "../lib/podium-bridge";
import { fmtMs } from "../lib/leaderboard";
import { useGSAP } from "@gsap/react";
import { gsap } from "../lib/gsap";
import "./Podium.css";

/** Chequered sweep — one-shot finish line moment */
function FinishSweep() {
  return <div className="podium-sweep" aria-hidden="true" />;
}

export default function Podium() {
  const { setGamesOpen, scrollTo, unlockGold, goldUnlocked } = useApp();
  const [result, setResult] = useState<{ ms: number; pb: boolean } | null>(null);
  const [newGold, setNewGold] = useState(false);
  const timeRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      busOn("finish", ({ ms, pb }) => {
        setNewGold(!goldUnlocked);
        unlockGold();
        setResult({ ms, pb });
      }),
    [unlockGold, goldUnlocked]
  );

  useGSAP(
    () => {
      if (!result || !timeRef.current) return;
      gsap.fromTo(
        timeRef.current,
        { scale: 1.4, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.7, ease: "back.out(2)" }
      );
    },
    { dependencies: [result] }
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
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <FinishSweep />
          <div className="podium-light-leak" aria-hidden="true" />
          <motion.div
            className="podium-card"
            initial={{ y: 60, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="podium-close mono" onClick={close} aria-label="Close" data-cursor="link">✕</button>
            <div className="podium-flag" aria-hidden="true" />
            <div className="mono podium-eyebrow">CHEQUERED FLAG — LAP COMPLETE</div>
            <div className="podium-time display" ref={timeRef}>{fmtMs(result.ms, "hotlap")}</div>
            {result.pb && <div className="podium-pb mono">▰ NEW PERSONAL BEST</div>}
            {newGold && (
              <div className="podium-gold mono">CHAMPION GOLD LIVERY UNLOCKED — CHECK THE GARAGE SWATCHES</div>
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
