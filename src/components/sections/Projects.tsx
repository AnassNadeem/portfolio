import { lazy, Suspense, useEffect, useRef, useState } from "react";
import SectionHeader from "../SectionHeader";
import ProjectDetailOverlay from "../ProjectDetailOverlay";
import { projects, type Project } from "../../data/portfolio";
import { supportsWebGL } from "../../lib/webgl";
import "./Projects.css";

const PitSphereScene = lazy(() => import("../three/PitSphereScene"));

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

  return (
    <section className="section projects" id="projects">
      <div className="container">
        <SectionHeader sector="04" kicker="MISSION CONTROL" title="The Pit Wall" />
        <p className="pw-hint mono">DRAG TO LOOK AROUND — CLICK A PROJECT FOR DETAILS</p>
      </div>

      <div className="pw-sphere-stage" ref={stageRef}>
        {webgl ? (
          <Suspense fallback={<div className="pw-sphere-loading mono">LOADING GALLERY…</div>}>
            <PitSphereScene active={sceneActive} onSelect={setSelected} />
          </Suspense>
        ) : (
          <div className="container">
            <ProjectGridFallback onSelect={setSelected} />
          </div>
        )}
      </div>

      <ProjectDetailOverlay project={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
