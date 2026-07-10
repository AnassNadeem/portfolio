// @ts-nocheck — Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GAMES = ["reaction", "pitstop", "hotlap", "gridrun"] as const;
type Game = (typeof GAMES)[number];

const RATE_LIMIT = 8;
const RATE_WINDOW = 15 * 60 * 1000;
const rateMap = new Map<string, { n: number; reset: number }>();

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "tempmail.com",
  "10minutemail.com",
  "throwaway.email",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "sharklasers.com",
  "maildrop.cc",
]);

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

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

function sanitizeName(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9·]/g, "").slice(0, 3).padEnd(3, "·");
}

function isDisposable(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return DISPOSABLE_DOMAINS.has(domain);
}

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";

  if (!allowed(ip)) {
    return json({ error: "Too many submissions. Wait a few minutes." }, 429);
  }

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const { name, email, game, score, consent, turnstileToken } = raw;

  if (typeof game !== "string" || !GAMES.includes(game as Game)) {
    return json({ error: "Invalid game." }, 422);
  }
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 600000) {
    return json({ error: "Invalid score." }, 422);
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return json({ error: "A valid email is required." }, 422);
  }
  if (consent !== true) {
    return json({ error: "Consent is required to join the global leaderboard." }, 422);
  }
  if (typeof turnstileToken !== "string" || !turnstileToken) {
    return json({ error: "Complete the bot check." }, 422);
  }
  if (typeof name !== "string" || !name.trim()) {
    return json({ error: "Call sign is required." }, 422);
  }

  const cleanEmail = email.trim().toLowerCase();
  if (isDisposable(cleanEmail)) {
    return json({ error: "Disposable email addresses are not allowed." }, 422);
  }

  const cleanName = sanitizeName(name);
  const cleanMs = Math.round(score);

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
    return json({ error: "Bot check failed. Refresh and try again." }, 403);
  }

  const { data: existingDriver, error: findErr } = await sb
    .from("drivers")
    .select("id, player_name")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (findErr) {
    console.error("[arcade-submit] find driver:", findErr.message);
    return json({ error: "Could not look up driver profile." }, 500);
  }

  let driverId = existingDriver?.id as string | undefined;
  let playerName = existingDriver?.player_name as string | undefined;

  if (existingDriver) {
    if (cleanName !== existingDriver.player_name) {
      const { data: nameTaken } = await sb
        .from("drivers")
        .select("id")
        .eq("player_name", cleanName)
        .neq("id", existingDriver.id)
        .maybeSingle();

      if (nameTaken) {
        return json({ error: "That call sign is already taken by another driver." }, 409);
      }

      const { error: renameErr } = await sb
        .from("drivers")
        .update({ player_name: cleanName, updated_at: new Date().toISOString() })
        .eq("id", existingDriver.id);

      if (renameErr) {
        console.error("[arcade-submit] rename:", renameErr.message);
        return json({ error: "Could not update call sign." }, 500);
      }
      playerName = cleanName;
    }

    await sb
      .from("drivers")
      .update({ consent: true, updated_at: new Date().toISOString() })
      .eq("id", existingDriver.id);
  } else {
    const { data: nameTaken } = await sb
      .from("drivers")
      .select("id")
      .eq("player_name", cleanName)
      .maybeSingle();

    if (nameTaken) {
      return json({ error: "That call sign is already taken. Pick another or use your registered email." }, 409);
    }

    const { data: created, error: createErr } = await sb
      .from("drivers")
      .insert({
        email: cleanEmail,
        player_name: cleanName,
        consent: true,
      })
      .select("id, player_name")
      .single();

    if (createErr || !created) {
      console.error("[arcade-submit] create driver:", createErr?.message);
      return json({ error: "Could not create driver profile." }, 500);
    }
    driverId = created.id;
    playerName = created.player_name;
  }

  const { data: prevScore } = await sb
    .from("arcade_scores")
    .select("score")
    .eq("driver_id", driverId!)
    .eq("game", game)
    .maybeSingle();

  let improved = true;
  if (prevScore && prevScore.score <= cleanMs) {
    improved = false;
  } else {
    const { error: scoreErr } = await sb.from("arcade_scores").upsert(
      {
        driver_id: driverId,
        game,
        score: cleanMs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "driver_id,game" },
    );
    if (scoreErr) {
      console.error("[arcade-submit] score:", scoreErr.message);
      return json({ error: "Could not save score." }, 500);
    }
  }

  // Keep signups list in sync for marketing (best-effort).
  await sb.from("signups").insert({ email: cleanEmail, consent: true });

  return json({
    ok: true,
    savedPermanently: true,
    improved,
    playerName,
    renamed: existingDriver ? cleanName !== existingDriver.player_name : false,
  });
});
