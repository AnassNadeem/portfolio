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
   | `VITE_TURNSTILE_SITE_KEY` | `0x4AAAAAADpP4owrV21wf-q5` (apex-portfolio widget) |
   | `VITE_SITE_URL` | `https://anasnadeem.dev` |

5. **Save and Deploy**
6. Turnstile → add hostname `anasnadeem.dev` (and `www.anasnadeem.dev` if you use www)

### Turnstile (contact form + arcade) — required

The bot check shows **"Unable to connect to website"** until your live hostname is allowed:

1. Cloudflare dashboard → **Turnstile** → your widget → **Settings**
2. Under **Hostname management**, add:
   - `anasnadeem.dev`
   - `www.anasnadeem.dev` (if used)
   - your `*.pages.dev` preview host (optional)
3. Save — no redeploy needed; refresh the page

If the widget still fails, confirm `VITE_TURNSTILE_SITE_KEY` in Cloudflare Pages env matches the **Site Key** (not the secret).

## Supabase backend (run locally once)

```bash
supabase link --project-ref <your-ref>
supabase db push
supabase functions deploy contact-submit
supabase functions deploy arcade-submit
supabase secrets set \
  TURNSTILE_SECRET=<secret> \
  RESEND_API_KEY=<key> \
  NOTIFICATION_EMAIL=<your@email.com>
```

Server secrets go in **Supabase only** — never in Cloudflare env vars.

## Custom domain — anasnadeem.dev

1. Cloudflare Pages → your project → **Custom domains** → **Set up a custom domain**
2. Enter `anasnadeem.dev` (and optionally `www.anasnadeem.dev`)
3. If the domain is on Cloudflare Registrar / same account, DNS is auto-configured
4. If the domain is elsewhere, add the CNAME/A records Cloudflare shows
5. Wait until status is **Active**
6. Set Pages env `VITE_SITE_URL=https://anasnadeem.dev` → **Redeploy**
7. Add `anasnadeem.dev` to Turnstile hostnames

## Google Search Console

1. [search.google.com/search-console](https://search.google.com/search-console) → Add property → URL prefix → `https://anasnadeem.dev`
2. Verify (HTML tag or DNS TXT)
3. Sitemaps → submit `https://anasnadeem.dev/sitemap.xml`
4. URL Inspection → homepage → Request indexing
