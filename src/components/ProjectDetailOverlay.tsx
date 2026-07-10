import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
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
  const scrollRef = useRef<HTMLElement>(null);
  const [stats, setStats] = useState<RepoStats | null>(null);
  const { lenisRef } = useApp();

  // Freeze page scroll — only the card body scrolls inside the overlay
  useEffect(() => {
    if (!project) return;
    lenisRef.current?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onWheel = (e: WheelEvent) => {
      const el = scrollRef.current;
      if (!el) return;

      if (!el.contains(e.target as Node)) {
        e.preventDefault();
        return;
      }

      e.stopPropagation();

      const { scrollTop, scrollHeight, clientHeight } = el;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll <= 0) {
        e.preventDefault();
        return;
      }

      const atTop = scrollTop <= 0;
      const atBottom = scrollTop >= maxScroll - 1;
      const goingUp = e.deltaY < 0;
      const goingDown = e.deltaY > 0;

      if ((atTop && goingUp) || (atBottom && goingDown)) {
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    const el = scrollRef.current;
    el?.addEventListener("wheel", onWheel, { passive: false, capture: true });

    return () => {
      el?.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("wheel", onWheel);
      lenisRef.current?.start();
      document.body.style.overflow = prev;
    };
  }, [project, lenisRef]);

  useEffect(() => {
    if (!project?.repo) {
      setStats(null);
      return;
    }
    let live = true;
    void repoStats(project.repo).then((s) => live && setStats(s));
    return () => {
      live = false;
    };
  }, [project?.repo]);

  useEffect(() => {
    if (!project) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [project, onClose]);

  return createPortal(
    <AnimatePresence>
      {project && (
        <motion.div
          className="pdo-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          role="dialog"
          aria-modal="true"
          aria-label={`${project.name} details`}
        >
          <motion.div
            className="pdo-card-wrap"
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <article
              className="pdo-card"
              ref={scrollRef}
              data-lenis-prevent
            >
              <button className="pdo-close mono" onClick={onClose} aria-label="Close" data-cursor="link">
                ✕
              </button>
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
                    <span className="chip" key={s}>
                      <span>{s}</span>
                    </span>
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
                    <a href={project.github} target="_blank" rel="noreferrer" data-cursor="link">
                      GITHUB ↗
                    </a>
                  )}
                  {project.live && (
                    <a href={project.live} target="_blank" rel="noreferrer" data-cursor="link">
                      LIVE ↗
                    </a>
                  )}
                  {project.paper && (
                    <a href={project.paper} target="_blank" rel="noreferrer" data-cursor="link">
                      PAPER ↗
                    </a>
                  )}
                </div>
              </div>
            </article>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
