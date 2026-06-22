import { useEffect, useRef } from "react";
import { gsap } from "../lib/gsap";
import "./Cursor.css";

/**
 * Custom cursor = a tiny tire. It rolls (rotates) with distance travelled,
 * stretches under "g-force" at speed, and expands with a label over
 * [data-cursor] targets ("view" | "link" | "rev"). Hidden on touch devices
 * and over form fields.
 */
export default function Cursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    document.documentElement.classList.add("has-cursor");
    const ring = ringRef.current!;
    const dot = dotRef.current!;
    const label = labelRef.current!;

    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const target = { x: pos.x, y: pos.y };
    let travelled = 0;
    let lastX = pos.x;
    let lastY = pos.y;
    let mode = "";

    const setMode = (next: string) => {
      if (next === mode) return;
      mode = next;
      ring.dataset.mode = next;
      label.textContent = next === "view" ? "VIEW" : next === "rev" ? "REV" : next === "link" ? "OPEN" : "";
      gsap.to(ring, {
        scale: next ? (next === "rev" ? 2.6 : 2.2) : 1,
        duration: 0.35,
        ease: "back.out(2)",
      });
      gsap.to(dot, { opacity: next ? 0 : 1, duration: 0.2 });
    };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      const el = (e.target as Element | null)?.closest?.("[data-cursor]");
      const native = (e.target as Element | null)?.closest?.("input, textarea, select");
      gsap.to([ring, dot], { autoAlpha: native ? 0 : 1, duration: 0.2, overwrite: "auto" });
      setMode(el ? (el as HTMLElement).dataset.cursor ?? "" : "");
    };

    const onLeave = () => gsap.to([ring, dot], { autoAlpha: 0, duration: 0.25 });
    const onEnter = () => gsap.to([ring, dot], { autoAlpha: 1, duration: 0.25 });
    const onDown = () => gsap.to(ring, { scale: mode ? 1.9 : 0.82, duration: 0.15 });
    const onUp = () => gsap.to(ring, { scale: mode ? 2.2 : 1, duration: 0.25, ease: "back.out(2)" });

    const tick = () => {
      // chase the pointer
      pos.x += (target.x - pos.x) * 0.16;
      pos.y += (target.y - pos.y) * 0.16;
      const dx = pos.x - lastX;
      const dy = pos.y - lastY;
      lastX = pos.x;
      lastY = pos.y;
      const speed = Math.hypot(dx, dy);
      travelled += speed;

      // g-force stretch along direction of motion (off while expanded)
      const stretch = mode ? 0 : Math.min(speed / 28, 0.42);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      gsap.set(ring, {
        x: pos.x,
        y: pos.y,
        rotation: angle,
        scaleX: `+=0`, // keep gsap transform pipeline
        transformOrigin: "50% 50%",
      });
      ring.style.setProperty("--stretch", String(1 + stretch));
      ring.style.setProperty("--squash", String(1 - stretch * 0.5));
      // the tire itself rolls with distance travelled
      ring.style.setProperty("--roll", `${travelled * 2.2}deg`);
      gsap.set(dot, { x: target.x, y: target.y });
      requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    const raf = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className="cursor-ring" ref={ringRef} aria-hidden="true">
        <svg viewBox="0 0 40 40" className="cursor-tire">
          <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3" />
          <g className="cursor-treads">
            {Array.from({ length: 8 }, (_, i) => (
              <rect key={i} x="19" y="1" width="2" height="4.5" rx="1" fill="currentColor" transform={`rotate(${i * 45} 20 20)`} />
            ))}
          </g>
        </svg>
        <span className="cursor-label mono" ref={labelRef} />
      </div>
      <div className="cursor-dot" ref={dotRef} aria-hidden="true" />
    </>
  );
}
