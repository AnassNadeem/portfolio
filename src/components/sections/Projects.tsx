import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SectionHeader from "../SectionHeader";
import { projects, type Project } from "../../data/portfolio";
import { repoStats, type RepoStats } from "../../lib/github";
import "./Projects.css";

/** Six abstract circuit outlines — every feed gets its own track map */
const TRACKS = [
  "M 28,92 L 118,97 C 152,99 172,86 174,64 C 176,44 160,28 134,31 L 84,38 C 64,41 58,28 44,27 C 26,26 16,42 21,62 C 24,76 20,89 28,92 Z",
  "M 30,30 L 150,24 C 170,23 180,36 172,50 L 130,96 C 122,105 106,104 100,94 L 84,64 C 78,53 62,52 54,62 L 40,80 C 30,92 14,84 18,68 Z",
  "M 22,60 C 20,40 36,28 56,30 L 90,34 C 102,35 110,28 122,26 L 156,22 C 174,20 184,38 172,50 L 150,68 C 142,75 146,86 138,92 L 110,98 C 84,102 84,80 66,78 L 44,76 C 30,75 23,70 22,60 Z",
  "M 40,98 C 22,96 14,80 22,66 L 38,40 C 44,30 56,26 68,30 L 92,38 C 104,42 116,38 124,30 L 140,18 C 152,8 170,16 170,30 L 168,52 C 167,64 174,72 174,84 C 174,98 160,104 148,100 L 40,98 Z",
  "M 26,34 L 158,28 C 172,27 178,40 170,48 L 152,62 L 168,78 C 176,88 168,100 154,99 L 60,94 C 48,93 44,84 50,76 L 64,60 L 32,52 C 18,48 16,36 26,34 Z",
  "M 30,72 C 16,60 22,38 40,32 L 70,24 C 88,18 102,30 112,40 C 120,48 134,50 144,44 L 154,38 C 168,30 182,44 174,58 L 160,80 C 152,92 136,96 122,90 L 96,80 C 84,76 70,80 62,88 C 50,98 36,90 30,72 Z",
];

function sparkline(seed: number): string {
  const pts: string[] = [];
  let v = 30 + ((seed * 37) % 20);
  for (let i = 0; i <= 24; i++) {
    const x = (i / 24) * 200;
    v += Math.sin(i * 1.7 + seed * 3.1) * 9 + Math.cos(i * 0.6 + seed) * 5;
    v = Math.max(6, Math.min(44, v));
    pts.push(`${x.toFixed(1)},${(50 - v).toFixed(1)}`);
  }
  return pts.join(" ");
}

function ago(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const days = Math.floor(d / 86400000);
  if (days < 1) return "TODAY";
  if (days === 1) return "1D AGO";
  if (days < 30) return `${days}D AGO`;
  if (days < 365) return `${Math.floor(days / 30)}MO AGO`;
  return `${Math.floor(days / 365)}Y AGO`;
}

function useRepoStats(repo?: string) {
  const [stats, setStats] = useState<RepoStats | null>(null);
  useEffect(() => {
    if (!repo) return;
    let live = true;
    void repoStats(repo).then((s) => {
      if (live) setStats(s);
    });
    return () => {
      live = false;
    };
  }, [repo]);
  return stats;
}

function TrackArt({ project }: { project: Project }) {
  const d = TRACKS[project.trackId % TRACKS.length];
  return (
    <div className="pw-art" aria-hidden="true">
      <span className="pw-art-round display">{project.round}</span>
      <svg className="pw-art-svg" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
        <path className="pw-track-base" d={d} />
        <path className="pw-track-draw" d={d} pathLength={1} />
        <circle className="pw-track-sf" r="3.2" cx="28" cy="92" />
      </svg>
      <svg className="pw-art-spark" viewBox="0 0 200 50" preserveAspectRatio="none">
        <polyline points={sparkline(project.trackId)} />
      </svg>
    </div>
  );
}

/** One pit-wall monitor */
function Screen({ project, index, feature = false }: { project: Project; index: number; feature?: boolean }) {
  const stats = useRepoStats(project.repo);
  const [on, setOn] = useState(false);

  return (
    <motion.article
      className={`pw-screen ${feature ? "pw-screen--feature" : ""} ${on ? "is-on" : ""}`}
      data-cursor="view"
      initial={{ opacity: 0, scaleY: 0.04 }}
      whileInView={{ opacity: 1, scaleY: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, delay: (index % 2) * 0.1, ease: [0.16, 1, 0.3, 1] }}
      onViewportEnter={() => setOn(true)}
    >
      <div className="pw-screen-scan" aria-hidden="true" />

      {/* bezel header */}
      <header className="pw-screen-head mono">
        <span className="pw-feed">
          <i className="pw-rec" aria-hidden="true" /> FEED {String(index + 1).padStart(2, "0")} — {project.name.toUpperCase()}
        </span>
        <span className="pw-status">{project.status ?? "ONLINE"}</span>
      </header>

      <div className="pw-screen-body">
        <TrackArt project={project} />
        <div className="pw-meta">
          <div className="pw-top mono">
            <span className="text-accent">ROUND {project.round.slice(1)}</span>
            <span>{project.year}</span>
          </div>
          <h3 className="pw-name display">{project.name}</h3>
          <p className="pw-desc">{project.description}</p>
          <div className="pw-stack">
            {project.stack.map((s) => (
              <span className="chip" key={s}>
                <span>{s}</span>
              </span>
            ))}
          </div>
          <div className="pw-links mono">
            {project.github && (
              <a href={project.github} target="_blank" rel="noreferrer" data-cursor="link">
                GITHUB <span aria-hidden="true">↗</span>
              </a>
            )}
            {project.live && (
              <a href={project.live} target="_blank" rel="noreferrer" data-cursor="link">
                LIVE <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* live telemetry strip — straight from the GitHub API */}
      <footer className="pw-screen-foot mono">
        {project.repo ? (
          stats ? (
            <>
              <span>★ {stats.stars}</span>
              <span>⑂ {stats.forks}</span>
              {stats.language && <span>{stats.language.toUpperCase()}</span>}
              <span className="pw-foot-right">PUSHED {ago(stats.pushedAt)}</span>
            </>
          ) : (
            <span className="pw-foot-wait">ACQUIRING TELEMETRY…</span>
          )
        ) : (
          <span className="pw-foot-wait">LOCAL FEED — NO REMOTE TELEMETRY</span>
        )}
      </footer>
    </motion.article>
  );
}

export default function Projects() {
  const featured = projects.find((p) => p.featured) ?? projects[0];
  const rest = projects.filter((p) => p !== featured);
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="section projects" id="projects">
      <div className="container">
        <SectionHeader sector="04" kicker="MISSION CONTROL" title="The Pit Wall" />

        <div className="pitwall">
          {/* command-center status bar */}
          <div className="pw-bar mono">
            <span className="pw-bar-cell">
              <i className="pw-rec" aria-hidden="true" /> PIT WALL OS v4.2
            </span>
            <span className="pw-bar-cell">FEEDS — {projects.length} ACTIVE</span>
            <span className="pw-bar-cell pw-bar-clock">UTC {clock}</span>
            <span className="pw-bar-cell pw-bar-leds" aria-hidden="true">
              <i /><i /><i />
            </span>
          </div>

          <Screen project={featured} index={0} feature />

          <div className="pw-grid">
            {rest.map((p, i) => (
              <div className="pw-tilt" key={p.name}>
                <Screen project={p} index={i + 1} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
