import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGSAP } from "@gsap/react";
import { gsap } from "../lib/gsap";
import type { Project } from "../data/portfolio";
import { repoStats, type RepoStats } from "../lib/github";
import "./ProjectDetailOverlay.css";

function ago(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const days = Math.floor(d / 86400000);
  if (days < 1) return "TODAY";
  if (days === 1) return "1D AGO";
  if (days < 30) return `${days}D AGO`;
  return `${Math.floor(days / 30)}MO AGO`;
}

export default function ProjectDetailOverlay({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const [stats, setStats] = useState<RepoStats | null>(null);

  useEffect(() => {
    if (!project?.repo) {
      setStats(null);
      return;
    }
    let live = true;
    void repoStats(project.repo).then((s) => live && setStats(s));
    return () => { live = false; };
  }, [project?.repo]);

  useEffect(() => {
    if (!project) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [project, onClose]);

  useGSAP(
    () => {
      if (!project || !cardRef.current) return;
      gsap.fromTo(
        cardRef.current,
        { scale: 0.85, rotateX: 8, opacity: 0 },
        { scale: 1, rotateX: 0, opacity: 1, duration: 0.55, ease: "power3.out" }
      );
    },
    { dependencies: [project] }
  );

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="pdo-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          role="dialog"
          aria-label={`${project.name} details`}
        >
          <motion.article
            className="pdo-card"
            ref={cardRef}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="pdo-close mono" onClick={onClose} aria-label="Close" data-cursor="link">✕</button>
            {project.image && (
              <div className="pdo-cover">
                <img src={project.image} alt="" />
              </div>
            )}
            <div className="pdo-body">
              <div className="pdo-meta mono">
                <span className="text-accent">{project.round}</span>
                <span>{project.year}</span>
                {project.status && <span>{project.status}</span>}
              </div>
              <h3 className="pdo-title display">{project.name}</h3>
              <p className="pdo-desc">{project.description}</p>
              <div className="pdo-stack">
                {project.stack.map((s) => (
                  <span className="chip" key={s}><span>{s}</span></span>
                ))}
              </div>
              {stats && (
                <div className="pdo-tel mono">
                  <span>★ {stats.stars}</span>
                  <span>⑂ {stats.forks}</span>
                  {stats.language && <span>{stats.language.toUpperCase()}</span>}
                  <span>PUSHED {ago(stats.pushedAt)}</span>
                </div>
              )}
              <div className="pdo-links mono">
                {project.github && (
                  <a href={project.github} target="_blank" rel="noreferrer" data-cursor="link">GITHUB ↗</a>
                )}
                {project.live && (
                  <a href={project.live} target="_blank" rel="noreferrer" data-cursor="link">LIVE ↗</a>
                )}
                {project.paper && (
                  <a href={project.paper} target="_blank" rel="noreferrer" data-cursor="link">PAPER ↗</a>
                )}
              </div>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
