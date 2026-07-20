import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { emit as busEmit } from "../lib/bus";
import { getBoard, personalBest, fmtMs, type Game, type Entry } from "../lib/leaderboard";
import { takePending } from "../lib/podium-bridge";
import { supabaseReady } from "../lib/supabase";
import { playShift } from "../lib/sound";
import GridRunGame from "./games/GridRunGame";
import SubmitScore from "./SubmitScore";
import "./GameCenter.css";

const TABS: { id: Game | "ranks"; label: string }[] = [
  { id: "reaction", label: "LIGHTS OUT" },
  { id: "pitstop", label: "PIT STOP" },
  { id: "hotlap", label: "HOT LAP" },
  { id: "gridrun", label: "GRID RUN" },
  { id: "ranks", label: "RANKS" },
];

/** ── GAME 1: LIGHTS OUT (reaction) ── */
function ReactionGame({ soundOn }: { soundOn: boolean }) {
  const [state, setState] = useState<"idle" | "armed" | "go" | "false" | "done">("idle");
  const [ms, setMs] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const goT = useRef(0);
  const timer = useRef<number>(0);

  const arm = () => {
    setState("armed");
    if (soundOn) playShift();
    const lights = document.querySelectorAll(".gc-light");
    lights.forEach((l, i) =>
      setTimeout(() => l.classList.add("is-lit"), i * 160)
    );
    timer.current = window.setTimeout(() => {
      lights.forEach((l) => l.classList.remove("is-lit"));
      goT.current = performance.now();
      setState("go");
    }, 5 * 160 + 500 + Math.random() * 1600);
  };

  const hit = () => {
    const s = stateRef.current;
    if (s === "armed") {
      clearTimeout(timer.current);
      document.querySelectorAll(".gc-light").forEach((l) => l.classList.remove("is-lit"));
      setState("false");
    } else if (s === "go") {
      setMs(Math.round(performance.now() - goT.current));
      setState("done");
    }
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className={`gc-game${state === "done" ? " gc-game--results" : ""}`}>
      {state !== "done" && (
        <div className="gc-lights" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="gc-light" />
          ))}
        </div>
      )}

      {state === "idle" && (
        <>
          <p className="gc-copy">Five lights. They go out — you click. Average human: ~273ms. F1 driver: ~200ms.</p>
          <button className="btn" onClick={arm} data-cursor="link"><span>Arm The Lights</span></button>
        </>
      )}
      {(state === "armed" || state === "go") && (
        <button className={`gc-pad ${state === "go" ? "is-go" : ""}`} onPointerDown={hit} data-cursor="link">
          {state === "go" ? "CLICK!" : "WAIT FOR IT…"}
        </button>
      )}
      {state === "false" && (
        <>
          <p className="gc-copy gc-copy--warn">⚠ FALSE START — the stewards are watching.</p>
          <button className="btn btn--ghost" onClick={arm} data-cursor="link"><span>Again</span></button>
        </>
      )}
      {state === "done" && (
        <div className="gc-results-split">
          <div className="gc-results-left">
            <p className="gc-copy gc-copy--go mono">LIGHTS OUT</p>
            <div className="gc-results-score display">{fmtMs(ms, "reaction")}</div>
            <button className="btn btn--ghost" type="button" onClick={arm} data-cursor="link">
              <span>Run It Again</span>
            </button>
          </div>
          <div className="gc-results-right">
            <SubmitScore game="reaction" ms={ms} formOnly onDone={() => setState("idle")} />
          </div>
        </div>
      )}
    </div>
  );
}

