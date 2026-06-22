import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "../lib/gsap";
import { useApp } from "../context/AppContext";
import { driver, nav } from "../data/portfolio";
import "./Navbar.css";

export default function Navbar() {
  const { ready, scrollTo, lenisRef, setGamesOpen } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // highlight the section currently in view
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );
    for (const n of nav) {
      const el = document.getElementById(n.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, []);

  // lock page scroll while the mobile menu is open
  useEffect(() => {
    const lenis = lenisRef.current;
    if (open) lenis?.stop();
    else lenis?.start();
  }, [open, lenisRef]);

  const go = (id: string) => {
    setOpen(false);
    // let the menu close before launching the scroll
    setTimeout(() => scrollTo(`#${id}`), open ? 250 : 0);
  };

  return (
    <>
      <motion.header
        className={`nav ${scrolled ? "nav--solid" : ""}`}
        initial={{ y: -90, opacity: 0 }}
        animate={ready ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.55 }}
      >
        <div className="nav-inner">
          <button className="nav-logo" onClick={() => scrollTo(0)} aria-label="Back to top" data-cursor="link">
            <span className="nav-logo-plate">
              <span className="nav-logo-num">{driver.number}</span>
            </span>
            <span className="nav-logo-name">
              {driver.firstName}
              <em>.{driver.lastName.toLowerCase()}</em>
            </span>
          </button>

          <nav className="nav-links" aria-label="Primary">
            {nav.map((n, i) => (
              <button
                key={n.id}
                className={`nav-link mono ${active === n.id ? "is-active" : ""}`}
                onClick={() => go(n.id)}
                onMouseEnter={(e) => {
                  const label = e.currentTarget.querySelector(".nav-link-label");
                  if (label) {
                    gsap.to(label, {
                      duration: 0.45,
                      scrambleText: { text: n.label, chars: "▮▯<>/", speed: 1 },
                    } as gsap.TweenVars);
                  }
                }}
                data-cursor="link"
              >
                <span className="nav-link-idx">0{i + 1}</span>
                <span className="nav-link-label">{n.label}</span>
              </button>
            ))}
          </nav>

          <div className="nav-cta">
            <button className="nav-arcade mono" onClick={() => setGamesOpen(true)} data-cursor="link" aria-label="Open arcade">
              <span className="nav-arcade-dot" /> ARCADE
            </button>
            <a className="btn btn--ghost nav-resume" href={driver.resume} target="_blank" rel="noreferrer" data-cursor="view">
              <span>Resume</span>
              <span className="arrow">↗</span>
            </a>
            <button
              className={`nav-burger ${open ? "is-open" : ""}`}
              onClick={() => setOpen(!open)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="nav-overlay"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.55, ease: [0.83, 0, 0.17, 1] }}
          >
            <div className="nav-overlay-inner">
              {nav.map((n, i) => (
                <motion.button
                  key={n.id}
                  className="nav-overlay-link display"
                  onClick={() => go(n.id)}
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  transition={{ delay: 0.12 + i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="mono">0{i + 1}</span>
                  {n.label}
                </motion.button>
              ))}
              <motion.div
                className="nav-overlay-foot mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.4 }}
              >
                <a href={`mailto:${driver.email}`}>{driver.email}</a>
                <div>
                  <button
                    onClick={() => {
                      setOpen(false);
                      setGamesOpen(true);
                    }}
                    style={{ marginRight: 18 }}
                  >
                    ARCADE
                  </button>
                  <a href={driver.github} target="_blank" rel="noreferrer">GITHUB</a>
                  <a href={driver.linkedin} target="_blank" rel="noreferrer">LINKEDIN</a>
                  <a href={driver.resume} target="_blank" rel="noreferrer">RESUME</a>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
