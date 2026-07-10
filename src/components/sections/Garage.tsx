import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGSAP } from "@gsap/react";
import { gsap } from "../../lib/gsap";
import { useApp } from "../../context/AppContext";
import { garageParts, driver } from "../../data/portfolio";
import { supportsWebGL } from "../../lib/webgl";
import "./Garage.css";

const GarageScene = lazy(() => import("../three/GarageScene"));

/**
 * THE GARAGE — the car strips itself down as you scroll, and every part
 * maps to a real skill domain. The car is the architecture diagram.
 */
export default function Garage() {
  const { reduced } = useApp();
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const explodeRef = useRef(reduced ? 1 : 0);
  const [activePart, setActivePart] = useState<string | null>(null);
  const [autoSpin, setAutoSpin] = useState(false);
  const [manualOrbit, setManualOrbit] = useState(true);
  const doorRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  const sceneActive = inView && tabVisible;
  const webgl = supportsWebGL();

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      rootMargin: "300px 0px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useGSAP(
    () => {
      if (reduced) return;
      const mm = gsap.matchMedia();

      // desktop: pin the stage and scrub the explosion
      mm.add("(min-width: 861px)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: stageRef.current,
            start: "top top",
            end: "+=280%",
            scrub: 1.2,
            pin: true,
            anticipatePin: 1,
          },
        });
        tl.fromTo(explodeRef, { current: 0 }, { current: 1, ease: "none", duration: 0.65 });
        tl.to(explodeRef, { current: 1, duration: 0.35 });

        // laser scan — beam sweeps down then back up as you enter the bay
        if (doorRef.current) {
          const beam = doorRef.current.querySelector(".garage-beam");
          if (beam) {
            tl.fromTo(
              beam,
              { top: "-8%", opacity: 1 },
              { top: "108%", opacity: 1, ease: "none", duration: 0.14 },
              0
            );
            tl.fromTo(
              beam,
              { top: "108%", opacity: 1 },
              { top: "-8%", opacity: 0, ease: "none", duration: 0.14 },
              0.14
            );
          }
          tl.set(doorRef.current, { visibility: "hidden", pointerEvents: "none" }, 0.3);
        }
      });

      mm.add("(max-width: 860px)", () => {
        gsap.fromTo(
          explodeRef,
          { current: 0 },
          {
            current: 1,
            ease: "none",
            scrollTrigger: {
              trigger: stageRef.current,
              start: "top 70%",
              end: "+=200%",
              scrub: 1.2,
            },
          }
        );
      });
    },
    { scope: rootRef }
  );

  const info = garageParts.find((p) => p.id === activePart) ?? null;

  return (
    <section className="section garage" id="garage" ref={rootRef}>
      {/* laser scan reveal — scrubbed by scroll */}
      <div className="garage-boot" ref={doorRef} aria-hidden="true">
        <div className="garage-beam" />
      </div>
      <div className="garage-stage" ref={stageRef}>
        <div className="garage-head">
          <div className="eyebrow mono">
            <span className="slash" />
            <span>SECTOR 02 — THE MACHINE</span>
          </div>
          <h2 className="garage-title display">
            The Garage<span className="text-accent">.</span>
          </h2>
          <p className="garage-sub">
            Every part of car <span className="text-accent">{driver.number}</span> is a real part of my stack.
            Scroll — the build strips itself down.
          </p>
        </div>

        <div className="garage-canvas">
          <div className="garage-controls mono">
            <button
              type="button"
              className={`garage-ctrl ${manualOrbit ? "is-active" : ""}`}
              onClick={() => { setManualOrbit(true); setAutoSpin(false); }}
              data-cursor="link"
            >
              DRAG 360°
            </button>
            <button
              type="button"
              className={`garage-ctrl ${autoSpin ? "is-active" : ""}`}
              onClick={() => { setAutoSpin((v) => !v); setManualOrbit(false); }}
              data-cursor="link"
            >
              AUTO SPIN
            </button>
          </div>
          {webgl ? (
            <Suspense fallback={null}>
              <GarageScene
                active={sceneActive}
                explodeRef={explodeRef}
                activePart={activePart}
                onPart={setActivePart}
                autoSpin={autoSpin}
                manualOrbit={manualOrbit}
              />
            </Suspense>
          ) : (
            <div className="garage-webgl-fallback" aria-label="Skill map">
              {garageParts.map((p) => (
                <button
                  key={p.id}
                  className={`garage-label ${activePart === p.id ? "is-active" : ""}`}
                  onClick={() => setActivePart(activePart === p.id ? null : p.id)}
                  data-cursor="link"
                >
                  <span className="garage-label-dot" />
                  <span className="garage-label-text">
                    <strong>{p.part}</strong>
                    <em>{p.domain}</em>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* spec panel */}
        <div className="garage-panel">
          <div className="garage-panel-head mono">
            <span className="garage-panel-live" /> COMPONENT SPEC
          </div>
          <AnimatePresence mode="wait">
            {info ? (
              <motion.div
                key={info.id + info.part}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <h3 className="garage-part display">{info.part}</h3>
                <div className="garage-domain mono">
                  MAPS TO — <span className="text-accent">{info.domain}</span>
                </div>
                <p className="garage-desc">{info.desc}</p>
                <div className="garage-tools">
                  {info.tools.map((t) => (
                    <span className="chip" key={t}>
                      <span>{t}</span>
                    </span>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h3 className="garage-part display">
                  CAR {driver.number}<span className="text-accent">.</span>
                </h3>
                <div className="garage-domain mono">FULL-STACK SPEC — {garageParts.length} SYSTEMS</div>
                <p className="garage-desc">
                  Keep scrolling to explode the build, then tap any floating part label to read its spec.
                  The machine is the resume.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="garage-hint mono" aria-hidden="true">
          ▾ SCROLL TO STRIP IT DOWN — TAP A PART FOR ITS SPEC
        </div>
      </div>
    </section>
  );
}
