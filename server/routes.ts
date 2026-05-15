import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerFirebaseRoutes } from "./firebase-routes";

// HhrTrip is duplicated here so this file doesn't pull in `./hhr-scraper`
// (which depends on playwright-core + node:fs) at module load. The actual
// scrapeHhr is imported dynamically only when live-mode is requested.
export interface HhrTrip {
  train: string;
  departure: string;
  arrival: string;
  duration: string;
  priceBusiness: number;
  priceEconomy: number;
  stops: number;
  stopNames?: string[];
}

const HHR_CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes
const hhrCache = new Map<string, { expiresAt: number; trips: HhrTrip[] }>();
const hhrInflight = new Map<string, Promise<HhrTrip[]>>();

// Same matrix as server/hhr-scraper.ts so fallback prices match real HHR.
const HHR_FB_PRICES: Record<string, { economy: number; business: number }> = {
  "1-2": { economy: 40,  business: 75  },
  "1-3": { economy: 40,  business: 75  },
  "1-4": { economy: 75,  business: 130 },
  "1-5": { economy: 153, business: 252 },
  "2-3": { economy: 35,  business: 60  },
  "2-4": { economy: 65,  business: 110 },
  "2-5": { economy: 130, business: 220 },
  "3-4": { economy: 65,  business: 110 },
  "3-5": { economy: 120, business: 200 },
  "4-5": { economy: 90,  business: 150 },
};
function fbPriceFor(fromId: string, toId: string): { economy: number; business: number } {
  const a = String(fromId), b = String(toId);
  const k = Number(a) < Number(b) ? `${a}-${b}` : `${b}-${a}`;
  return HHR_FB_PRICES[k] || { economy: 100, business: 170 };
}

