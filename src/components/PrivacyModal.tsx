import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { driver } from "../data/portfolio";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ open, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            className="privacy-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(10,10,12,0.82)", zIndex: 2000, backdropFilter: "blur(4px)" }}
          />

          {/* panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Privacy Notice"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: [0.25, 0, 0, 1] }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              height: "100dvh",
              width: "min(540px, 100vw)",
              background: "#111115",
              borderLeft: "1px solid #2c2c33",
              zIndex: 2001,
              overflowY: "auto",
              padding: "2.5rem 2rem",
              boxSizing: "border-box",
            }}
          >
            <button
              onClick={onClose}
              aria-label="Close privacy notice"
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "none",
                border: "none",
                color: "#9ba1a6",
                fontSize: "1.4rem",
                cursor: "pointer",
                lineHeight: 1,
              }}
              data-cursor="link"
            >
              ✕
            </button>

            <p className="mono" style={{ color: "var(--accent, #e10600)", fontSize: "10px", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
              LEGAL DOCS — UK GDPR
            </p>
            <h2 className="display" style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", marginBottom: "1.75rem", lineHeight: 1.15 }}>
              Privacy Notice
            </h2>

            <div style={{ fontSize: "13px", lineHeight: 1.7, color: "#c8ccd0" }} className="privacy-body">

              <Section title="Who is the data controller?">
                <p>{driver.firstName} {driver.lastName} (<a href={`mailto:${driver.email}`} style={{ color: "var(--accent, #e10600)" }}>{driver.email}</a>). This is a personal portfolio website operated by an individual, not a company.</p>
              </Section>

              <Section title="What data do we collect?">
                <p><strong>Contact form</strong> — your name, email address, subject, and message body. This is used solely to reply to your enquiry.</p>
                <p><strong>Arcade leaderboard</strong> — your chosen display name and lap time (score). If you opt-in via the consent checkbox, we also store your email address so we can contact you about future projects.</p>
                <p>No cookies, no tracking pixels, no session cookies, and no fingerprinting are used.</p>
              </Section>

              <Section title="Lawful basis (UK GDPR Art. 6)">
                <p><strong>Contact messages</strong> — Legitimate interests (Art. 6(1)(f)): responding to someone who chose to make contact is a proportionate, expected use of their data.</p>
                <p><strong>Arcade email sign-up</strong> — Consent (Art. 6(1)(a)): the checkbox is unchecked by default and you can opt out at any time by requesting deletion.</p>
              </Section>

              <Section title="How long do we keep your data?">
                <p>Contact messages: up to 12 months or until the enquiry is resolved, whichever is sooner.</p>
                <p>Arcade leaderboard entries (scores): indefinitely, as they are effectively public pseudonymous records.</p>
                <p>Arcade email sign-ups: until you request deletion.</p>
              </Section>

              <Section title="Who do we share data with?">
                <p>Data is stored on <strong>Supabase</strong> (EU-region database). Supabase acts as a data processor under a Data Processing Agreement.</p>
                <p>Contact form submissions trigger a notification email via <strong>Resend</strong> (email delivery service). Resend receives your name, email, and message.</p>
                <p>New arcade sign-ups post a masked email (e.g. <code>jo***@example.com</code>) to a private <strong>Discord</strong> server as an internal notification. The full email is never shared with Discord.</p>
                <p>No data is sold or shared with advertisers or any other third party.</p>
              </Section>

              <Section title="Your rights under UK GDPR">
                <ul style={{ paddingLeft: "1.25rem", margin: "0.5rem 0" }}>
                  {[
                    "Right of access — request a copy of data held about you",
                    "Right to rectification — ask us to correct inaccurate data",
                    "Right to erasure — ask us to delete your data ('right to be forgotten')",
                    "Right to restrict processing — ask us to pause processing while a dispute is resolved",
                    "Right to data portability — receive your data in a machine-readable format",
                    "Right to object — object to processing based on legitimate interests",
                  ].map((r) => (
                    <li key={r} style={{ marginBottom: "0.35rem" }}>{r}</li>
                  ))}
                </ul>
                <p>To exercise any right, email <a href={`mailto:${driver.email}?subject=Privacy%20Request`} style={{ color: "var(--accent, #e10600)" }}>{driver.email}</a> with the subject line <em>"Privacy Request"</em>. We will respond within 30 days.</p>
              </Section>

              <Section title="Deletion requests">
                <p>Email <a href={`mailto:${driver.email}?subject=Deletion%20Request`} style={{ color: "var(--accent, #e10600)" }}>{driver.email}</a> with subject <em>"Deletion Request"</em> and the email address you used. We will delete your record from the database within 30 days and confirm by reply.</p>
              </Section>

              <Section title="Complaints">
                <p>If you believe your data has been mishandled you have the right to lodge a complaint with the UK Information Commissioner's Office (ICO) at <strong>ico.org.uk</strong>.</p>
              </Section>

              <p className="mono" style={{ fontSize: "10px", color: "#555", marginTop: "2rem" }}>
                Last updated: June 2026
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3 className="mono" style={{ fontSize: "10px", letterSpacing: "0.1em", color: "#9ba1a6", marginBottom: "0.5rem", textTransform: "uppercase" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
