import type { Request, Response, NextFunction } from "express";

const GEO_TTL_MS = 60 * 60 * 1000;
const GEO_NEG_TTL_MS = 5 * 60 * 1000;
const GEO_MAX = 5000;

type GeoEntry = { country: string; expires: number };
const geoCache = new Map<string, GeoEntry>();

const MOBILE_UA = /android.+mobile|iphone|ipod|blackberry|iemobile|opera mini|mobile safari|windows phone|webos|kindle|silk|fennec|maemo/i;
const TABLET_UA = /ipad|android(?!.*mobile)|tablet|playbook|silk(?!.*mobile)/i;

export function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  let ip = "";
  if (typeof fwd === "string") ip = fwd.split(",")[0]?.trim() || "";
  else if (Array.isArray(fwd) && fwd.length) ip = String(fwd[0]).split(",")[0]?.trim();
  if (!ip) ip = req.ip || "";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
}

export function isPrivateIp(ip: string): boolean {
  return (
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
    ip.startsWith("169.254.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd")
  );
}

export function isMobile(ua: string): boolean {
  if (!ua) return false;
  if (TABLET_UA.test(ua)) return false;
  return MOBILE_UA.test(ua);
}

async function lookupCountry(ip: string): Promise<string> {
  const now = Date.now();
  const hit = geoCache.get(ip);
  if (hit && hit.expires > now) return hit.country;

  let country = "";
  try {
    const r = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (r.ok) {
      const j: any = await r.json();
      if (j?.status === "success") country = String(j.countryCode || "").toUpperCase();
    }
  } catch {}

  if (geoCache.size > GEO_MAX) {
    const firstKey = geoCache.keys().next().value;
    if (firstKey) geoCache.delete(firstKey);
  }
  geoCache.set(ip, {
    country,
    expires: now + (country ? GEO_TTL_MS : GEO_NEG_TTL_MS),
  });
  return country;
}

function readCookie(req: Request, name: string): string {
  const raw = req.headers.cookie;
  if (!raw) return "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

const BLOCKED_HTML = `<!doctype html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>الخدمة غير متاحة | Service unavailable</title>
<style>
html,body{margin:0;padding:0;height:100%;background:#0b1220;color:#e5e7eb;font-family:-apple-system,Segoe UI,Tajawal,system-ui,sans-serif}
.wrap{min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px}
.card{max-width:520px;background:#111a2e;border:1px solid #1f2a44;border-radius:16px;padding:28px;text-align:center}
h1{margin:0 0 8px;font-size:22px;color:#fff}
p{margin:6px 0;line-height:1.6;color:#cbd5e1}
.en{margin-top:18px;direction:ltr;color:#94a3b8;font-size:14px}
</style></head><body><div class="wrap"><div class="card">
<h1>الخدمة متاحة داخل المملكة العربية السعودية فقط</h1>
<p>الرجاء فتح الموقع من جهاز جوال داخل المملكة.</p>
<div class="en"><strong>Service available inside Saudi Arabia only</strong><br>Please open this site from a mobile device inside KSA.</div>
</div></div></body></html>`;

export function buildFirewall(opts: {
  enabled: boolean;
  bypassToken?: string;
}) {
  return async function firewall(req: Request, res: Response, next: NextFunction) {
    if (!opts.enabled) return next();

    if (req.path === "/admin-unlock") {
      const token = String((req.query as any)?.token || "");
      if (opts.bypassToken && token && token === opts.bypassToken) {
        const oneYear = 60 * 60 * 24 * 365;
        res.setHeader(
          "Set-Cookie",
          `admin_bypass=${encodeURIComponent(token)}; Path=/; Max-Age=${oneYear}; HttpOnly; SameSite=Lax; Secure`,
        );
        return res.status(200).send(
          `<!doctype html><meta charset=utf-8><title>Unlocked</title><body style="font-family:system-ui;padding:40px;text-align:center"><h2>Admin bypass enabled.</h2><p><a href="/dashboard">Go to dashboard</a></p></body>`,
        );
      }
      return res.status(403).send("Invalid token");
    }

    if (opts.bypassToken) {
      const c = readCookie(req, "admin_bypass");
      if (c && c === opts.bypassToken) return next();
    }

    const ip = getClientIp(req);
    if (isPrivateIp(ip)) return next();

    const ua = String(req.headers["user-agent"] || "");
    if (!isMobile(ua)) {
      return sendBlocked(req, res, "device");
    }

    const country = await lookupCountry(ip);
    if (country !== "SA") {
      return sendBlocked(req, res, "geo");
    }

    return next();
  };
}

function sendBlocked(req: Request, res: Response, reason: string) {
  res.setHeader("X-Block-Reason", reason);
  res.setHeader("Cache-Control", "no-store");
  if (req.path.startsWith("/api/")) {
    return res.status(403).json({ success: false, error: "forbidden", reason });
  }
  return res.status(403).type("html").send(BLOCKED_HTML);
}
