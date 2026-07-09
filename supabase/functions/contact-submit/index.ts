// @ts-nocheck — Deno runtime file; not compiled by tsc/Vite. Ignore TS2304.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// In-memory rate limit — resets on cold start, fine for a portfolio
const rateMap = new Map<string, { n: number; reset: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 15 * 60 * 1000;

function allowed(ip: string): boolean {
  const now = Date.now();
  const rec = rateMap.get(ip);
  if (!rec || now > rec.reset) {
    rateMap.set(ip, { n: 1, reset: now + RATE_WINDOW });
    return true;
  }
  if (rec.n >= RATE_LIMIT) return false;
  rec.n++;
  return true;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

const ALLOWED_SUBJECTS = [
  "Project Inquiry",
  "Job Opportunity",
  "Collaboration",
  "Just Saying Hi",
] as const;

// Initialised once per isolate lifetime (not per request)
const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";

  if (!allowed(ip)) {
    return json({ error: "Too many requests. Please wait 15 minutes and try again." }, 429);
  }

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const { name, email, subject, message, turnstileToken, hp } = raw as Record<string, unknown>;

  // Honeypot: silently succeed so bots think the submission worked
  if (hp) return json({ ok: true });

  // Input validation
  const errs: string[] = [];
  if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 120) {
    errs.push("Name is required (max 120 chars).");
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errs.push("A valid email is required.");
  }
  if (typeof subject !== "string" || !(ALLOWED_SUBJECTS as readonly string[]).includes(subject)) {
    errs.push("Invalid subject.");
  }
  if (typeof message !== "string" || message.trim().length < 10 || message.trim().length > 5000) {
    errs.push("Message must be between 10 and 5000 characters.");
  }
  if (typeof turnstileToken !== "string" || !turnstileToken) {
    errs.push("Bot challenge token missing.");
  }
  if (errs.length) return json({ error: errs.join(" ") }, 422);

  // Turnstile server-side verification
  const tsRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: Deno.env.get("TURNSTILE_SECRET_KEY") ?? "",
      response: turnstileToken,
      remoteip: ip,
    }),
  });
  const tsData = (await tsRes.json()) as { success: boolean };
  if (!tsData.success) {
    return json({ error: "Bot challenge failed. Please refresh and try again." }, 403);
  }

  // Sanitize
  const cleanName = (name as string).trim().slice(0, 120);
  const cleanEmail = (email as string).trim().toLowerCase();
  const cleanSubject = subject as string;
  const cleanMessage = (message as string).trim().slice(0, 5000);

  // Insert via service_role — bypasses RLS (anon cannot write to messages)
  const { error: dbErr } = await sb.from("messages").insert({
    name: cleanName,
    email: cleanEmail,
    subject: cleanSubject,
    message: cleanMessage,
  });
  if (dbErr) {
    console.error("[contact-submit] db:", dbErr.message);
    return json({ error: "Failed to save your message. Please try again." }, 500);
  }

  // Email notification via Resend — best-effort (message already saved in DB)
  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const toEmail = Deno.env.get("NOTIFICATION_EMAIL") ?? "anass.nadeem42@gmail.com";
  let notificationSent = false;
  if (resendKey && toEmail) {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Portfolio Contact <onboarding@resend.dev>",
        to: [toEmail],
        reply_to: cleanEmail,
        subject: `[Portfolio] ${cleanSubject} — ${cleanName}`,
        html: `
          <div style="font-family:monospace;background:#0a0a0c;color:#f5f5f7;padding:28px 32px;border-radius:8px;max-width:600px">
            <p style="color:#e10600;font-size:11px;letter-spacing:0.12em;margin:0 0 6px">TEAM RADIO — NEW CONTACT FORM SUBMISSION</p>
            <h2 style="margin:0 0 20px;font-size:20px">${esc(cleanSubject)}</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr>
                <td style="color:#9ba1a6;padding:5px 12px 5px 0;width:72px;vertical-align:top">FROM</td>
                <td>${esc(cleanName)}</td>
              </tr>
              <tr>
                <td style="color:#9ba1a6;padding:5px 12px 5px 0;vertical-align:top">EMAIL</td>
                <td><a href="mailto:${esc(cleanEmail)}" style="color:#3671c6">${esc(cleanEmail)}</a></td>
              </tr>
              <tr>
                <td style="color:#9ba1a6;padding:5px 12px 5px 0;vertical-align:top">TIME</td>
                <td>${new Date().toUTCString()}</td>
              </tr>
            </table>
            <hr style="border:none;border-top:1px solid #2c2c33;margin:0 0 20px"/>
            <div style="white-space:pre-wrap;line-height:1.65;color:#d4d4d8">${esc(cleanMessage)}</div>
          </div>
        `,
      }),
    });
    if (emailRes.ok) {
      notificationSent = true;
    } else {
      // Message is in DB — don't fail the user, just log
      console.error("[contact-submit] resend:", await emailRes.text());
    }
  } else if (!resendKey) {
    console.warn("[contact-submit] resend: RESEND_API_KEY not configured");
  }

  // Discord notification via webhook — best-effort (message already saved + emailed)
  const discordUrl = Deno.env.get("DISCORD_WEBHOOK_URL") ?? "";
  if (discordUrl) {
    const discordRes = await fetch(discordUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: `📨 ${cleanSubject}`,
            description: cleanMessage.slice(0, 1800),
            color: 0xe10600,
            fields: [
              { name: "From", value: cleanName, inline: true },
              { name: "Email", value: cleanEmail, inline: true },
            ],
            footer: { text: "apex-portfolio · contact form" },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    if (!discordRes.ok) {
      // Message is in DB + emailed — don't fail the user, just log
      console.error("[contact-submit] discord:", await discordRes.text());
    }
  }

  return json({ ok: true, notificationSent });
});
