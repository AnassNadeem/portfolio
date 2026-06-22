/** Called by a Supabase Database Webhook on INSERT into public.signups.
 *  Posts a Discord embed so new signups appear in the notification feed. */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: { id: string; email: string; created_at: string } | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
  if (!webhookUrl) {
    console.warn("[signup-notify] DISCORD_WEBHOOK_URL not set — skipping");
    return json({ ok: true });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json() as WebhookPayload;
  } catch {
    return json({ error: "Invalid payload." }, 400);
  }

  // Only act on inserts into signups
  if (payload.type !== "INSERT" || payload.table !== "signups" || !payload.record) {
    return json({ ok: true });
  }

  const { email, created_at } = payload.record;

  // Mask email for privacy in Discord (show domain, hide local part)
  const [local, domain] = email.split("@");
  const maskedEmail = `${local.slice(0, 2)}***@${domain}`;

  const discordRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "🏎️ New Arcade Signup",
          color: 0xe10600,
          fields: [
            { name: "Email", value: maskedEmail, inline: true },
            { name: "Time", value: new Date(created_at).toUTCString(), inline: true },
          ],
          footer: { text: "apex-portfolio · signups table" },
        },
      ],
    }),
  });

  if (!discordRes.ok) {
    console.error("[signup-notify] discord:", await discordRes.text());
    return json({ error: "Discord notify failed." }, 502);
  }

  return json({ ok: true });
});
