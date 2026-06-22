import { useCallback, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionHeader from "../SectionHeader";
import TurnstileWidget from "../TurnstileWidget";
import { driver, FORM_ENDPOINT } from "../../data/portfolio";
import "./Contact.css";

type Status = "idle" | "sending" | "sent" | "error";

const SUBJECTS = ["Project Inquiry", "Job Opportunity", "Collaboration", "Just Saying Hi"];

// Edge Function URL — derived from the Supabase project URL (client-safe, anon only)
const CONTACT_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/contact-submit`
  : null;

const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? "";

type Fields = { name: string; email: string; subject: string; message: string };

const EMPTY: Fields = { name: "", email: "", subject: SUBJECTS[0], message: "" };

async function callEdge(url: string, body: object): Promise<Response> {
  const opts: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
  try {
    return await fetch(url, opts);
  } catch {
    // One automatic retry on network failure
    return await fetch(url, opts);
  }
}

export default function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [tsResetKey, setTsResetKey] = useState(0);

  const set = useCallback(
    (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFields((f) => ({ ...f, [k]: e.target.value })),
    []
  );

  const handleToken = useCallback((t: string) => setTurnstileToken(t), []);
  const handleExpire = useCallback(() => setTurnstileToken(""), []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const { name, email, subject, message } = fields;

    // Client-side validation (server is authoritative)
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "CALL SIGN REQUIRED";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "INVALID FREQUENCY";
    if (message.trim().length < 10) errs.message = "MESSAGE TOO SHORT (MIN 10)";
    if (CONTACT_URL && TURNSTILE_SITE_KEY && !turnstileToken) errs.turnstile = "COMPLETE THE BOT CHECK BELOW";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus("sending");

    // ── Path 1: Supabase Edge Function (production) ────────────────────────
    if (CONTACT_URL) {
      try {
        // hp field: honeypot — intentionally left empty by humans, filled by bots
        const hp = (form.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
        const res = await callEdge(CONTACT_URL, { name: name.trim(), email: email.trim(), subject, message: message.trim(), turnstileToken, hp });
        if (res.ok) {
          setStatus("sent");
          setFields(EMPTY);
          setTurnstileToken("");
          setTsResetKey((k) => k + 1);
        } else {
          const data = (await res.json()) as { error?: string };
          setStatus("error");
          setErrors({ server: data.error ?? "Unknown error" });
          // Reset Turnstile so user can re-challenge
          setTsResetKey((k) => k + 1);
          setTurnstileToken("");
        }
      } catch {
        setStatus("error");
        setTsResetKey((k) => k + 1);
        setTurnstileToken("");
      }
      return;
    }

    // ── Path 2: Legacy FORM_ENDPOINT (optional fallback) ───────────────────
    if (FORM_ENDPOINT) {
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ name, email, subject, message }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setStatus("sent");
        setFields(EMPTY);
      } catch {
        setStatus("error");
      }
      return;
    }

    // ── Path 3: mailto fallback (dev mode — no backend configured) ─────────
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    const subj = encodeURIComponent(`[PORTFOLIO] ${subject} — ${name}`);
    window.location.href = `mailto:${driver.email}?subject=${subj}&body=${body}`;
    setStatus("sent");
  };

  const useEdge = Boolean(CONTACT_URL);

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
                    {useEdge
                      ? "Message transmitted — I'll get back to you within 24 hours."
                      : FORM_ENDPOINT
                      ? "Message transmitted — I'll get back to you within 24 hours."
                      : "Your mail client should be open with the draft. Didn't open? Email me directly at "}
                    {!useEdge && !FORM_ENDPOINT && <a href={`mailto:${driver.email}`}>{driver.email}</a>}
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
                  {/* Honeypot — hidden from real users; bots fill it in */}
                  <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
                    <label htmlFor="website">Leave this empty</label>
                    <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                  </div>

                  <div className="field-row">
                    <div className={`field ${errors.name ? "has-error" : ""}`}>
                      <label className="mono" htmlFor="cf-name">CALL SIGN — NAME</label>
                      <input
                        id="cf-name"
                        name="name"
                        type="text"
                        placeholder="Lewis Hamilton"
                        autoComplete="name"
                        value={fields.name}
                        onChange={set("name")}
                      />
                      {errors.name && <span className="field-err mono">{errors.name}</span>}
                    </div>
                    <div className={`field ${errors.email ? "has-error" : ""}`}>
                      <label className="mono" htmlFor="cf-email">FREQUENCY — EMAIL</label>
                      <input
                        id="cf-email"
                        name="email"
                        type="email"
                        placeholder="you@team.com"
                        autoComplete="email"
                        value={fields.email}
                        onChange={set("email")}
                      />
                      {errors.email && <span className="field-err mono">{errors.email}</span>}
                    </div>
                  </div>

                  <div className="field">
                    <label className="mono" htmlFor="cf-subject">CHANNEL — SUBJECT</label>
                    <div className="select-wrap">
                      <select
                        id="cf-subject"
                        name="subject"
                        value={fields.subject}
                        onChange={set("subject")}
                      >
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
                      value={fields.message}
                      onChange={set("message")}
                    />
                    {errors.message && <span className="field-err mono">{errors.message}</span>}
                  </div>

                  {/* Turnstile bot-check — only shown when the edge function is configured */}
                  {useEdge && TURNSTILE_SITE_KEY && (
                    <div>
                      <TurnstileWidget
                        siteKey={TURNSTILE_SITE_KEY}
                        onToken={handleToken}
                        onExpire={handleExpire}
                        resetKey={tsResetKey}
                      />
                      {errors.turnstile && <span className="field-err mono">{errors.turnstile}</span>}
                    </div>
                  )}

                  {status === "error" && (
                    <p className="radio-error mono">
                      ⚠ {errors.server ?? "TRANSMISSION FAILED — TRY AGAIN OR EMAIL DIRECTLY"}
                    </p>
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
