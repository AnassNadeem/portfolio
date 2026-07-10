# Deploy to Cloudflare Pages

## One-time setup (dashboard)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select repo: `AnassNadeem/portfolio`
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (default)
4. Environment variables (**Production** + **Preview**):

   | Name | Value |
   |------|-------|
   | `NODE_VERSION` | `24` |
   | `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
   | `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile → Site Key |
   | `VITE_SITE_URL` | Your `*.pages.dev` URL after first deploy |

5. **Save and Deploy** → copy the `https://<project>.pages.dev` URL
6. Set `VITE_SITE_URL` to that URL and **redeploy**
7. Turnstile → add hostname `<project>.pages.dev` (or `*.pages.dev`)

### Turnstile (contact form + arcade) — required

The bot check shows **"Unable to connect to website"** until your live hostname is allowed:

1. Cloudflare dashboard → **Turnstile** → your widget → **Settings**
2. Under **Hostname management**, add your exact live URL host, e.g.:
   - `portfolio.anass-nadeem42.workers.dev`
   - (later) `yourdomain.com`
3. Save — no redeploy needed; refresh the page

If the widget still fails, confirm `VITE_TURNSTILE_SITE_KEY` in Cloudflare Pages env matches the **Site Key** (not the secret).

## Supabase backend (run locally once)

```bash
supabase link --project-ref <your-ref>
supabase db push
supabase functions deploy contact-submit
supabase functions deploy arcade-submit
supabase secrets set \
  TURNSTILE_SECRET_KEY=<secret> \
  RESEND_API_KEY=<key> \
  NOTIFICATION_EMAIL=<your@email.com>
```

Server secrets go in **Supabase only** — never in Cloudflare env vars.

## Custom domain (later)

Pages → your project → **Custom domains** → add domain bought on Cloudflare Registrar.
Update `VITE_SITE_URL` and Turnstile hostnames, then redeploy.

## Free test URL

No domain purchase needed. Cloudflare gives `https://<project-name>.pages.dev` automatically.
