import { useEffect, useRef, useState } from "react";
import {
  submitScore,
  fmtMs,
  loadDriverProfile,
  saveDriverProfile,
  type Game,
} from "../lib/leaderboard";
import { supabaseReady } from "../lib/supabase";
import TurnstileWidget from "./TurnstileWidget";

const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? "";

/** One email = one call sign across all arcade games (global grid via Edge Function). */
export default function SubmitScore({
  game,
  ms,
  onDone,
  formOnly = false,
}: {
  game: Game;
  ms: number;
  onDone: () => void;
  /** Hide score + use compact column (Grid Run split layout). */
  formOnly?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedPermanently, setSavedPermanently] = useState(false);
  const [renamed, setRenamed] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [tsResetKey, setTsResetKey] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    const profile = loadDriverProfile();
    if (profile) {
      setEmail(profile.email);
      setName(profile.playerName.replace(/·/g, ""));
    }
  }, []);

  const save = async () => {
    if (saved || submitting.current) return;

    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setEmailErr("INVALID EMAIL FORMAT");
        return;
      }
      if (!consent) {
        setEmailErr("TICK THE BOX TO JOIN THE GLOBAL LEADERBOARD");
        return;
      }
      if (supabaseReady && TURNSTILE_SITE_KEY && !turnstileToken) {
        setEmailErr("COMPLETE THE BOT CHECK BELOW");
        return;
      }
    }
    setEmailErr("");
    submitting.current = true;

    const result = await submitScore(game, {
      name: name || "AAA",
      ms,
      email: trimmedEmail || undefined,
      consent: trimmedEmail ? consent : false,
      turnstileToken: trimmedEmail ? turnstileToken : undefined,
    });

    submitting.current = false;

    if (result.error && trimmedEmail) {
      setSaveError(result.error);
      setTsResetKey((k) => k + 1);
      setTurnstileToken("");
      return;
    }

    setSaved(true);
    setSavedPermanently(Boolean(result.savedPermanently));
    if (result.playerName) {
      setName(result.playerName.replace(/·/g, ""));
      if (trimmedEmail) saveDriverProfile(trimmedEmail, result.playerName);
    }
    if (result.renamed) setRenamed(true);
    setTimeout(onDone, 1400);
  };

  const showSignup = supabaseReady;
  const hasEmail = email.trim().length > 0;
  const profile = loadDriverProfile();
  const returningDriver = Boolean(profile && profile.email === email.trim().toLowerCase());

  return (
    <div className={`gc-submit${formOnly ? " gc-submit--form-only" : ""}`}>
      {!formOnly && <div className="gc-submit-time display">{fmtMs(ms, game)}</div>}

      <div className="gc-submit-row">
        <label className="mono" htmlFor="gc-initials">CALL SIGN</label>
        <input
          id="gc-initials"
          className="gc-initials"
          value={name}
          maxLength={3}
          placeholder="AAA"
          onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          autoComplete="off"
        />
      </div>

      {showSignup && (
        <>
          <div className="gc-submit-row">
            <label className="mono" htmlFor="gc-email">EMAIL</label>
            <input
              id="gc-email"
              type="email"
              value={email}
              placeholder="you@team.com"
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailErr("");
                setTurnstileToken("");
              }}
            />
          </div>

          {returningDriver && (
            <p className="gc-fineprint mono">
              Welcome back. Rename updates all games.
            </p>
          )}

          {hasEmail && (
            <label className="gc-consent mono">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              Your email is only used for the leaderboard and won't be shared.
            </label>
          )}

          {hasEmail && TURNSTILE_SITE_KEY && (
            <TurnstileWidget
              siteKey={TURNSTILE_SITE_KEY}
              onToken={setTurnstileToken}
              onExpire={() => setTurnstileToken("")}
              resetKey={tsResetKey}
            />
          )}

          {emailErr && <p className="gc-fineprint mono" style={{ color: "var(--accent)" }}>{emailErr}</p>}
        </>
      )}

      {showSignup ? (
        saved ? (
          <p className="gc-fineprint mono" style={savedPermanently ? { color: "var(--accent)" } : undefined}>
            {saveError
              ? `⚠ ${saveError.toUpperCase()}`
              : savedPermanently
                ? renamed
                  ? "✓ Call sign updated."
                  : "✓ Saved to global leaderboard."
                : "✓ Ranked this session. Add email to go global."}
          </p>
        ) : (
          <p className="gc-fineprint mono">
            {hasEmail
              ? "One email = one call sign across all games."
              : "No email = session only. Add email to go global."}
          </p>
        )
      ) : (
        <p className="gc-fineprint mono">Session only. Cleared on refresh.</p>
      )}

      <button className="btn gc-save" onClick={save} disabled={saved} data-cursor="link">
        <span>{saved ? "POSTED ✓" : hasEmail ? "Save To Global Leaderboard" : "Post Session Time"}</span>
      </button>
    </div>
  );
}