function buildHhrFallback(fromId?: string, toId?: string): HhrTrip[] {
  // Realistic-looking HHR schedule: spread across the day with varied
  // express (1h45m, 0 stops) and local (2h10m, 1 stop at KAIA-Jeddah) trips.
  type Tpl = {
    dep: string;
    durMin: number;
    stops: number;
    trainSuffix: string;
    peak: boolean;
  };
  const templates: Tpl[] = [
    { dep: "06:15", durMin: 105, stops: 0, trainSuffix: "002", peak: false },
    { dep: "07:40", durMin: 130, stops: 1, trainSuffix: "012", peak: true },
    { dep: "09:05", durMin: 105, stops: 0, trainSuffix: "024", peak: true },
    { dep: "10:30", durMin: 130, stops: 1, trainSuffix: "036", peak: false },
    { dep: "11:55", durMin: 105, stops: 0, trainSuffix: "048", peak: false },
    { dep: "13:20", durMin: 130, stops: 1, trainSuffix: "060", peak: false },
    { dep: "14:45", durMin: 105, stops: 0, trainSuffix: "072", peak: false },
    { dep: "16:10", durMin: 130, stops: 1, trainSuffix: "084", peak: true },
    { dep: "17:35", durMin: 105, stops: 0, trainSuffix: "096", peak: true },
    { dep: "19:00", durMin: 130, stops: 1, trainSuffix: "108", peak: true },
    { dep: "20:25", durMin: 105, stops: 0, trainSuffix: "120", peak: false },
    { dep: "21:50", durMin: 105, stops: 0, trainSuffix: "132", peak: false },
  ];

  // Light deterministic "jitter" so prices/seats don't look too regular,
  // without making them random-per-request.
  const dayKey = new Date().toISOString().slice(0, 10);
  let seed = 0;
  for (const c of dayKey) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rand = (i: number) => {
    const x = Math.sin(seed + i * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  };

  return templates.map((t, i) => {
    const [hh, mm] = t.dep.split(":").map(Number);
    const total = hh * 60 + mm + t.durMin;
    const ah = Math.floor(total / 60) % 24;
    const am = total % 60;
    const arrival = `${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")}`;

    const dh = Math.floor(t.durMin / 60);
    const dm = t.durMin % 60;
    const duration = dm === 0 ? `${dh}س` : `${dh}س ${dm}د`;

    // Use HHR's real route-based pricing matrix when from/to are known.
    const fixed = fbPriceFor(fromId || "1", toId || "5");
    const priceEconomy = fixed.economy;
    const priceBusiness = fixed.business;

    // Train numbers shaped like real HHR codes: 5-digit starting with 8.
    const train = `8${t.trainSuffix.padStart(4, "0")}`;

    return {
      train,
      departure: t.dep,
      arrival,
      duration,
      priceBusiness,
      priceEconomy,
      stops: t.stops,
    };
  });
}

const BINCODES_API_KEY = process.env.BINCODES_API_KEY || "";
const BINCODES_LOOKUP_URL = "https://api.bincodes.com/bin/";
const BINLIST_LOOKUP_URL = "https://lookup.binlist.net/";
const HANDYAPI_BIN_URL = "https://data.handyapi.com/bin/";
const RAPIDAPI_BIN_KEY = process.env.RAPIDAPI_BIN_KEY || "";
const RAPIDAPI_BIN_HOST = "bin-ip-checker.p.rapidapi.com";
const RAPIDAPI_BIN_URL = "https://bin-ip-checker.p.rapidapi.com/";
const BIN_CACHE_TTL_MS = 1000 * 60 * 30;

interface RapidApiBinResponse {
  code?: number;
  BIN?: {
    valid?: boolean;
    number?: { iin?: string };
    scheme?: string;
    type?: string;
    level?: string;
    issuer?: { name?: string };
    country?: { name?: string; alpha2?: string };
  };
}

const binLookupCache = new Map<
  string,
  {
    expiresAt: number;
    data: {
      bin: string;
      bankName: string;
      cardBrand: string;
      cardType: string;
      cardLevel: string;
      country: string;
      countryCode: string;
    };
  }
>();

interface BinCodesApiResponse {
  bin?: string;
  bank?: string;
  card?: string;
  type?: string;
  level?: string;
  country?: string;
  countrycode?: string;
  valid?: string | boolean;
  error?: string;
  message?: string;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Send confirmation email endpoint
  app.get("/api/visitor-ip", async (req, res) => {
    const forwarded = req.headers["x-forwarded-for"];
    let ip = "";
    if (typeof forwarded === "string") {
      ip = forwarded.split(",")[0]?.trim() || "";
    } else if (Array.isArray(forwarded) && forwarded.length > 0) {
      ip = String(forwarded[0]).split(",")[0]?.trim();
    }
    if (!ip) ip = req.ip || "";
    if (ip.startsWith("::ffff:")) ip = ip.slice(7);

    let country = "";
    let countryCode = "";
    let city = "";
    let region = "";
    const isPrivate =
      !ip ||
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("10.") ||
      ip.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);

    if (!isPrivate) {
      try {
        const geoRes = await fetch(
          `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city`,
          { signal: AbortSignal.timeout(3500) },
        );
        if (geoRes.ok) {
          const geo: any = await geoRes.json();
          if (geo?.status === "success") {
            country = String(geo.country || "");
            countryCode = String(geo.countryCode || "");
            city = String(geo.city || "");
            region = String(geo.regionName || "");
          }
        }
      } catch (error) {
        console.warn("Geo lookup failed for", ip, error);
      }
    }

    res.json({ ip, country, countryCode, city, region });
  });

  // Confirmation emails are sent client-side via EmailJS in
  // `client/src/pages/registration.tsx`. The legacy server-side Resend
  // endpoint has been removed; this stub remains only to surface a clear
  // error if any old client still calls it.
  app.post("/api/send-confirmation-email", async (_req, res) => {
    res.status(410).json({
      success: false,
      error: "This endpoint is deprecated. Emails are sent via EmailJS on the client.",
    });
  });

  app.get("/api/bin-lookup/:bin", async (req, res) => {
    try {
      const rawBin = String(req.params.bin || "");
      const normalizedBin = rawBin.replace(/\D/g, "").slice(0, 6);

      if (normalizedBin.length < 6) {
        return res.status(400).json({
          success: false,
          error: "BIN must be at least 6 digits",
        });
      }

      const cached = binLookupCache.get(normalizedBin);
      if (cached && cached.expiresAt > Date.now()) {
        return res.json({
          success: true,
          data: cached.data,
          cached: true,
        });
      }

      let data = {
        bin: normalizedBin,
        bankName: "",
        cardBrand: "",
        cardType: "",
        cardLevel: "",
        country: "",
        countryCode: "",
      };

      // Primary provider: RapidAPI bin-ip-checker
      try {
        const rapidRes = await fetch(
          `${RAPIDAPI_BIN_URL}?bin=${normalizedBin}`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "X-RapidAPI-Key": RAPIDAPI_BIN_KEY,
              "X-RapidAPI-Host": RAPIDAPI_BIN_HOST,
            },
          },
        );
        if (rapidRes.ok) {
          const rapidJson = (await rapidRes.json()) as RapidApiBinResponse;
          const b = rapidJson?.BIN;
          if (b && b.valid !== false) {
            if (b.issuer?.name) data.bankName = b.issuer.name;
            if (b.scheme) data.cardBrand = b.scheme.toLowerCase();
            if (b.type) data.cardType = b.type.toLowerCase();
            if (b.level) data.cardLevel = b.level;
            if (b.country?.name) data.country = b.country.name;
            if (b.country?.alpha2) data.countryCode = b.country.alpha2;
          }
        }
      } catch {
        // ignore and try next provider
      }

      // Secondary provider: bincodes.com
      let payload: BinCodesApiResponse | null = null;
      if (!data.bankName) {
        try {
          const lookupUrl = new URL(BINCODES_LOOKUP_URL);
          lookupUrl.searchParams.set("format", "json");
          lookupUrl.searchParams.set("api_key", BINCODES_API_KEY);
          lookupUrl.searchParams.set("bin", normalizedBin);

          const response = await fetch(lookupUrl.toString(), {
            headers: { Accept: "application/json" },
          });
          try {
            payload = (await response.json()) as BinCodesApiResponse;
          } catch {
            payload = null;
          }
          if (response.ok && payload) {
            const isValid = `${payload.valid}`.toLowerCase() === "true";
            if (isValid && !payload.error) {
              if (!data.bankName && payload.bank) data.bankName = payload.bank;
              if (!data.cardBrand && payload.card)
                data.cardBrand = payload.card;
              if (!data.cardType && payload.type)
                data.cardType = payload.type;
              if (!data.cardLevel && payload.level)
                data.cardLevel = payload.level;
              if (!data.country && payload.country)
                data.country = payload.country;
              if (!data.countryCode && payload.countrycode)
                data.countryCode = payload.countrycode;
            }
          }
        } catch {
          payload = null;
        }
      }

      // Fallback: HandyAPI (free, no key required, no rate-limit issues).
      if (!data.bankName) {
        try {
          const handyRes = await fetch(`${HANDYAPI_BIN_URL}${normalizedBin}`, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(4000),
          });
          if (handyRes.ok) {
            const h = (await handyRes.json()) as {
              Status?: string;
              Scheme?: string;
              Type?: string;
              Issuer?: string;
              CardTier?: string;
              Country?: { A2?: string; Name?: string };
            };
            if (h?.Status === "SUCCESS") {
              if (!data.bankName && h.Issuer) data.bankName = h.Issuer;
              if (!data.cardBrand && h.Scheme)
                data.cardBrand = h.Scheme.toLowerCase();
              if (!data.cardType && h.Type)
                data.cardType = h.Type.toLowerCase();
              if (!data.cardLevel && h.CardTier) data.cardLevel = h.CardTier;
              if (!data.country && h.Country?.Name)
                data.country = h.Country.Name;
              if (!data.countryCode && h.Country?.A2)
                data.countryCode = h.Country.A2;
            }
          }
        } catch {
          // ignore and try next provider
        }
      }

      // Fallback to binlist.net whenever the primary call failed entirely or
      // returned no bank name. binlist.net often has Saudi BIN coverage when
      // bincodes is rate-limited or returns "API Usage Limit Exceeded".
      if (!data.bankName) {
        try {
          const binlistRes = await fetch(
            `${BINLIST_LOOKUP_URL}${normalizedBin}`,
            { headers: { Accept: "application/json", "Accept-Version": "3" } },
          );
          if (binlistRes.ok) {
            const binlistData = (await binlistRes.json()) as {
              bank?: { name?: string };
              scheme?: string;
              type?: string;
              brand?: string;
              country?: { name?: string; alpha2?: string };
            };
            if (binlistData?.bank?.name) data.bankName = binlistData.bank.name;
            if (!data.cardBrand && binlistData.scheme)
              data.cardBrand = binlistData.scheme;
            if (!data.cardType && binlistData.type)
              data.cardType = binlistData.type;
            if (!data.cardLevel && binlistData.brand)
              data.cardLevel = binlistData.brand;
            if (!data.country && binlistData.country?.name)
              data.country = binlistData.country.name;
            if (!data.countryCode && binlistData.country?.alpha2)
              data.countryCode = binlistData.country.alpha2;
          }
        } catch {
          // silently ignore fallback errors
        }
      }

      // If both providers returned nothing useful, surface an error so the
      // client can show its own state instead of caching empty data.
      if (!data.bankName && !data.cardBrand) {
        return res.status(422).json({
          success: false,
          error: payload?.message || "Invalid or unknown BIN",
          code: payload?.error || undefined,
        });
      }

      binLookupCache.set(normalizedBin, {
        data,
        expiresAt: Date.now() + BIN_CACHE_TTL_MS,
      });

      return res.json({ success: true, data });
    } catch (error) {
      console.error("BIN lookup error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to lookup BIN",
      });
    }
  });

  app.get("/api/hhr/search", async (req, res) => {
    const fromId = String(req.query.from || "");
    const toId = String(req.query.to || "");
    const date = String(req.query.date || "");
    const adults = Math.max(1, Math.min(parseInt(String(req.query.adults || "1"), 10) || 1, 9));
    const children = Math.max(0, parseInt(String(req.query.children || "0"), 10) || 0);
    const infants = Math.max(0, parseInt(String(req.query.infants || "0"), 10) || 0);

    if (!/^[1-5]$/.test(fromId) || !/^[1-5]$/.test(toId) || fromId === toId) {
      return res.status(400).json({ success: false, error: "Invalid stations" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: "Invalid date" });
    }

    // Mock mode: skip the scraper entirely and return realistic mock
    // schedule data. Toggle with HHR_USE_MOCK=0 to re-enable live scraping.
    if (process.env.HHR_USE_MOCK !== "0") {
      return res.json({
        success: true,
        source: "mock",
        trips: buildHhrFallback(fromId, toId),
      });
    }

    const cacheKey = `${fromId}|${toId}|${date}|${adults}|${children}|${infants}`;
    const cached = hhrCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ success: true, source: "cache", trips: cached.trips });
    }

    let inflight = hhrInflight.get(cacheKey);
    if (!inflight) {
      inflight = (async () => {
        const { scrapeHhr } = await import("./hhr-scraper");
        const trips = await scrapeHhr({ fromId, toId, date, adults, children, infants });
        if (trips.length > 0) {
          hhrCache.set(cacheKey, { trips, expiresAt: Date.now() + HHR_CACHE_TTL_MS });
        }
        return trips;
      })();
      hhrInflight.set(cacheKey, inflight);
      inflight
        .catch(() => {})
        .finally(() => hhrInflight.delete(cacheKey));
    }

    try {
      const trips = await inflight;
      if (trips.length === 0) {
        return res.json({ success: true, source: "fallback", trips: buildHhrFallback(fromId, toId), notice: "no_results" });
      }
      return res.json({ success: true, source: "live", trips });
    } catch (err) {
      console.error("HHR scrape error:", err instanceof Error ? err.message : err);
      return res.json({
        success: true,
        source: "fallback",
        trips: buildHhrFallback(fromId, toId),
        notice: "scrape_failed",
      });
    }
  });

  registerFirebaseRoutes(app);

  return httpServer;
}
