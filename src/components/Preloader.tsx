import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../lib/gsap";
import { useApp } from "../context/AppContext";
import "./Preloader.css";

const STATUS = ["INITIALIZING TELEMETRY", "WARMING TYRES", "TO THE GRID"];

function Tire() {
  const treads = Array.from({ length: 16 }, (_, i) => (i / 16) * 360);
  const spokes = Array.from({ length: 6 }, (_, i) => (i / 6) * 360);
  return (
    <svg className="pl-tire-svg" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#0e0e11" />
      <circle cx="60" cy="60" r="56" fill="none" stroke="#1c1c21" strokeWidth="7" />
      {treads.map((a) => (
        <rect key={a} x="57.5" y="2" width="5" height="9" rx="1.5" fill="#26262c" transform={`rotate(${a} 60 60)`} />
      ))}
      <circle cx="60" cy="60" r="44" fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeDasharray="40 236" strokeLinecap="round" />
      <circle cx="60" cy="60" r="36" fill="#141418" stroke="#2a2a31" strokeWidth="2" />
      {spokes.map((a) => (
        <rect key={a} x="56.5" y="26" width="7" height="34" rx="3" fill="#1f1f25" transform={`rotate(${a} 60 60)`} />
      ))}
      <circle cx="60" cy="60" r="9" fill="var(--accent)" />
      <circle cx="60" cy="60" r="3.4" fill="#0a0a0c" />
    </svg>
  );
}

/**
 * Quick and clean: the tire rolls the progress in, five lights, lights out,
 * page launches. ~2.5s on first visit, under 2s on return visits.
 * (The reaction-time game lives in the Arcade → LIGHTS OUT.)
 */
export default function Preloader() {
  const { setReady, reduced } = useApp();
  const [gone, setGone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tireRef = useRef<HTMLDivElement>(null);
  const skidRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const lightsRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduced) {
        gsap.to(rootRef.current, {
          autoAlpha: 0,
          duration: 0.4,
          delay: 0.3,
          onComplete: () => {
            setReady(true);
            setGone(true);
          },
        });
        return;
      }

      const returning = localStorage.getItem("apex_seen") === "1";
      try {
        localStorage.setItem("apex_seen", "1");
      } catch {
        /* fine */
      }

      const track = tireRef.current!.parentElement!;
      const travel = () => track.clientWidth - 76;
      const progress = { v: 0 };
      const lights = Array.from(lightsRef.current!.children);

      const tl = gsap.timeline({
        onComplete: () => {
          setReady(true);
          setGone(true);
        },
      });

      tl.to(progress, {
        v: 100,
        duration: returning ? 0.7 : 1.4,
        ease: "power2.inOut",
        onUpdate: () => {
          const p = progress.v / 100;
          const x = travel() * p;
          gsap.set(tireRef.current, { x, rotation: (x / (Math.PI * 76)) * 360 });
          gsap.set(skidRef.current, { scaleX: p });
          if (pctRef.current) pctRef.current.textContent = String(Math.round(progress.v)).padStart(3, "0");
          if (statusRef.current) {
            const s = STATUS[Math.min(STATUS.length - 1, Math.floor(p * STATUS.length))];
            if (statusRef.current.textContent !== s) statusRef.current.textContent = s;
          }
        },
      })
        .to(lights, { "--lit": 1, stagger: 0.1, duration: 0.01 } as gsap.TweenVars, "+=0.05")
        .to({}, { duration: 0.4 })
        .set(lights, { "--lit": 0 } as gsap.TweenVars)
        .set(outRef.current, { opacity: 1 })
        .fromTo(outRef.current, { scale: 0.94 }, { scale: 1, duration: 0.15, ease: "power3.out" })
        .to(rootRef.current, {
          yPercent: -100,
          duration: 0.75,
          ease: "power4.inOut",
          delay: 0.25,
        });
    },
    { scope: rootRef }
  );

  if (gone) return null;

  return (
    <div className="preloader" ref={rootRef} aria-label="Loading">
      <div className="pl-inner">
        <div className="pl-top mono">
          <span>ANAS.NADEEM — APEX PORTFOLIO</span>
          <span>
            GRID&nbsp;<span ref={pctRef}>000</span>%
          </span>
        </div>

        <div className="pl-track">
          <div className="pl-skid" ref={skidRef} />
          <div className="pl-tire" ref={tireRef}>
            <Tire />
          </div>
        </div>

        <div className="pl-bottom mono">
          <span ref={statusRef}>INITIALIZING TELEMETRY</span>
          <span className="pl-blink">▮</span>
        </div>

        <div className="pl-lights" ref={lightsRef} aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>

        <div className="pl-out display" ref={outRef}>
          LIGHTS OUT<span className="text-accent">.</span>
        </div>
      </div>
    </div>
  );
}
