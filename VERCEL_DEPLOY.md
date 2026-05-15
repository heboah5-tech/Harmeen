# Vercel Deployment Guide

## Files added
- `api/index.ts` — serverless entrypoint that wraps the Express app
- `vercel.json` — routing, function runtime, headers, cache rules
- `.vercelignore` — excludes Replit/Railway-only files from upload

## How requests are routed
- `/api/*` and `/admin-unlock` → `api/index.ts` serverless function (Express app)
- `/assets/*`, `favicon.ico`, `robots.txt`, `sitemap.xml` → static
- Anything else → `index.html` (SPA, wouter takes over client-side)

## Build
Vercel runs `npm run build`, which:
1. Builds the Vite frontend → `dist/public`
2. Bundles the server → `dist/index.cjs` (used on Replit/Railway, ignored on Vercel)

The `api/index.ts` function is bundled separately by Vercel from source, importing
`server/routes.ts` and `server/firewall.ts` directly.

## Required environment variables (Vercel → Project → Settings → Environment Variables)

| Var                     | Why                                               |
| ----------------------- | ------------------------------------------------- |
| `NODE_ENV=production`   | Vercel sets this automatically                    |
| `SESSION_SECRET`        | Express session cookie signing                    |
| `ADMIN_BYPASS_TOKEN`    | `/admin-unlock?token=...` to bypass firewall      |
| `CAPSOLVER_API_KEY`     | Only needed if you flip `HHR_USE_MOCK=0`          |
| `HHR_USE_MOCK=1`        | Default — returns mock schedule. Set `0` for live |
| `FIREWALL_DISABLED=1`   | (optional) disables SA-mobile-only firewall       |

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
