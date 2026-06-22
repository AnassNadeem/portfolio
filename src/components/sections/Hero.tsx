import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";
import { gsap, SplitText } from "../../lib/gsap";
import { useApp } from "../../context/AppContext";
import { emit as busEmit } from "../../lib/bus";
import { driver } from "../../data/portfolio";
import "./Hero.css";

const HeroScene = lazy(() => import("../three/HeroScene"));

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.34.96.11-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.62 1.58.23 2.75.12 3.04.73.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </svg>
  );
}

export default function Hero() {
  const { ready, reduced, accent, setAccent, liveryList, rev, scrollTo } = useApp();
  const rootRef = useRef<HTMLElement>(null);
  const [sceneActive, setSceneActive] = useState(true);

  // pause the 3D loop when the hero is far offscreen
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setSceneActive(e.isIntersecting), {
      rootMargin: "120px 0px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useGSAP(
    () => {
      if (!ready || reduced) return;
      const q = gsap.utils.selector(rootRef);
      const tl = gsap.timeline({ delay: 0.15 });

      tl.to(q(".hero-eyebrow"), {
        opacity: 1,
        duration: 1.0,
        scrambleText: { text: `// ${driver.role.toUpperCase()}`, chars: "▮▯/\\<>_", speed: 0.8 },
      } as gsap.TweenVars);

      const split = SplitText.create(q(".hero-title .line"), { type: "chars" });
      tl.from(
        split.chars,
        { yPercent: 118, stagger: 0.03, duration: 1.0, ease: "power4.out" },
        "-=0.55"
      );

      tl.from(
        q(".hero-sub, .hero-ctas, .hero-socials, .hero-garage, .hero-hint"),
        { y: 26, opacity: 0, stagger: 0.09, duration: 0.7, ease: "power3.out" },
        "-=0.5"
      );

      tl.from(q(".hero-scroll"), { opacity: 0, duration: 0.6 }, "-=0.2");

      // parallax exit while the 3D car drives off
      gsap.to(q(".hero-content"), {
        yPercent: -22,
        opacity: 0.18,
        ease: "none",
        scrollTrigger: { trigger: rootRef.current, start: "top top", end: "bottom 35%", scrub: 0.5 },
      });
      gsap.to(q(".hero-canvas"), {
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: rootRef.current, start: "35% top", end: "bottom 20%", scrub: 0.5 },
      });
    },
    { scope: rootRef, dependencies: [ready] }
  );

  return (
    <section className="hero" id="hero" ref={rootRef}>
      <div className="hero-ghost display" aria-hidden="true">{driver.number}</div>

      <div className="hero-canvas">
        <Suspense fallback={null}>
          <HeroScene active={sceneActive} />
        </Suspense>
      </div>

      <div className="hero-content container">
        <p className="hero-eyebrow mono" style={{ opacity: 0 }}>
          {/* scrambled in */}
        </p>
        <h1 className="hero-title display" aria-label={`${driver.firstName} ${driver.lastName}`}>
          <span className="line-mask"><span className="line">{driver.firstName}</span></span>
          <span className="line-mask"><span className="line line--outline">{driver.lastName}</span></span>
        </h1>
        <p className="hero-sub hl">{driver.tagline}</p>

        <div className="hero-ctas">
          <button className="btn" onClick={() => scrollTo("#projects")} data-cursor="view">
            <span>View My Work</span>
            <span className="arrow">▸</span>
          </button>
          <button className="btn btn--ghost" onClick={() => scrollTo("#contact")} data-cursor="link">
            <span>Contact Me</span>
          </button>
        </div>

        <div className="hero-socials">
          <a href={driver.github} target="_blank" rel="noreferrer" aria-label="GitHub" data-cursor="link"><GitHubIcon /></a>
          <a href={driver.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" data-cursor="link"><LinkedInIcon /></a>
          <a href={`mailto:${driver.email}`} aria-label="Email" data-cursor="link"><MailIcon /></a>
          <span className="hero-socials-rule" />
          <span className="mono hero-socials-label">{driver.location}</span>
        </div>

        {/* interactive pit lane — the car answers to all of these */}
        <div className="hero-chips">
          <button className="hero-hint mono" onClick={rev} data-cursor="rev">
            <span className="hero-hint-dot" />
            CLICK THE CAR — REV IT
          </button>
          <button className="hero-hint mono" onClick={() => busEmit("pitstop")} data-cursor="link">
            <span className="hero-hint-dot hero-hint-dot--amber" />
            BOX BOX — PIT STOP
          </button>
          <button className="hero-hint mono" onClick={() => scrollTo("#garage")} data-cursor="view">
            <span className="hero-hint-dot hero-hint-dot--white" />
            EXPLODE VIEW — GARAGE ▸
          </button>
          <button className="hero-hint mono" onClick={() => busEmit("hotlap")} data-cursor="link">
            <span className="hero-hint-dot hero-hint-dot--green" />
            30-SEC HOT LAP
          </button>
        </div>
      </div>

      {/* garage: pick a livery, retheme the whole site */}
      <div className="hero-garage" role="group" aria-label="Choose car livery">
        <span className="mono">GARAGE — LIVERY</span>
        <div className="hero-garage-swatches">
          {liveryList.map((l) => (
            <motion.button
              key={l.hex}
              className={`hero-swatch ${accent === l.hex ? "is-active" : ""}`}
              style={{ background: l.hex }}
              onClick={() => setAccent(l.hex)}
              whileHover={{ scale: 1.25 }}
              whileTap={{ scale: 0.9 }}
              aria-label={`${l.name} livery`}
              data-cursor="link"
            />
          ))}
        </div>
      </div>

      <div className="hero-scroll mono" aria-hidden="true">
        <span>SCROLL TO START</span>
        <span className="hero-scroll-chevrons">
          <i>▾</i><i>▾</i><i>▾</i>
        </span>
        <span>SECTOR 01 AHEAD</span>
      </div>
    </section>
  );
}
