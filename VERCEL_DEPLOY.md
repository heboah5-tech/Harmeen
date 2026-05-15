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

The `api/[...path].ts` function is bundled separately by Vercel from source,
importing `server/routes.ts` directly.

## Required environment variables (Vercel → Project → Settings → Environment Variables)

| Var                             | Why                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `NODE_ENV=production`           | Vercel sets this automatically                                                           |
| `SESSION_SECRET`                | Express session cookie signing                                                           |
| `ADMIN_BYPASS_TOKEN`            | `/admin-unlock?token=...` to bypass firewall (if firewall is re-enabled later)           |
| **`SUPABASE_URL`**              | **Required.** `https://<project-ref>.supabase.co`                                        |
| **`SUPABASE_SERVICE_ROLE_KEY`** | **Required.** Service-role key (bypasses RLS). Server-only, never exposed to client.     |
| **`SUPABASE_ANON_KEY`**         | **Required.** Anon key — used by `/api/fb/admin/login` to call Supabase Auth REST.       |
| `HHR_USE_MOCK=1`                | Default — returns mock schedule. Set `0` for live (only works on a host with Chromium).  |
| `CAPSOLVER_API_KEY`             | Only needed if you flip `HHR_USE_MOCK=0`                                                 |

> The legacy `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_DATABASE_URL`, `FIREBASE_WEB_API_KEY`
> variables are no longer needed by the running app. Keep them set on Vercel **only**
> until the one-time data migration script (`scripts/migrate-firestore-to-supabase.ts`)
> has been run; then they can be deleted.

## One-time setup checklist (Supabase)

1. **Apply the schema.** In Supabase → SQL Editor → New Query, paste the entire
   contents of `supabase/schema.sql` and Run. This creates `visitors`,
   `blocked_ips`, `blocked_bins`, `online_status`, `admins` and enables Realtime.
2. **Create the dashboard admin user.**
   - Supabase → Authentication → Users → "Add user" → email + password.
   - Copy the new user's UID, then in SQL Editor run:
     ```sql
     insert into public.admins (uid, email)
     values ('<paste-uid-here>', '<email>');
     ```
3. **(Optional) Migrate existing Firestore data.** From your local checkout
   (with `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_DATABASE_URL`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` all set):
   ```bash
   tsx scripts/migrate-firestore-to-supabase.ts
   ```
   The script is idempotent — safe to re-run.

## Important notes about Vercel limits

- **Puppeteer / Chromium does NOT work** on Vercel serverless (size/runtime limits).
  The site is configured for `HHR_USE_MOCK=1` by default.

- **Stateless functions**: `express-session` uses `MemoryStore`. Each cold start
  = new memory. Sessions won't persist across function instances. The dashboard
  uses sessions for admin auth — for production we recommend swapping in a
  Postgres-backed session store (e.g. `connect-pg-simple` against Supabase).

- **SSE / Realtime**: the `/api/fb/stream/*` routes hold open EventSource
  connections subscribed to Supabase Realtime. Vercel's serverless functions
  have a hard timeout (10–60s on Hobby, longer on Pro). The client lib already
  has a polling fallback (`pollVisitorOnce` every 2.5s), so updates still flow
  even when SSE is cut by a function timeout.

## Deploy

```bash
npm i -g vercel
vercel link
vercel --prod
```

Or push to a Git repo connected to Vercel and it auto-deploys.
