import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "../lib/gsap";
import { liveries, GOLD_LIVERY } from "../data/portfolio";

type Livery = { name: string; hex: string };

type AppState = {
  /** preloader finished — gates hero entrance animations */
  ready: boolean;
  setReady: (v: boolean) => void;
  /** current livery hex — repaints the 3D car AND the whole site accent */
  accent: string;
  setAccent: (hex: string) => void;
  /** available liveries (gold appears once unlocked) */
  liveryList: Livery[];
  goldUnlocked: boolean;
  unlockGold: () => void;
  /** rev signal: increments every time the user revs the car */
  revCount: number;
  rev: () => void;
  soundOn: boolean;
  toggleSound: () => void;
  reduced: boolean;
  lenisRef: React.RefObject<Lenis | null>;
  /** live scroll velocity (px/frame, signed) — drives lights, streaks, HUD */
  velocityRef: React.RefObject<number>;
  scrollTo: (target: string | number) => void;
  /** hero camera: TV crane vs onboard halo cam */
  camMode: "tv" | "onboard";
  toggleCam: () => void;
  gamesOpen: boolean;
  setGamesOpen: (v: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
};

const Ctx = createContext<AppState | null>(null);

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function applyAccent(hex: string) {
  const root = document.documentElement;
  const [r, g, b] = hexToRgb(hex);
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  root.style.setProperty("--on-accent", lum > 0.55 ? "#0a0a0c" : "#f5f5f7");
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [accent, setAccentState] = useState(liveries[0].hex);
  const [goldUnlocked, setGoldUnlocked] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("apex_gold") === "1"
  );
  const [revCount, setRevCount] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [camMode, setCamMode] = useState<"tv" | "onboard">("tv");
  const [gamesOpen, setGamesOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);
  const velocityRef = useRef(0);

  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Smooth scroll (Lenis) wired into GSAP's ticker + ScrollTrigger
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.105, smoothWheel: true });
    lenisRef.current = lenis;
    lenis.on("scroll", (e: { velocity: number }) => {
      velocityRef.current = e.velocity;
      ScrollTrigger.update();
    });
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // hold the grid until the preloader finishes
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    if (!ready) return;
    lenisRef.current?.start();
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [ready]);

  useEffect(() => {
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    applyAccent(liveries[0].hex);
    const original = document.title;
    const onVis = () => {
      document.title = document.hidden ? "📻 BOX BOX - come back!" : original;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const setAccent = useCallback((hex: string) => {
    setAccentState(hex);
    applyAccent(hex);
  }, []);

  const unlockGold = useCallback(() => {
    setGoldUnlocked((was) => {
      if (!was) {
        try {
          localStorage.setItem("apex_gold", "1");
        } catch {
          /* fine */
        }
      }
      return true;
    });
  }, []);

  const liveryList = useMemo(
    () => (goldUnlocked ? [...liveries, GOLD_LIVERY] : liveries),
    [goldUnlocked]
  );

  const rev = useCallback(() => setRevCount((c) => c + 1), []);
  const toggleSound = useCallback(() => setSoundOn((s) => !s), []);
  const toggleCam = useCallback(() => setCamMode((m) => (m === "tv" ? "onboard" : "tv")), []);

  const scrollTo = useCallback((target: string | number) => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(target, { offset: typeof target === "string" ? -72 : 0, duration: 1.4 });
    } else {
      if (typeof target === "number") window.scrollTo({ top: target });
      else document.querySelector(target)?.scrollIntoView();
    }
  }, []);

  const value = useMemo(
    () => ({
      ready,
      setReady,
      accent,
      setAccent,
      liveryList,
      goldUnlocked,
      unlockGold,
      revCount,
      rev,
      soundOn,
      toggleSound,
      reduced,
      lenisRef,
      velocityRef,
      scrollTo,
      camMode,
      toggleCam,
      gamesOpen,
      setGamesOpen,
      paletteOpen,
      setPaletteOpen,
    }),
    [
      ready,
      accent,
      setAccent,
      liveryList,
      goldUnlocked,
      unlockGold,
      revCount,
      rev,
      soundOn,
      toggleSound,
      reduced,
      scrollTo,
      camMode,
      toggleCam,
      gamesOpen,
      paletteOpen,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}
