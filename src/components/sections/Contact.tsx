import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionHeader from "../SectionHeader";
import { driver, FORM_ENDPOINT } from "../../data/portfolio";
import "./Contact.css";

type Status = "idle" | "sending" | "sent" | "error";

const SUBJECTS = ["Project Inquiry", "Job Opportunity", "Collaboration", "Just Saying Hi"];

export default function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const subject = String(data.get("subject") ?? SUBJECTS[0]);
    const message = String(data.get("message") ?? "").trim();

    const errs: Record<string, string> = {};
    if (!name) errs.name = "CALL SIGN REQUIRED";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "INVALID FREQUENCY";
    if (message.length < 10) errs.message = "MESSAGE TOO SHORT (MIN 10)";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus("sending");

    if (FORM_ENDPOINT) {
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ name, email, subject, message }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setStatus("sent");
        form.reset();
      } catch {
        setStatus("error");
      }
    } else {
      // no backend configured → open a pre-composed email draft
      const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      const subj = encodeURIComponent(`[PORTFOLIO] ${subject} — ${name}`);
      window.location.href = `mailto:${driver.email}?subject=${subj}&body=${body}`;
      setStatus("sent");
    }
  };

  return (
    <section className="section contact" id="contact">
      <div className="container">
        <SectionHeader sector="06" kicker="OPEN CHANNEL" title="Box Box — Let's Talk" />

        <div className="contact-grid">
          {/* left rail: status + direct channels */}
          <div className="contact-rail">
            <div className="contact-status">
              <span className={`contact-dot ${driver.available ? "is-live" : ""}`} aria-hidden="true" />
              <span className="mono">
                STATUS: {driver.available ? "AVAILABLE FOR OPPORTUNITIES" : "ON TRACK — BUSY"}
              </span>
            </div>

            <p className="contact-lede hl">
              Have a project that needs to go faster — or a team that needs a closer?
              My inbox is always open. Radio in and I'll get back within 24 hours.
            </p>

            <a className="contact-email display" href={`mailto:${driver.email}`} data-cursor="link">
              {driver.email}
            </a>

            <div className="contact-channels">
              <a className="contact-channel" href={driver.github} target="_blank" rel="noreferrer" data-cursor="link">
                <span className="mono">GITHUB</span>
                <span className="contact-channel-arrow" aria-hidden="true">↗</span>
              </a>
              <a className="contact-channel" href={driver.linkedin} target="_blank" rel="noreferrer" data-cursor="link">
                <span className="mono">LINKEDIN</span>
                <span className="contact-channel-arrow" aria-hidden="true">↗</span>
              </a>
              <a className="contact-channel" href={driver.resume} target="_blank" rel="noreferrer" data-cursor="view">
                <span className="mono">RESUME.PDF</span>
                <span className="contact-channel-arrow" aria-hidden="true">↗</span>
              </a>
            </div>

            <div className="contact-meta mono">
              <span>HOME CIRCUIT — {driver.location}</span>
              <span>RESPONSE TIME — &lt; 24 HRS</span>
            </div>
          </div>

          {/* the radio console */}
          <div className="radio-panel">
            <div className="radio-head mono">
              <span>TEAM RADIO — ENCRYPTED</span>
              <span className="radio-waves" aria-hidden="true">
                <i /><i /><i /><i />
              </span>
            </div>

            <AnimatePresence mode="wait">
              {status === "sent" ? (
                <motion.div
                  key="sent"
                  className="radio-sent"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="radio-sent-check" aria-hidden="true">✓</div>
                  <h3 className="display">Radio received.</h3>
                  <p>
                    {FORM_ENDPOINT
                      ? "Message transmitted — I'll get back to you within 24 hours."
                      : "Your mail client should be open with the draft. Didn't open? Email me directly at "}
                    {!FORM_ENDPOINT && <a href={`mailto:${driver.email}`}>{driver.email}</a>}
                  </p>
                  <button className="btn btn--ghost" onClick={() => setStatus("idle")} data-cursor="link">
                    <span>Send Another</span>
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  className="radio-form"
                  onSubmit={submit}
                  noValidate
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="field-row">
                    <div className={`field ${errors.name ? "has-error" : ""}`}>
                      <label className="mono" htmlFor="cf-name">CALL SIGN — NAME</label>
                      <input id="cf-name" name="name" type="text" placeholder="Lewis Hamilton" autoComplete="name" />
                      {errors.name && <span className="field-err mono">{errors.name}</span>}
                    </div>
                    <div className={`field ${errors.email ? "has-error" : ""}`}>
                      <label className="mono" htmlFor="cf-email">FREQUENCY — EMAIL</label>
                      <input id="cf-email" name="email" type="email" placeholder="you@team.com" autoComplete="email" />
                      {errors.email && <span className="field-err mono">{errors.email}</span>}
                    </div>
                  </div>

                  <div className="field">
                    <label className="mono" htmlFor="cf-subject">CHANNEL — SUBJECT</label>
                    <div className="select-wrap">
                      <select id="cf-subject" name="subject" defaultValue={SUBJECTS[0]}>
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={`field ${errors.message ? "has-error" : ""}`}>
                    <label className="mono" htmlFor="cf-message">TRANSMISSION — MESSAGE</label>
                    <textarea
                      id="cf-message"
                      name="message"
                      rows={5}
                      placeholder="Tell me about the project, the team, the timeline — or just say hi."
                    />
                    {errors.message && <span className="field-err mono">{errors.message}</span>}
                  </div>

                  {status === "error" && (
                    <p className="radio-error mono">⚠ TRANSMISSION FAILED — TRY AGAIN OR EMAIL DIRECTLY</p>
                  )}

                  <motion.button
                    className="btn radio-submit"
                    type="submit"
                    disabled={status === "sending"}
                    whileTap={{ scale: 0.96 }}
                    data-cursor="link"
                  >
                    <span>{status === "sending" ? "Transmitting…" : "Transmit Message"}</span>
                    <span className="arrow">▸</span>
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
