import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { emit as busEmit } from "../lib/bus";
import { driver, nav } from "../data/portfolio";
import "./CommandPalette.css";

type Item = {
  id: string;
  group: "NAVIGATE" | "ACTIONS" | "LIVERY" | "LINKS";
  label: string;
  hint?: string;
  swatch?: string;
  run: () => void;
};

/** ⌘K — the steering-wheel quick menu */
export default function CommandPalette() {
  const app = useApp();
  const { paletteOpen, setPaletteOpen } = app;
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // global shortcuts: ⌘K / Ctrl+K / "/"
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = (e.target as Element | null)?.closest?.("input, textarea, select");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      } else if (e.key === "/" && !inField && !paletteOpen) {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, setPaletteOpen]);

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setCursor(0);
      app.lenisRef.current?.stop();
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      app.lenisRef.current?.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteOpen]);

  const items = useMemo<Item[]>(() => {
    const close = () => setPaletteOpen(false);
    const go = (id: string) => () => {
      close();
      app.scrollTo(`#${id}`);
    };
    return [
      ...nav.map<Item>((n, i) => ({
        id: `nav-${n.id}`,
        group: "NAVIGATE",
        label: `Sector 0${i + 1} — ${n.label}`,
        run: go(n.id),
      })),
      { id: "top", group: "NAVIGATE", label: "Back to the grid (top)", run: () => { close(); app.scrollTo(0); } },
      { id: "rev", group: "ACTIONS", label: "Rev the engine", hint: "vroom", run: () => { close(); app.rev(); } },
      { id: "box", group: "ACTIONS", label: "Box box — pit stop", hint: "swaps tyres", run: () => { close(); app.scrollTo(0); setTimeout(() => busEmit("pitstop"), 900); } },
      { id: "cam", group: "ACTIONS", label: `Camera — switch to ${app.camMode === "tv" ? "onboard" : "TV"}`, run: () => { close(); app.toggleCam(); app.scrollTo(0); } },
      { id: "tour", group: "ACTIONS", label: "Start the 30-second hot lap tour", run: () => { close(); busEmit("hotlap"); } },
      { id: "lap", group: "ACTIONS", label: "Start a flying lap (timed)", run: () => { close(); busEmit("lapReset"); app.scrollTo(0); } },
      { id: "arcade", group: "ACTIONS", label: "Open the arcade", hint: "games + ranks", run: () => { close(); app.setGamesOpen(true); } },
      { id: "sound", group: "ACTIONS", label: `Sound — turn ${app.soundOn ? "off" : "on"}`, run: () => { close(); app.toggleSound(); } },
      ...app.liveryList.map<Item>((l) => ({
        id: `livery-${l.name}`,
        group: "LIVERY",
        label: `Livery — ${l.name}`,
        swatch: l.hex,
        run: () => { close(); app.setAccent(l.hex); },
      })),
      ...(!app.goldUnlocked
        ? [{ id: "livery-gold-locked", group: "LIVERY" as const, label: "Livery — Champion Gold 🔒", hint: "finish a lap to unlock", run: () => {} }]
        : []),
      { id: "gh", group: "LINKS", label: "GitHub ↗", run: () => { close(); open(driver.github, "_blank"); } },
      { id: "li", group: "LINKS", label: "LinkedIn ↗", run: () => { close(); open(driver.linkedin, "_blank"); } },
      { id: "cv", group: "LINKS", label: "Resume ↗", run: () => { close(); open(driver.resume, "_blank"); } },
      { id: "mail", group: "LINKS", label: `Email — ${driver.email}`, run: () => { close(); location.href = `mailto:${driver.email}`; } },
    ];
  }, [app, setPaletteOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q));
  }, [items, query]);

  const onKeyNav = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(filtered.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      filtered[cursor]?.run();
    }
  };

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  let lastGroup = "";

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          className="cp-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPaletteOpen(false);
          }}
        >
          <motion.div
            className="cp"
            role="dialog"
            aria-label="Command palette"
            initial={{ y: -24, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -16, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cp-head">
              <span className="cp-wheel" aria-hidden="true">⊜</span>
              <input
                ref={inputRef}
                className="cp-input"
                placeholder="Type a command — sectors, livery, actions…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={onKeyNav}
                aria-label="Search commands"
              />
              <span className="cp-kbd mono">ESC</span>
            </div>
            <div className="cp-list" ref={listRef}>
              {filtered.map((item, i) => {
                const showGroup = item.group !== lastGroup;
                lastGroup = item.group;
                return (
                  <div key={item.id}>
                    {showGroup && <div className="cp-group mono">{item.group}</div>}
                    <button
                      className={`cp-item ${i === cursor ? "is-active" : ""}`}
                      data-idx={i}
                      onClick={item.run}
                      onMouseEnter={() => setCursor(i)}
                      data-cursor="link"
                    >
                      {item.swatch && <span className="cp-swatch" style={{ background: item.swatch }} />}
                      <span className="cp-label">{item.label}</span>
                      {item.hint && <span className="cp-hint mono">{item.hint}</span>}
                    </button>
                  </div>
                );
              })}
              {filtered.length === 0 && <div className="cp-empty mono">NO MATCH — TRY "GARAGE" OR "LIVERY"</div>}
            </div>
            <div className="cp-foot mono">
              <span>↑↓ NAVIGATE</span>
              <span>↵ EXECUTE</span>
              <span>⌘K / "/" TOGGLE</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