/** ── GAME 2: PIT STOP (hit all four wheels) ── */
function PitStopGame({ soundOn }: { soundOn: boolean }) {
  const [state, setState] = useState<"idle" | "live" | "done">("idle");
  const [hitSet, setHitSet] = useState<Set<number>>(new Set());
  const [ms, setMs] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const startT = useRef(0);

  const go = () => {
    setHitSet(new Set());
    setPenalty(0);
    setState("live");
    startT.current = performance.now();
    if (soundOn) playShift();
  };

  const tap = (i: number) => {
    if (state !== "live") return;
    if (soundOn) playShift(0.12);
    setHitSet((prev) => {
      if (prev.has(i)) {
        setPenalty((p) => p + 200);
        return prev;
      }
      const next = new Set(prev);
      next.add(i);
      if (next.size === 4) {
        setMs(Math.round(performance.now() - startT.current) + penalty);
        setState("done");
      }
      return next;
    });
  };

  return (
    <div className={`gc-game${state === "done" ? " gc-game--results" : ""}`}>
      {state !== "done" && (
        <div className="gc-pit">
          <svg viewBox="0 0 120 220" className="gc-pit-car" aria-hidden="true">
            <rect x="44" y="6" width="32" height="14" rx="3" fill="#1d1d23" />
            <path d="M 50 24 L 70 24 L 76 96 L 78 196 L 42 196 L 44 96 Z" fill="var(--accent)" />
            <rect x="38" y="198" width="44" height="10" rx="2" fill="#1d1d23" />
            <circle cx="60" cy="86" r="9" fill="#0a0a0c" stroke="#2c2c33" strokeWidth="2.5" />
          </svg>
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              className={`gc-wheel gc-wheel--${i} ${state === "live" && !hitSet.has(i) ? "is-due" : ""} ${hitSet.has(i) ? "is-done" : ""}`}
              onPointerDown={() => tap(i)}
              aria-label={`Wheel ${i + 1}`}
              data-cursor="link"
            />
          ))}
        </div>
      )}

      {state === "idle" && (
        <>
          <p className="gc-copy">Hit all four wheel guns as fast as you can. The 2023 world record is 1.80s. Double-taps cost +0.2s.</p>
          <button className="btn" onClick={go} data-cursor="link"><span>Car In The Box — GO</span></button>
        </>
      )}
      {state === "live" && (
        <p className="gc-copy gc-copy--go">
          GUNS ON — {4 - hitSet.size} WHEEL{4 - hitSet.size !== 1 ? "S" : ""} TO GO
          {penalty > 0 && <span className="gc-copy--warn"> · +{(penalty / 1000).toFixed(1)}s PENALTY</span>}
        </p>
      )}
      {state === "done" && (
        <div className="gc-results-split">
          <div className="gc-results-left">
            <p className="gc-copy gc-copy--go mono">PIT STOP</p>
            <div className="gc-results-score display">{fmtMs(ms, "pitstop")}</div>
            <button className="btn btn--ghost" type="button" onClick={go} data-cursor="link">
              <span>Run It Again</span>
            </button>
          </div>
          <div className="gc-results-right">
            <SubmitScore game="pitstop" ms={ms} formOnly onDone={() => setState("idle")} />
          </div>
        </div>
      )}
    </div>
  );
}

/** ── GAME 3: HOT LAP (the scroll itself) ── */
function HotLapGame({ close, pendingMs }: { close: () => void; pendingMs: number | null }) {
  const { scrollTo } = useApp();
  const pb = personalBest("hotlap");

  if (pendingMs) {
    return (
      <div className="gc-game">
        <p className="gc-copy">Chequered flag! Post your lap to the grid:</p>
        <SubmitScore game="hotlap" ms={pendingMs} onDone={() => {}} />
      </div>
    );
  }

  return (
    <div className="gc-game">
      <p className="gc-copy">
        The whole site is the circuit. The timer starts on your first scroll and stops at the
        chequered line in the footer — three timed sectors on the way. Splits flash green; purple
        means personal best.
      </p>
      <div className="gc-pb mono">
        PERSONAL BEST — <span className="text-accent">{pb ? fmtMs(pb, "hotlap") : "NO TIME SET"}</span>
      </div>
      <button
        className="btn"
        onClick={() => {
          close();
          busEmit("lapReset");
          scrollTo(0);
        }}
        data-cursor="link"
      >
        <span>Start Flying Lap</span>
        <span className="arrow">▸</span>
      </button>
    </div>
  );
}

