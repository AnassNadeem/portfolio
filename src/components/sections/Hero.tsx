import { lazy, Suspense, useEffect, useRef, useState, memo } from "react";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";
import { gsap, SplitText } from "../../lib/gsap";
import { useApp } from "../../context/AppContext";
import { emit as busEmit } from "../../lib/bus";
import RoleRotator from "../RoleRotator";
import { driver } from "../../data/portfolio";
import { supportsWebGL } from "../../lib/webgl";
import "./Hero.css";

/** Shown when WebGL is unavailable — keeps the hero presentable on any device. */
const HeroFallback = memo(function HeroFallback({ accent }: { accent: string }) {
  return (
    <div
      className="hero-canvas-fallback"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(ellipse 60% 50% at 40% 60%, ${accent}22 0%, transparent 70%)`,
      }}
    >
      <span
        className="display"
        style={{ fontSize: "clamp(8rem, 28vw, 22rem)", opacity: 0.07, color: accent, lineHeight: 1 }}
        aria-hidden="true"
      >
        {driver.number}
      </span>
    </div>
  );
});

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
  const { ready, reduced, accent, setAccent, liveryList, scrollTo } = useApp();
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  const sceneActive = inView && tabVisible;
  const webgl = supportsWebGL();

  // Pause the 3D loop when the section leaves the viewport
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      rootMargin: "120px 0px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Pause the 3D loop when the tab is hidden (saves GPU on background tabs)
  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Living name — a weight-wave travels through the letters continuously,
  // and pointer proximity pushes individual glyphs heavier (variable font).
  useEffect(() => {
    if (!ready || reduced) return;
    const title = titleRef.current;
    if (!title) return;

    let chars: HTMLElement[] = [];
    const pointer = { x: 0, y: 0, inside: false };

    const onMove = (e: PointerEvent) => {
      pointer.inside = true;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    title.addEventListener("pointermove", onMove);
    title.addEventListener("pointerleave", onLeave);

    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      // SplitText (in useGSAP below) may not have run yet on the first frames
      if (!chars.length) {
        chars = Array.from(title.querySelectorAll<HTMLElement>(".hero-char"));
        if (!chars.length) return;
      }
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        // slow sine wave sweeping across the word
        const wave = Math.sin(t * 0.0014 - i * 0.62);
        let wght = 640 + wave * 110;
        let skew = wave * 1.4;
        if (pointer.inside) {
          const cr = ch.getBoundingClientRect();
          const cx = cr.left + cr.width / 2;
          const cy = cr.top + cr.height / 2;
          const dist = Math.hypot(pointer.x - cx, pointer.y - cy);
          const pull = Math.max(0, 1 - dist / 320);
          wght = Math.min(800, wght + pull * 220);
          skew += (pointer.x - cx) * 0.004 * pull;
        }
        ch.style.fontVariationSettings = `"wght" ${wght.toFixed(0)}`;
        // weight + a whisper of bob/skew = the word feels alive, not animated "at" you
        ch.style.transform = `translateY(${(wave * 1.8).toFixed(2)}px) skewY(${skew.toFixed(2)}deg)`;
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      title.removeEventListener("pointermove", onMove);
      title.removeEventListener("pointerleave", onLeave);
    };
  }, [ready, reduced]);

  useGSAP(
    () => {
      if (!ready || reduced) return;
      const q = gsap.utils.selector(rootRef);
      const tl = gsap.timeline({ delay: 0.15 });

      const split = SplitText.create(q(".hero-title .line"), { type: "chars", charsClass: "hero-char" });
      tl.from(
        split.chars,
        { yPercent: 118, stagger: 0.03, duration: 1.0, ease: "power4.out" },
        0
      );

      tl.from(
        q(".role-rotator, .hero-ctas, .hero-socials, .hero-garage, .hero-chips"),
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
        {webgl ? (
          <Suspense fallback={null}>
            <HeroScene active={sceneActive} />
          </Suspense>
        ) : (
          <HeroFallback accent={accent} />
        )}
      </div>

      <div className="hero-content container">
        <h1
          className="hero-title hero-title--variable"
          ref={titleRef}
          aria-label={`${driver.firstName} ${driver.lastName}`}
        >
          <span className="line-mask"><span className="line">{driver.firstName}</span></span>
          <span className="line-mask"><span className="line line--outline">{driver.lastName}</span></span>
        </h1>
        <RoleRotator ready={ready} reduced={reduced} />

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
        </div>

        <div className="hero-chips">
          <button className="hero-hint mono" onClick={() => busEmit("pitstop")} data-cursor="link">
            BOX BOX · TYRE SWAP ▸
          </button>
          <button className="hero-hint mono" onClick={() => busEmit("hotlap")} data-cursor="link">
            30-SEC HOT LAP
          </button>
        </div>
      </div>

      {/* garage: pick a livery, retheme the whole site */}
      <div className="hero-garage" role="group" aria-label="Choose car livery">
        <span className="mono">LIVERY</span>
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
        <span className="hero-scroll-chevrons">
          <i>▾</i><i>▾</i><i>▾</i>
        </span>
      </div>
    </section>
  );
}
