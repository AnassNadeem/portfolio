import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { on as busOn, emit as busEmit } from "../lib/bus";
import { TOUR_CAPTIONS } from "../data/portfolio";
import "./HotLapTour.css";

const TOUR_SECONDS = 28;

/**
 * The 30-second hot lap: an automated cinematic scroll of the whole site
 * with radio captions. Any user input hands control back instantly.
 * It ends on the finish line — so the podium fires as the natural finale.
 */
export default function HotLapTour() {
  const { lenisRef, reduced, scrollTo } = useApp();
  const [active, setActive] = useState(false);
  const [caption, setCaption] = useState(TOUR_CAPTIONS[0].text);
  const activeRef = useRef(false);

  useEffect(() => {
    return busOn("hotlap", () => {
      if (activeRef.current) return;
      if (reduced || !lenisRef.current) {
        scrollTo("#contact");
        return;
      }
      const lenis = lenisRef.current;
      activeRef.current = true;
      setActive(true);
      busEmit("lapReset");
      // from the grid, lights out, go
      lenis.scrollTo(0, { duration: 0.6 });
      window.setTimeout(() => {
        if (!activeRef.current) return;
        const max = document.documentElement.scrollHeight - innerHeight;
        lenis.scrollTo(max, { duration: TOUR_SECONDS, easing: (t: number) => t, lock: false });
      }, 750);
    });
  }, [lenisRef, reduced, scrollTo]);

  // captions follow scroll progress; user input cancels
  useEffect(() => {
    if (!active) return;
    const lenis = lenisRef.current;

    const onScroll = (e: { progress: number }) => {
      const p = e.progress;
      let text = TOUR_CAPTIONS[0].text;
      for (const c of TOUR_CAPTIONS) if (p >= c.at) text = c.text;
      setCaption(text);
      if (p > 0.985) end(false);
    };
    lenis?.on("scroll", onScroll);

    const cancel = () => end(true);
    const end = (userCancelled: boolean) => {
      if (!activeRef.current) return;
      activeRef.current = false;
      setActive(false);
      if (userCancelled && lenis) {
        // freeze where we are — control back to the driver
        lenis.scrollTo(window.scrollY, { duration: 0.1, force: true });
      }
    };

    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("keydown", cancel);

    return () => {
      lenis?.off("scroll", onScroll);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, lenisRef]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="tour"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          aria-live="polite"
        >
          <div className="tour-card">
            <div className="tour-head mono">
              <span className="tour-rec" aria-hidden="true" /> HOT LAP — ONBOARD WITH RACE ENGINEER
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={caption}
                className="tour-caption"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                📻 {caption}
              </motion.p>
            </AnimatePresence>
            <button
              className="tour-skip mono"
              onClick={() => {
                activeRef.current = false;
                setActive(false);
                lenisRef.current?.scrollTo(window.scrollY, { duration: 0.1, force: true });
              }}
              data-cursor="link"
            >
              TAKE THE WHEEL ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
