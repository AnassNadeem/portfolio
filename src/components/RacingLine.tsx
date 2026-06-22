import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "../lib/gsap";
import { useApp } from "../context/AppContext";
import { emit as busEmit, on as busOn, setLastPath } from "../lib/bus";
import "./RacingLine.css";

type Pt = { x: number; y: number };

/** Catmull-Rom → cubic bezier path string */
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

/** DRS straight: this slice of lap progress arms DRS at speed */
const DRS_ZONE: [number, number] = [0.36, 0.54];

export default function RacingLine() {
  const { reduced, velocityRef } = useApp();
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const guideRef = useRef<SVGPathElement>(null);
  const labelPathRef = useRef<SVGPathElement>(null);
  const maskRef = useRef<SVGPathElement>(null);
  const trailOuterRef = useRef<SVGPathElement>(null);
  const trailInnerRef = useRef<SVGPathElement>(null);
  const carRef = useRef<SVGGElement>(null);
  const ghostRef = useRef<SVGGElement>(null);
  const streaksRef = useRef<SVGGElement>(null);
  const finishRef = useRef<SVGGElement>(null);
  const pathLenRef = useRef(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (reduced) return;
    const main = document.getElementById("race-main");
    if (!main) return;
    let last = { w: 0, h: 0 };
    let t: number | undefined;
    const measure = () => {
      const w = main.clientWidth;
      const h = main.scrollHeight;
      if (Math.abs(w - last.w) > 24 || Math.abs(h - last.h) > 60) {
        last = { w, h };
        setSize({ w, h });
      }
    };
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(measure, 250);
    });
    ro.observe(main);
    measure();
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, [reduced]);

  useGSAP(
    () => {
      if (reduced || size.w < 768 || size.h === 0) return;
      const main = document.getElementById("race-main");
      const svg = svgRef.current;
      if (!main || !svg) return;

      const { w, h } = size;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      svg.setAttribute("width", String(w));
      svg.setAttribute("height", String(h));

      const ids = ["about", "garage", "experience", "projects", "skills", "contact"];
      const hero = document.getElementById("hero");
      const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : innerHeight;
      const L = w * 0.13;
      const R = w * 0.87;
      const C = w * 0.5;

      const pts: Pt[] = [{ x: w * 0.86, y: heroBottom - innerHeight * 0.22 }];
      let side = -1;
      let lastBottom = heroBottom;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.offsetTop;
        const height = el.offsetHeight;
        pts.push({ x: C + (side < 0 ? -1 : 1) * 0.06 * w, y: (lastBottom + top) / 2 + 40 });
        pts.push({ x: side < 0 ? L : R, y: top + height * 0.5 });
        lastBottom = top + height;
        side *= -1;
      }
      pts.push({ x: C, y: lastBottom + 30 });

      const d = smoothPath(pts);
      for (const ref of [guideRef, labelPathRef, maskRef, trailOuterRef, trailInnerRef]) {
        ref.current?.setAttribute("d", d);
      }

      // broadcast a sampled, normalized copy for the HUD minimap
      const guide = guideRef.current!;
      const total = guide.getTotalLength();
      pathLenRef.current = total;
      const samples: Pt[] = [];
      for (let i = 0; i <= 80; i++) {
        const p = guide.getPointAtLength((i / 80) * total);
        samples.push({ x: p.x / w, y: p.y / h });
      }
      setLastPath(samples);
      busEmit("path", { points: samples });

      const end = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      const angle = (Math.atan2(end.y - prev.y, end.x - prev.x) * 180) / Math.PI;
      finishRef.current?.setAttribute("transform", `translate(${end.x}, ${end.y}) rotate(${angle + 90})`);

      const st = {
        trigger: main,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.7,
      };

      gsap.fromTo(maskRef.current, { drawSVG: "0 0%" }, { drawSVG: "0 100%", ease: "none", scrollTrigger: st });

      gsap.to(carRef.current, {
        motionPath: {
          path: guideRef.current!,
          align: guideRef.current!,
          alignOrigin: [0.5, 0.5],
          autoRotate: true,
        },
        ease: "none",
        immediateRender: true,
        scrollTrigger: st,
      });

      ScrollTrigger.refresh();
    },
    { dependencies: [size, reduced], revertOnUpdate: true }
  );

  // ── GHOST CAR: replays your best lap in real time ──
  useEffect(() => {
    if (reduced) return;
    let playing = false;
    let startT = 0;
    let idx = 0;
    let trace: { t: number; p: number }[] = [];

    const offStart = busOn("lapStart", () => {
      try {
        const saved = JSON.parse(localStorage.getItem("apex_ghost") ?? "null") as {
          ms: number;
          trace: { t: number; p: number }[];
        } | null;
        if (!saved || !saved.trace || saved.trace.length < 2) return;
        trace = saved.trace;
        idx = 0;
        startT = performance.now();
        playing = true;
        if (ghostRef.current) ghostRef.current.style.opacity = "0.5";
      } catch {
        /* no ghost yet */
      }
    });

    const tick = () => {
      if (!playing || !ghostRef.current || !guideRef.current || pathLenRef.current === 0) return;
      const elapsed = performance.now() - startT;
      while (idx < trace.length - 1 && trace[idx + 1].t < elapsed) idx++;
      if (idx >= trace.length - 1) {
        playing = false;
        gsap.to(ghostRef.current, { opacity: 0, duration: 0.8 });
        return;
      }
      const a = trace[idx];
      const b = trace[idx + 1];
      const f = Math.min(1, Math.max(0, (elapsed - a.t) / Math.max(1, b.t - a.t)));
      const p = a.p + (b.p - a.p) * f;
      const guide = guideRef.current;
      const len = pathLenRef.current;
      const pt = guide.getPointAtLength(p * len);
      const ahead = guide.getPointAtLength(Math.min(len, p * len + 4));
      const rot = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI;
      gsap.set(ghostRef.current, { x: pt.x, y: pt.y, rotation: rot, transformOrigin: "0 0" });
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      offStart();
    };
  }, [reduced]);

  // speed streaks + DRS detection, driven by live scroll velocity
  useEffect(() => {
    if (reduced) return;
    let v = 0;
    let drsOn = false;
    let overdrive = false;
    const offOd = busOn("overdrive", (on) => {
      overdrive = on;
    });
    const tick = () => {
      const raw = Math.abs(velocityRef.current ?? 0);
      v = Math.max(v * 0.94, Math.min(1, raw / 26));
      const boost = overdrive ? 1 : 0;
      if (streaksRef.current) streaksRef.current.style.opacity = String(Math.min(1, v + boost * 0.5));

      // DRS: inside the zone, above the speed threshold
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      const inZone = p >= DRS_ZONE[0] && p <= DRS_ZONE[1];
      const fast = raw > 14 || overdrive;
      if (inZone && fast && !drsOn) {
        drsOn = true;
        carRef.current?.classList.add("drs-open");
        busEmit("drs", true);
        busEmit("toast", { text: "DRS ENABLED ▸▸", tone: "accent" });
      } else if ((!inZone || raw < 2) && drsOn) {
        drsOn = false;
        carRef.current?.classList.remove("drs-open");
        busEmit("drs", false);
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      offOd();
    };
  }, [reduced, velocityRef]);

  if (reduced) return null;

  return (
    <div className="racing-line" ref={wrapRef} aria-hidden="true">
      <svg ref={svgRef} className="rl-svg">
        <defs>
          <mask id="rl-reveal" maskUnits="userSpaceOnUse">
            <path ref={maskRef} fill="none" stroke="#fff" strokeWidth="46" strokeLinecap="round" />
          </mask>
          <pattern id="rl-checker" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="#f5f5f7" />
            <rect width="6" height="6" fill="#0a0a0c" />
            <rect x="6" y="6" width="6" height="6" fill="#0a0a0c" />
          </pattern>
        </defs>

        <path ref={guideRef} className="rl-guide" fill="none" />

        <path ref={labelPathRef} id="rl-label-path" fill="none" stroke="none" />
        <text className="rl-label mono-svg" dy="-14">
          <textPath href="#rl-label-path" startOffset="9%">SECTOR 1 ▸▸</textPath>
        </text>
        <text className="rl-label mono-svg" dy="-14">
          <textPath href="#rl-label-path" startOffset="38%">SECTOR 2 ▸▸ DRS ZONE</textPath>
        </text>
        <text className="rl-label mono-svg" dy="-14">
          <textPath href="#rl-label-path" startOffset="72%">SECTOR 3 ▸▸</textPath>
        </text>
        <text className="rl-label mono-svg" dy="-14">
          <textPath href="#rl-label-path" startOffset="93%">FINISH ⏁</textPath>
        </text>

        <g mask="url(#rl-reveal)">
          <path ref={trailOuterRef} className="rl-trail-outer" fill="none" />
          <path ref={trailInnerRef} className="rl-trail-inner" fill="none" />
        </g>

        <g ref={finishRef}>
          <rect x="-26" y="-7" width="52" height="14" fill="url(#rl-checker)" opacity="0.85" />
        </g>

        {/* ghost of your best lap — rendered under the live car */}
        <g ref={ghostRef} className="rl-ghost" style={{ opacity: 0 }}>
          <path className="rl-ghost-body" d="M -22 -6 L 6 -5.2 L 26 -1.6 L 26 1.6 L 6 5.2 L -22 6 Z" />
          <rect x="22" y="-10.5" width="4.5" height="21" rx="1.5" className="rl-ghost-part" />
          <rect x="-27" y="-11" width="5" height="22" rx="1" className="rl-ghost-part" />
          <text className="rl-ghost-tag" y="-17" textAnchor="middle">GHOST</text>
        </g>

        <g ref={carRef} className="rl-car">
          <g ref={streaksRef} className="rl-streaks" opacity="0">
            <line x1="-58" y1="-8" x2="-30" y2="-8" />
            <line x1="-66" y1="0" x2="-34" y2="0" />
            <line x1="-58" y1="8" x2="-30" y2="8" />
          </g>
          {/* DRS flap — separates from the wing when open */}
          <rect className="rl-drs" x="-31.5" y="-9" width="2.8" height="18" rx="1" />
          <rect x="-27" y="-11" width="5" height="22" rx="1" className="rl-dark" />
          <rect x="12" y="-13" width="9" height="6" rx="2" className="rl-tyre" />
          <rect x="12" y="7" width="9" height="6" rx="2" className="rl-tyre" />
          <rect x="-20" y="-14" width="10" height="7" rx="2" className="rl-tyre" />
          <rect x="-20" y="7" width="10" height="7" rx="2" className="rl-tyre" />
          <rect x="14" y="-8" width="4" height="16" className="rl-dark" />
          <rect x="-17" y="-8" width="4" height="16" className="rl-dark" />
          <path className="rl-body" d="M -22 -6 L 6 -5.2 L 26 -1.6 L 26 1.6 L 6 5.2 L -22 6 Z" />
          <rect x="22" y="-10.5" width="4.5" height="21" rx="1.5" className="rl-dark" />
          <circle cx="-1" cy="0" r="2.6" fill="#0a0a0c" />
          <circle cx="-1" cy="0" r="3.6" fill="none" stroke="#2c2c33" strokeWidth="1.2" />
          <rect x="-20" y="-0.8" width="18" height="1.6" fill="rgba(245,245,247,0.65)" />
        </g>
      </svg>
    </div>
  );
}
