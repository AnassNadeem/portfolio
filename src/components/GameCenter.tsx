import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { emit as busEmit } from "../lib/bus";
import { getBoard, submitScore, personalBest, fmtMs, type Game, type Entry } from "../lib/leaderboard";
import { takePending } from "../lib/podium-bridge";
import { supabaseReady } from "../lib/supabase";
import { playShift } from "../lib/sound";
import "./GameCenter.css";

const TABS: { id: Game | "ranks"; label: string }[] = [
  { id: "reaction", label: "LIGHTS OUT" },
  { id: "pitstop", label: "PIT STOP" },
  { id: "hotlap", label: "HOT LAP" },
  { id: "ranks", label: "RANKS" },
];

/** initials + optional email opt-in — arcade style */
function SubmitScore({ game, ms, onDone }: { game: Game; ms: number; onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [alreadyIn, setAlreadyIn] = useState(false);

  const save = async () => {
    if (saved) return;

    // Validate email only when provided
    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setEmailErr("INVALID EMAIL FORMAT");
        return;
      }
      if (!consent) {
        setEmailErr("TICK THE BOX TO JOIN THE GRID");
        return;
      }
    }
    setEmailErr("");

    const result = await submitScore(game, {
      name: name || "AAA",
      ms,
      email: trimmedEmail || undefined,
      consent: trimmedEmail ? consent : false,
    });

    setSaved(true);
    if (result.alreadySignedUp) setAlreadyIn(true);
    setTimeout(onDone, 1200);
  };

  const showSignup = supabaseReady;

  return (
    <div className="gc-submit">
      <div className="gc-submit-time display">{fmtMs(ms, game)}</div>

      <div className="gc-submit-row">
        <label className="mono" htmlFor="gc-initials">INITIALS</label>
        <input
          id="gc-initials"
          className="gc-initials"
          value={name}
          maxLength={3}
          placeholder="AAA"
          onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          autoComplete="off"
        />
      </div>

      {showSignup && (
        <>
          <div className="gc-submit-row">
            <label className="mono" htmlFor="gc-email">EMAIL — OPTIONAL</label>
            <input
              id="gc-email"
              type="email"
              value={email}
              placeholder="join the global grid"
              onChange={(e) => { setEmail(e.target.value); setEmailErr(""); }}
            />
          </div>

          {email.trim() && (
            <label className="gc-consent mono">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              {/* Consent must be opt-in (not pre-ticked) — PECR / UK GDPR */}
              I agree to be contacted about new projects &amp; launches
            </label>
          )}

          {emailErr && <p className="gc-fineprint mono" style={{ color: "var(--accent)" }}>{emailErr}</p>}
        </>
      )}

      {alreadyIn && (
        <p className="gc-fineprint mono">ALREADY ON THE GRID — YOUR TIME STILL COUNTS.</p>
      )}

      <p className="gc-fineprint mono">
        {supabaseReady
          ? "TIMES POST TO THE GLOBAL GRID. EMAIL IS OPTIONAL."
          : "STORED ON THIS DEVICE."}
      </p>

      <button className="btn gc-save" onClick={save} disabled={saved} data-cursor="link">
        <span>{saved ? "POSTED ✓" : "Post To Leaderboard"}</span>
      </button>
    </div>
  );
}

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
    <div className="gc-game">
      <div className="gc-lights" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="gc-light" />
        ))}
      </div>

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
      {state === "done" && <SubmitScore game="reaction" ms={ms} onDone={() => setState("idle")} />}
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
    <div className="gc-game">
      {state !== "done" && (
        <div className="gc-pit">
          {/* top-down car */}
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
      {state === "done" && <SubmitScore game="pitstop" ms={ms} onDone={() => setState("idle")} />}
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

  useEffect(() => {
    let alive = true;
    void getBoard(game).then((b) => alive && setBoard(b));
    return () => {
      alive = false;
    };
  }, [game]);

  return (
    <div className="gc-game">
      <div className="gc-rank-tabs">
        {(["reaction", "pitstop", "hotlap"] as Game[]).map((g) => (
          <button key={g} className={`gc-rank-tab mono ${game === g ? "is-active" : ""}`} onClick={() => setGame(g)} data-cursor="link">
            {g === "reaction" ? "LIGHTS OUT" : g === "pitstop" ? "PIT STOP" : "HOT LAP"}
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
    </div>
  );
}

export default function GameCenter() {
  const { gamesOpen, setGamesOpen, soundOn, lenisRef } = useApp();
  const [tab, setTab] = useState<Game | "ranks">("reaction");
  const [pendingMs, setPendingMs] = useState<number | null>(null);

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
            className="gc-modal"
            initial={{ y: 50, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="gc-head">
              <div className="gc-title">
                <span className="gc-title-led" aria-hidden="true" />
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

            <div className="gc-body">
              {tab === "reaction" && <ReactionGame soundOn={soundOn} />}
              {tab === "pitstop" && <PitStopGame soundOn={soundOn} />}
              {tab === "hotlap" && <HotLapGame close={close} pendingMs={pendingMs} />}
              {tab === "ranks" && <Ranks />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
