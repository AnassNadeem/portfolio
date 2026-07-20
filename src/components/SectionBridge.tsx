import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../lib/gsap";
import { useApp } from "../context/AppContext";
import "./SectionBridge.css";

export type BridgeVariant = "carbon" | "beam" | "skid" | "telemetry" | "scan" | "pit";

type Props = {
  /** outgoing sector, e.g. "01" */
  from: string;
  /** incoming sector, e.g. "02" */
  to: string;
  /** short mono tagline shown after the sector readout */
  label?: string;
  /** per-seam accent layer — same gate, different garnish */
  variant?: BridgeVariant;
};

/** pseudo speed-trace polyline for the telemetry variant (pathLength=1) */
const TRACE =
  "M0,34 L70,34 L100,14 L150,14 L172,44 L235,44 L262,10 L330,10 L358,38 " +
  "L430,38 L458,18 L545,18 L575,46 L645,46 L672,14 L765,14 L800,34 L1000,34";

/**
 * SECTOR GATE — the seam between two sections.
 * Two carbon chevron slabs (stamped with the outgoing/incoming sector
 * numbers) slide apart as you scroll through, gate lights arm one by one,
 * and a light streak sweeps the gap. Each seam gets a variant accent layer
 * so the system reads as one family without being copy-paste.
 */
export default function SectionBridge({ from, to, label, variant = "carbon" }: Props) {
  const { accent, reduced } = useApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasParticles = variant === "carbon" || variant === "beam";

  /* drifting carbon flakes — only for the particle variants, rAF gated
     by an IntersectionObserver so off-screen bridges cost nothing */
  useEffect(() => {
    if (reduced || !hasParticles) return;
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = false;

    const resize = () => {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = variant === "carbon" ? (window.innerWidth < 768 ? 18 : 34) : 14;
    const parts = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (0.8 + Math.random() * 1.8) * devicePixelRatio,
      vx: (-0.2 + Math.random() * 0.4) * devicePixelRatio,
      vy: (-0.08 + Math.random() * 0.16) * devicePixelRatio,
      a: 0.08 + Math.random() * 0.24,
    }));

    const draw = () => {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.globalAlpha = p.a;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    const obs = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(draw);
    });
    obs.observe(root);

    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [accent, reduced, hasParticles, variant]);

  /* scroll-scrubbed gate opening */
  useGSAP(
    () => {
      if (reduced) return;
      const root = rootRef.current!;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top 96%",
          end: "bottom 22%",
          scrub: 0.8,
        },
      });
      tl.to(root.querySelector(".bridge-slab--l"), { xPercent: -36, ease: "none" }, 0)
        .to(root.querySelector(".bridge-slab--r"), { xPercent: 36, ease: "none" }, 0)
        .fromTo(
          root.querySelector(".bridge-streak"),
          { xPercent: -130, opacity: 0 },
          { xPercent: 340, opacity: 1, ease: "power1.inOut", duration: 0.85 },
          0.08
        )
        .to(
          root.querySelectorAll(".bridge-lights i"),
          { opacity: 1, stagger: 0.1, duration: 0.16 },
          0.12
        )
        .fromTo(
          root.querySelector(".bridge-label"),
          { opacity: 0.35, letterSpacing: "0.42em" },
          { opacity: 1, letterSpacing: "0.18em", ease: "none" },
          0
        );
      const trace = root.querySelector<SVGPathElement>(".bridge-trace");
      if (trace) {
        tl.fromTo(trace, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none" }, 0);
      }
    },
    { scope: rootRef, dependencies: [reduced] }
  );

  return (
    <div
      ref={rootRef}
      className={`bridge bridge--${variant} ${reduced ? "bridge--static" : ""}`}
      aria-hidden="true"
    >
      {hasParticles && !reduced && <canvas ref={canvasRef} className="bridge-canvas" />}

      {variant === "skid" && (
        <>
          <div className="bridge-skid bridge-skid--a" />
          <div className="bridge-skid bridge-skid--b" />
        </>
      )}

      {variant === "telemetry" && (
        <svg className="bridge-trace-svg" viewBox="0 0 1000 56" preserveAspectRatio="none">
          <path className="bridge-trace" d={TRACE} pathLength={1} />
        </svg>
      )}

      {variant === "scan" && (
        <>
          <div className="bridge-ticks" />
          <div className="bridge-scanline" />
        </>
      )}

      <div className="bridge-slab bridge-slab--l">
        <span className="bridge-num display">{from}</span>
        <span className="bridge-slab-edge" />
      </div>
      <div className="bridge-slab bridge-slab--r">
        <span className="bridge-num display">{to}</span>
        <span className="bridge-slab-edge" />
      </div>

      {variant === "beam" && <div className="bridge-shaft" />}

      <div className="bridge-streak" />

      <div className="bridge-center">
        <span className="bridge-lights">
          <i /><i /><i />
        </span>
        <span className="bridge-label mono">
          SECTOR {from} <span className="bridge-arrow">▸▸</span> {to}
          {label ? ` · ${label}` : ""}
        </span>
      </div>
    </div>
  );
}
