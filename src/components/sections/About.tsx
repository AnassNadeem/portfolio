import { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useInView, animate, AnimatePresence } from "framer-motion";
import SectionHeader from "../SectionHeader";
import { useApp } from "../../context/AppContext";
import { driver, about } from "../../data/portfolio";
import { seasonStats, type SeasonStats } from "../../lib/github";
import "./About.css";

/** Live numbers straight from the GitHub API — the telemetry is real */
function SeasonTelemetry() {
  const [stats, setStats] = useState<SeasonStats | null>(null);
  useEffect(() => {
    let live = true;
    void seasonStats(driver.githubUser).then((s) => {
      if (live) setStats(s);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="season-tel">
      <div className="season-tel-head mono">
        <span className="season-tel-dot" aria-hidden="true" /> LIVE FROM GITHUB — SEASON {new Date().getFullYear()}
      </div>
      {stats ? (
        <div className="season-tel-grid mono">
          <span>
            <strong>{stats.publicRepos}</strong> PUBLIC REPOS
          </span>
          <span>
            <strong>{stats.followers}</strong> FOLLOWERS
          </span>
          <span>
            <strong>{stats.memberSince}</strong> ROOKIE SEASON
          </span>
          {stats.topLanguages[0] && (
            <span>
              <strong>{stats.topLanguages.map((l) => l.lang).join(" · ")}</strong> TOP FUEL
            </span>
          )}
        </div>
      ) : (
        <div className="season-tel-grid mono">
          <span className="season-tel-wait">ACQUIRING SIGNAL…</span>
        </div>
      )}
    </div>
  );
}

/** Pentagon "driver rating" radar — pure SVG, no chart lib */
function Radar() {
  const size = 220;
  const c = size / 2;
  const rMax = 78;
  const n = about.radar.length;
  const point = (i: number, r: number): [number, number] => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * r, c + Math.sin(a) * r];
  };
  const ringPoints = (r: number) =>
    Array.from({ length: n }, (_, i) => point(i, r).join(",")).join(" ");
  const valuePoints = about.radar
    .map((d, i) => point(i, (d.value / 100) * rMax).join(","))
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar" aria-hidden="true">
      {[0.33, 0.66, 1].map((f) => (
        <polygon key={f} points={ringPoints(rMax * f)} className="radar-ring" />
      ))}
      {about.radar.map((_, i) => {
        const [x, y] = point(i, rMax);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} className="radar-ring" />;
      })}
      <motion.polygon
        points={valuePoints}
        className="radar-area"
        initial={{ opacity: 0, scale: 0.3 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        style={{ transformOrigin: "50% 50%" }}
      />
      {about.radar.map((d, i) => {
        const [x, y] = point(i, rMax + 16);
        return (
          <text key={d.axis} x={x} y={y} className="radar-label" textAnchor="middle" dominantBaseline="middle">
            {d.axis}
          </text>
        );
      })}
    </svg>
  );
}

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${Math.round(v)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, value, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

/** Driver card with pointer-tracked 3D tilt (Framer Motion springs) */
function DriverCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [9, -9]), { stiffness: 160, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-11, 11]), { stiffness: 160, damping: 18 });
  const glareX = useTransform(mx, [0, 1], ["20%", "80%"]);
  const glareY = useTransform(my, [0, 1], ["15%", "85%"]);

  const onMove = (e: React.PointerEvent) => {
    const r = cardRef.current!.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <div className="card-perspective">
      <motion.div
        className="driver-card"
        ref={cardRef}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX, rotateY }}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div className="driver-card-glare" style={{ "--gx": glareX, "--gy": glareY } as React.CSSProperties} />
        <div className="driver-card-head">
          <span className="mono">DRIVER CARD</span>
          <span className="driver-card-num display">{driver.number}</span>
        </div>

        <div className="driver-card-id">
          <div className="driver-avatar display">{driver.initials}</div>
          <div>
            <div className="driver-card-name display">
              {driver.firstName} <em>{driver.lastName}</em>
            </div>
            <div className="mono driver-card-team">TEAM INDEPENDENT — FULL-STACK DIV.</div>
          </div>
        </div>

        <Radar />

        <div className="driver-card-stats">
          {about.stats.map((s) => (
            <div className="driver-stat" key={s.label}>
              <span className="driver-stat-val display">
                <Counter value={s.value} suffix={s.suffix} />
              </span>
              <span className="mono">{s.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default function About() {
  const { reduced } = useApp();
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="section about" id="about">
      <div className="container">
        <SectionHeader sector="01" kicker="WHO I AM" title="Driver Profile" />

        <div className="about-grid">
          <DriverCard />

          <div className="about-copy">
            <motion.p
              className="about-lead"
              initial={reduced ? false : { opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            >
              {about.lead}
            </motion.p>

            <button
              className="about-more mono"
              onClick={() => setExpanded((v) => !v)}
              data-cursor="link"
              aria-expanded={expanded}
            >
              {expanded ? "SHOW LESS ▴" : "READ MORE ▾"}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  className="about-expanded"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  {about.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="about-chips">
              {about.values.map((v, i) => (
                <motion.span
                  key={v.k}
                  className="about-chip mono"
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
                  title={v.v}
                >
                  {v.k}
                </motion.span>
              ))}
            </div>

            <SeasonTelemetry />

            <div className="about-ctas">
              <a className="btn" href={driver.resume} target="_blank" rel="noreferrer" data-cursor="view">
                <span>View Resume</span>
                <span className="arrow">↗</span>
              </a>
              <a className="btn btn--ghost" href={driver.github} target="_blank" rel="noreferrer" data-cursor="link">
                <span>GitHub</span>
                <span className="arrow">↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
