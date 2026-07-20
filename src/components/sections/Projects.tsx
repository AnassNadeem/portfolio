import { lazy, Suspense, useEffect, useRef, useState } from "react";
import SectionHeader from "../SectionHeader";
import ProjectDetailOverlay from "../ProjectDetailOverlay";
import { projects, type Project } from "../../data/portfolio";
import { supportsWebGL } from "../../lib/webgl";
import type { WallApi } from "../three/PitWallScene";
import "./Projects.css";

const PitWallScene = lazy(() => import("../three/PitWallScene"));

function ProjectGridFallback({ onSelect }: { onSelect: (p: Project) => void }) {
  return (
    <div className="pw-fallback-grid">
      {projects.map((p) => (
        <button
          key={p.name}
          className="pw-fallback-card"
          onClick={() => onSelect(p)}
          data-cursor="view"
        >
          {p.image && <img src={p.image} alt="" loading="lazy" />}
          <div className="pw-fallback-meta">
            <span className="mono text-accent">{p.round}</span>
            <h3 className="display">{p.name}</h3>
            <p>{p.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function Projects() {
  const [selected, setSelected] = useState<Project | null>(null);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<WallApi>({ yawTarget: 0, maxYaw: 0.4 });
  const webgl = supportsWebGL();
  const sceneActive = inView && tabVisible && webgl;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "200px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const nudge = (dir: -1 | 1) => {
    const a = apiRef.current;
    // half the available travel per tap — two taps reach either end
    a.yawTarget = Math.max(-a.maxYaw, Math.min(a.maxYaw, a.yawTarget + dir * a.maxYaw * 0.5));
  };

  return (
    <section className="section projects" id="projects">
      <div className="container">
        <SectionHeader sector="04" kicker="MISSION CONTROL" title="The Pit Wall" />
        <p className="pw-hint mono">
          <span className="pw-hint-drag" aria-hidden="true">⟵ ⟶</span>
          DRAG TO SCAN · CLICK TO OPEN
        </p>
      </div>

      <div className="pw-wall-stage" ref={stageRef}>
        {webgl ? (
          <Suspense fallback={<div className="pw-wall-loading mono">BOOTING MONITORS…</div>}>
            <PitWallScene
              active={sceneActive}
              onSelect={setSelected}
              api={apiRef}
              progressEl={progressRef}
            />
          </Suspense>
        ) : (
          <div className="container">
            <ProjectGridFallback onSelect={setSelected} />
          </div>
        )}

        {webgl && (
          <>
            {/* console frame: vignette, scanlines, desk silhouette */}
            <div className="pw-frame" aria-hidden="true">
              <div className="pw-frame-scanlines" />
              <div className="pw-frame-desk" />
            </div>

            {/* HUD: session header strip */}
            <div className="pw-hud mono" aria-hidden="true">
              PIT WALL
              <span className="pw-hud-sep">|</span>
              {projects.length} FEEDS
            </div>

            {/* pan controls */}
            <button className="pw-arrow pw-arrow--left mono" onClick={() => nudge(1)} aria-label="Pan left" data-cursor="link">
              ◀
            </button>
            <button className="pw-arrow pw-arrow--right mono" onClick={() => nudge(-1)} aria-label="Pan right" data-cursor="link">
              ▶
            </button>

            {/* pan progress track */}
            <div className="pw-track" aria-hidden="true">
              <div className="pw-track-thumb" ref={progressRef} />
            </div>
          </>
        )}
      </div>

      <ProjectDetailOverlay project={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
