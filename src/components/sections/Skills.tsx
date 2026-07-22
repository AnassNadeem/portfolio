import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";
import { gsap } from "../../lib/gsap";
import SectionHeader from "../SectionHeader";
import { useApp } from "../../context/AppContext";
import { coreSkills, skillGroups, driver } from "../../data/portfolio";
import "./Skills.css";

export default function Skills() {
  const { reduced } = useApp();
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reduced) return;
      const q = gsap.utils.selector(rootRef);

      gsap.utils.toArray<HTMLElement>(q(".tel-row")).forEach((row, i) => {
        const fill = row.querySelector<HTMLElement>(".tel-fill");
        const val = row.querySelector<HTMLElement>(".tel-val");
        const target = Number(row.dataset.value ?? 0);
        const counter = { v: 0 };

        gsap.timeline({
          scrollTrigger: { trigger: row, start: "top 86%", once: true },
          delay: i * 0.08,
        })
          .fromTo(fill, { scaleX: 0 }, { scaleX: target / 100, duration: 1.3, ease: "power3.inOut" })
          .to(
            counter,
            {
              v: target,
              duration: 1.3,
              ease: "power3.inOut",
              onUpdate: () => {
                if (val) val.textContent = String(Math.round(counter.v)).padStart(2, "0");
              },
              onComplete: () => {
                // live telemetry jitter — the readout never quite sits still
                gsap.to(counter, {
                  v: () => target + gsap.utils.random(-1.6, 1.6),
                  duration: 0.5,
                  repeat: -1,
                  repeatRefresh: true,
                  ease: "none",
                  onUpdate: () => {
                    if (val) val.textContent = String(Math.round(counter.v)).padStart(2, "0");
                  },
                });
              },
            },
            "<"
          );
      });
    },
    { scope: rootRef }
  );

  return (
    <section className="section skills" id="skills" ref={rootRef}>
      <div className="container">
        <SectionHeader sector="05" kicker="THE TOOLKIT" title="Telemetry" />

        <div className="skills-grid">
          {/* live channel readouts */}
          <div className="tel-panel">
            <div className="tel-head mono">
              <span>CORE SYSTEMS</span>
              <span>CAR {driver.number}</span>
            </div>
            {coreSkills.map((s) => (
              <div className="tel-row" key={s.name} data-value={s.value}>
                <span className="tel-name">{s.name}</span>
                <div className="tel-track">
                  <div className="tel-fill" />
                </div>
                <span className="tel-val mono">00</span>
              </div>
            ))}
          </div>

          {/* pit-board chips */}
          <div className="skills-groups">
            {skillGroups.map((g, gi) => (
              <motion.div
                className="skills-group"
                key={g.title}
                initial={reduced ? false : { opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.55, delay: gi * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <h3 className="skills-group-title mono">
                  <span className="text-accent">//</span> {g.title}
                </h3>
                <div className="skills-chips">
                  {g.items.map((item) => (
                    <motion.span
                      className="chip chip--skill"
                      key={item}
                      whileHover={{ y: -3 }}
                      transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    >
                      <span>{item}</span>
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
