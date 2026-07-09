import { useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import "./AmbientField.css";

/** Lightweight canvas particle drift — replaces the text marquee. */
export default function AmbientField() {
  const { accent, reduced } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let alive = true;

    const resize = () => {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = window.innerWidth < 768 ? 28 : 55;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (1 + Math.random() * 2) * devicePixelRatio,
      vx: (-0.15 + Math.random() * 0.3) * devicePixelRatio,
      vy: (-0.08 + Math.random() * 0.16) * devicePixelRatio,
      a: 0.08 + Math.random() * 0.22,
    }));

    const draw = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
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
    draw();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [accent, reduced]);

  if (reduced) return <div className="ambient-field ambient-field--static" aria-hidden="true" />;

  return (
    <div className="ambient-field" aria-hidden="true">
      <canvas ref={canvasRef} className="ambient-field-canvas" />
    </div>
  );
}