/** ── RANKS ── */
function Ranks() {
  const [game, setGame] = useState<Game>("reaction");
  const [board, setBoard] = useState<Entry[]>([]);
  const [refresh, setRefresh] = useState(0);

  const loadBoard = useCallback(() => {
    let alive = true;
    void getBoard(game).then((b) => alive && setBoard(b));
    return () => {
      alive = false;
    };
  }, [game]);

  useEffect(() => loadBoard(), [loadBoard, refresh]);

  useEffect(() => {
    const onPosted = () => setRefresh((n) => n + 1);
    window.addEventListener("apex:score-posted", onPosted);
    return () => window.removeEventListener("apex:score-posted", onPosted);
  }, []);

  return (
    <div className="gc-game">
      <div className="gc-rank-tabs">
        {(["reaction", "pitstop", "hotlap", "gridrun"] as Game[]).map((g) => (
          <button key={g} className={`gc-rank-tab mono ${game === g ? "is-active" : ""}`} onClick={() => setGame(g)} data-cursor="link">
            {g === "reaction" ? "LIGHTS OUT" : g === "pitstop" ? "PIT STOP" : g === "hotlap" ? "HOT LAP" : "GRID RUN"}
          </button>
        ))}
      </div>
      <table className="gc-table">
        <thead>
          <tr className="mono">
            <th>POS</th>
            <th>DRIVER</th>
            <th>TIME</th>
          </tr>
        </thead>
        <tbody>
          {board.map((e, i) => (
            <tr key={`${e.name}-${e.ms}-${i}`} className={e.you ? "is-you" : ""}>
              <td className="mono">P{i + 1}</td>
              <td>
                <span className="gc-driver display">{e.name}</span>
                {e.bot && <span className="gc-tag mono">BOT</span>}
                {e.you && <span className="gc-tag gc-tag--you mono">YOU</span>}
              </td>
              <td className="mono">{fmtMs(e.ms, game)}</td>
            </tr>
          ))}
          {board.length === 0 && (
            <tr>
              <td colSpan={3} className="mono gc-empty">NO TIMES YET — SET ONE.</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="gc-fineprint mono">
        {supabaseReady
          ? "ONE EMAIL = ONE CALL SIGN FOR ALL GAMES. BOTS ARE FIXED — YOUR TIME NEEDS EMAIL TO SAVE GLOBALLY."
          : "TIMES RANK THIS SESSION ONLY — CLEARED ON REFRESH."}
      </p>
    </div>
  );
}

export default function GameCenter() {
  const { gamesOpen, setGamesOpen, soundOn, lenisRef } = useApp();
  const [tab, setTab] = useState<Game | "ranks">("reaction");
  const [pendingMs, setPendingMs] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setGamesOpen(false), [setGamesOpen]);

  useEffect(() => {
    if (!gamesOpen) return;
    const p = takePending();
    if (p) {
      setTab(p.game);
      setPendingMs(p.ms);
    } else {
      setPendingMs(null);
    }
    lenisRef.current?.stop();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lenisRef.current?.start();
    };
  }, [gamesOpen, close, lenisRef]);

  // Trackpad / wheel scroll inside the arcade modal (Lenis is paused while open)
  useEffect(() => {
    if (!gamesOpen) return;
    const body = bodyRef.current;
    if (!body) return;

    const onWheel = (e: WheelEvent) => {
      if (!body.contains(e.target as Node)) return;
      e.stopPropagation();

      const { scrollTop, scrollHeight, clientHeight } = body;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll <= 0) return;

      const atTop = scrollTop <= 0;
      const atBottom = scrollTop >= maxScroll - 1;
      if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
        e.preventDefault();
      }
    };

    body.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => body.removeEventListener("wheel", onWheel, { capture: true });
  }, [gamesOpen, tab]);

  return (
    <AnimatePresence>
      {gamesOpen && (
        <motion.div
          className="gc-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          role="dialog"
          aria-label="Arcade"
        >
          <motion.div
            className={`gc-modal${tab === "gridrun" ? " gc-modal--gridrun" : ""}`}
            initial={{ y: 50, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="gc-head">
              <div className="gc-title">
                <span className="mono">RACE CONTROL — ARCADE</span>
              </div>
              <button className="gc-close mono" onClick={close} aria-label="Close arcade" data-cursor="link">ESC ✕</button>
            </div>

            <div className="gc-tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={`gc-tab mono ${tab === t.id ? "is-active" : ""}`}
                  onClick={() => setTab(t.id)}
                  data-cursor="link"
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="gc-body" ref={bodyRef}>
              {tab === "reaction" && <ReactionGame soundOn={soundOn} />}
              {tab === "pitstop" && <PitStopGame soundOn={soundOn} />}
              {tab === "hotlap" && <HotLapGame close={close} pendingMs={pendingMs} />}
              {tab === "gridrun" && <GridRunGame soundOn={soundOn} />}
              {tab === "ranks" && <Ranks />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
