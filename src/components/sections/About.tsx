import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import SectionHeader from "../SectionHeader";
import { useApp } from "../../context/AppContext";
import { driver, about } from "../../data/portfolio";
import "./About.css";

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
            <div className="mono driver-card-team">INDEPENDENT · FULL-STACK</div>
          </div>
        </div>

        <Radar />

        <div className="driver-card-langs mono">
          {about.topLanguages.join(" • ")}
        </div>
      </motion.div>
    </div>
  );
}

export default function About() {
  const { reduced } = useApp();

  return (
    <section className="section about" id="about">
      <div className="container">
        <SectionHeader sector="01" kicker="WHO I AM" title="Driver Profile" />

        <div className="about-grid">
          <DriverCard />

          <div className="about-copy">
            {about.paragraphs.map((p, i) => (
              <motion.p
                key={i}
                initial={reduced ? false : { opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
              >
                {p}
              </motion.p>
            ))}

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

      {/* Garage work lamp — clamp bolts to the RIGHT viewport edge, the arm
          reaches left/down and the shade hangs on the shared --spot-x axis
          so the beam lines up with the garage spotlight below. */}
      <div className="about-lamp" aria-hidden="true">
        <svg className="about-lamp-svg" viewBox="0 0 600 210" fill="none">
          <defs>
            <linearGradient id="lamp-stem-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2a2a31" stopOpacity="0" />
              <stop offset="0.55" stopColor="#2a2a31" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* wall-mounted articulated arm — desktop / wide screens */}
          <g className="about-lamp-arm">
            {/* wall-mount plate hugging the right edge */}
            <rect x="588" y="4" width="12" height="78" rx="2" fill="#2a2a31" />
            <rect x="566" y="22" width="26" height="34" rx="2" fill="#33333c" stroke="#45454f" strokeWidth="1" />
            <circle cx="593" cy="14" r="2.4" fill="#4a4a55" />
            <circle cx="593" cy="72" r="2.4" fill="#4a4a55" />
            {/* upper arm: mount → elbow */}
            <path d="M572 40 L432 90" stroke="#2e2e36" strokeWidth="11" strokeLinecap="round" />
            <path d="M568 48 L438 96" stroke="#45454f" strokeWidth="2" strokeDasharray="5 4" opacity="0.7" />
            <circle cx="572" cy="40" r="9" fill="#3a3a44" stroke="#4a4a55" strokeWidth="1.2" />
            <circle cx="432" cy="90" r="10" fill="#3a3a44" stroke="#4a4a55" strokeWidth="1.2" />
            <circle cx="432" cy="90" r="3.2" fill="#1a1a20" />
            {/* lower arm: elbow → shade pivot */}
            <path d="M432 90 L306 134" stroke="#2e2e36" strokeWidth="11" strokeLinecap="round" />
            <path d="M428 98 L312 140" stroke="#45454f" strokeWidth="2" strokeDasharray="5 4" opacity="0.7" />
            <circle cx="306" cy="134" r="9" fill="#3a3a44" stroke="#4a4a55" strokeWidth="1.2" />
          </g>

          {/* straight pendant drop — mobile, keeps the hang angle true */}
          <g className="about-lamp-stem">
            <rect x="295" y="0" width="10" height="112" fill="url(#lamp-stem-fade)" />
            <rect x="288" y="102" width="24" height="16" rx="2" fill="#26262e" stroke="#3a3a44" strokeWidth="1" />
          </g>
          {/* big industrial shade, mouth aimed straight down the spotlight axis */}
          <path
            d="M262 130 L338 130 L364 196 L236 196 Z"
            fill="#17171d"
            stroke="#2e2e36"
            strokeWidth="2"
          />
          <path d="M272 138 L328 138 L348 190 L252 190 Z" fill="rgba(var(--accent-rgb), 0.10)" />
          <rect x="284" y="118" width="32" height="14" rx="2" fill="#26262e" stroke="#3a3a44" strokeWidth="1" />
          <ellipse className="about-lamp-rim" cx="300" cy="196" rx="64" ry="11" />
          <ellipse className="about-lamp-bulb" cx="300" cy="196" rx="30" ry="7" />
        </svg>
        <div className="about-lamp-glow" />
        <div className="about-lamp-beam" />
      </div>
    </section>
  );
}
