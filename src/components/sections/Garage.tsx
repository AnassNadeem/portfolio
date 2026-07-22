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
      });

      // mobile: pin as well — the car must fully explode before the
      // section releases and the page moves on
      mm.add("(max-width: 860px)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: stageRef.current,
            start: "top top",
            end: "+=160%",
            scrub: 1.2,
            pin: true,
            anticipatePin: 1,
          },
        });
        tl.fromTo(explodeRef, { current: 0 }, { current: 1, ease: "none", duration: 0.75 });
        tl.to(explodeRef, { current: 1, duration: 0.25 });
      });
    },
    { scope: rootRef }
  );

  const info = garageParts.find((p) => p.id === activePart) ?? null;

  return (
    <section className="section garage" id="garage" ref={rootRef}>
      <div className="garage-stage" ref={stageRef}>
        <div className="garage-head">
          <div className="eyebrow mono">
            <span className="slash" />
            <span>SECTOR 02 · THE MACHINE</span>
          </div>
          <h2 className="garage-title display">
            The Garage<span className="text-accent">.</span>
          </h2>
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
            COMPONENT SPEC
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
                  MAPS TO · <span className="text-accent">{info.domain}</span>
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
                <div className="garage-domain mono">{garageParts.length} SYSTEMS</div>
                <p className="garage-desc">
                  Scroll to explode the build. Tap a part for its spec.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
