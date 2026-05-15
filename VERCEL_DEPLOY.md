# Vercel Deployment Guide

## Files added
- `api/[...path].ts` — catch-all serverless function that wraps the Express app
  (Vercel routes any `/api/*` path here automatically, and the original URL
  is preserved on `req.url` so Express's router still matches.)
- `vercel.json` — static output dir, function runtime, headers, SPA fallback
- `.vercelignore` — excludes Replit/Railway-only files from upload

## How requests are routed
- `/api/*`  → `api/[...path].ts` serverless function (Express app)
- `/admin-unlock` → same function (rewritten to `/api/admin-unlock`)
- `/assets/*`, `favicon.ico`, `robots.txt`, `sitemap.xml` → static
- Anything else → `index.html` (SPA, wouter takes over client-side)

## Build
Vercel runs `npm run build`, which:
1. Builds the Vite frontend → `dist/public`
2. Bundles the server → `dist/index.cjs` (used on Replit/Railway, ignored on Vercel)

The `api/index.ts` function is bundled separately by Vercel from source, importing
`server/routes.ts` and `server/firewall.ts` directly.

## Required environment variables (Vercel → Project → Settings → Environment Variables)

| Var                          | Why                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `NODE_ENV=production`        | Vercel sets this automatically                                                                     |
| `SESSION_SECRET`             | Express session cookie signing                                                                     |
| `ADMIN_BYPASS_TOKEN`         | `/admin-unlock?token=...` to bypass firewall                                                       |
| `FIREBASE_SERVICE_ACCOUNT`   | **Required.** Full service-account JSON, single line. Without this the dashboard + visitor writes return 503/500. |
| `FIREBASE_DATABASE_URL`      | Realtime DB URL, e.g. `https://dryah-875c0-default-rtdb.firebaseio.com`. Optional — falls back to `<project>-default-rtdb.firebaseio.com`. |
| `FIREBASE_WEB_API_KEY`       | Web API key — needed for dashboard email/password sign-in                                          |
| `HHR_USE_MOCK=1`             | Default — returns mock schedule. Set `0` for live (only works on a host with Chromium)             |
| `CAPSOLVER_API_KEY`          | Only needed if you flip `HHR_USE_MOCK=0`                                                           |
| `FIREWALL_DISABLED=1`        | (optional) disables SA-mobile-only firewall                                                        |

### How to set `FIREBASE_SERVICE_ACCOUNT`
1. Firebase Console → ⚙ Project settings → Service accounts → "Generate new private key" → download JSON.
2. Vercel → Project → Settings → Environment Variables → New.
3. Name: `FIREBASE_SERVICE_ACCOUNT`. Value: paste the **entire JSON** as one line
   (Vercel preserves newlines fine; both forms work because the loader replaces `\n` in `private_key`).
4. Apply to **Production** + **Preview** + **Development**.

## Important notes about Vercel limits

- **Puppeteer / Chromium does NOT work** on Vercel serverless (size/runtime limits).
  The site is configured for `HHR_USE_MOCK=1` by default, so the schedule API
  returns realistic mock data without invoking the scraper. Do not set
  `HHR_USE_MOCK=0` on Vercel — it will crash the function.

- **Stateless functions**: `express-session` uses `MemoryStore`. Each cold
  start = new memory. Sessions won't persist across function instances. The
  current app only uses sessions for the dashboard auth, which already runs
  through Firebase Auth, so this is fine.

- **No HTTP server / no `prewarmHhr`**: the serverless wrapper doesn't call
  `httpServer.listen` or `prewarmHhr` (puppeteer-based). Both are skipped.

## Deploy

```bash
# one-time
npm i -g vercel
vercel link            # link to your Vercel project

# deploy
vercel                 # preview
vercel --prod          # production
```

Or push to a Git repo connected to Vercel and it auto-deploys.

## Local sanity check

Vercel emulation:
```bash
vercel dev
```
This serves on `http://localhost:3000` and routes `/api/*` to the function.

## After deploy

1. Open `https://<your-project>.vercel.app/` — should show the bio-links page.
2. Open `https://<your-project>.vercel.app/privacy` — privacy page.
3. From a desktop, opening `https://<your-project>.vercel.app/book` should
   show the "الخدمة غير متاحة" 403 page (firewall working).
4. To unlock the dashboard from your machine:
   `https://<your-project>.vercel.app/admin-unlock?token=<ADMIN_BYPASS_TOKEN>`
