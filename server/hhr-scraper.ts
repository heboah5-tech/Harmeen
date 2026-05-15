import { chromium, type Browser, type Page } from "playwright-core";
import fs from "node:fs";

const HHR_HOME = "https://sar.hhr.sa/ar/web/booking/home";
const CAPSOLVER_API = "https://api.capsolver.com";
const CAPSOLVER_KEY = process.env.CAPSOLVER_API_KEY || "";
const RECAPTCHA_SITEKEY = "6LeUqS8sAAAAAJZ6Jv0NW2z1vPUrBmCgYvXEXiRS";

const FORM_PREFIX = "_ossportlet_WAR_ossliferay_:formSearchTravel:";

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

export interface HhrSearchInput {
  fromId: string;
  toId: string;
  date: string;
  adults: number;
  children?: number;
  infants?: number;
}

let cachedBrowser: Browser | null = null;
async function getBrowser(): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.isConnected()) return cachedBrowser;
  const candidates = [
    process.env.CHROMIUM_PATH,
    "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean) as string[];
  let executablePath = "";
  for (const p of candidates) {
    if (fs.existsSync(p)) { executablePath = p; break; }
  }
  if (!executablePath) {
    try {
      const out = (await import("node:child_process")).execSync("which chromium 2>/dev/null || true").toString().trim();
      if (out && fs.existsSync(out)) executablePath = out;
    } catch {}
  }
  if (!executablePath) throw new Error("Chromium binary not found");
  cachedBrowser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--ignore-certificate-errors",
    ],
  });
  cachedBrowser.on("disconnected", () => {
    cachedBrowser = null;
  });
  return cachedBrowser;
}

let scrapeChain: Promise<unknown> = Promise.resolve();
function serializeScrape<T>(fn: () => Promise<T>): Promise<T> {
  const next = scrapeChain.then(fn, fn);
  scrapeChain = next.catch(() => undefined);
  return next;
}

async function solveRecaptchaFresh(sitekey: string, pageUrl: string): Promise<string> {
  if (!CAPSOLVER_KEY) throw new Error("CAPSOLVER_API_KEY not set");
  const createResp = await fetch(`${CAPSOLVER_API}/createTask`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientKey: CAPSOLVER_KEY,
      task: { type: "ReCaptchaV2TaskProxyLess", websiteURL: pageUrl, websiteKey: sitekey },
    }),
  });
  const created = (await createResp.json()) as {
    errorId?: number; errorDescription?: string; taskId?: string;
  };
  if (created.errorId || !created.taskId) {
    throw new Error(`CapSolver createTask failed: ${created.errorDescription || "unknown"}`);
  }
  const taskId = created.taskId;
  const deadline = Date.now() + 120_000;
  await new Promise((r) => setTimeout(r, 4000));
  while (Date.now() < deadline) {
    const resR = await fetch(`${CAPSOLVER_API}/getTaskResult`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientKey: CAPSOLVER_KEY, taskId }),
    });
    const r = (await resR.json()) as {
      status?: string; errorId?: number; errorDescription?: string;
      solution?: { gRecaptchaResponse?: string };
    };
    if (r.errorId) throw new Error(`CapSolver error: ${r.errorDescription}`);
    if (r.status === "ready" && r.solution?.gRecaptchaResponse) {
      return r.solution.gRecaptchaResponse;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("CapSolver timed out");
}

// reCAPTCHA v2 tokens are valid ~120s. Cache + pre-warm so most scrapes
// skip the 10-30s CapSolver wait entirely.
const TOKEN_TTL_MS = 100_000;
let cachedToken: { token: string; expires: number } | null = null;
let inflightToken: Promise<string> | null = null;

function startTokenSolve(): Promise<string> {
  if (inflightToken) return inflightToken;
  inflightToken = solveRecaptchaFresh(RECAPTCHA_SITEKEY, HHR_HOME)
    .then((tok) => {
      cachedToken = { token: tok, expires: Date.now() + TOKEN_TTL_MS };
      return tok;
    })
    .finally(() => { inflightToken = null; });
  inflightToken.catch((e) =>
    console.log("HHR token solve failed:", e instanceof Error ? e.message : e),
  );
  return inflightToken;
}

function getRecaptchaToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 5_000) {
    const t = cachedToken.token;
    cachedToken = null; // single-use
    if (!inflightToken) startTokenSolve(); // refill in background
    return Promise.resolve(t);
  }
  return startTokenSolve();
}

// Warm page pool: keep one Page sitting on HHR home with the form rendered
// so scrapes don't pay the ~14s page-init cost.
interface WarmPage {
  ctx: import("playwright-core").BrowserContext;
  page: Page;
  createdAt: number;
}
const WARM_PAGE_MAX_AGE_MS = 4 * 60 * 1000; // refresh every 4 min
let warmPage: WarmPage | null = null;
let warmPageInflight: Promise<WarmPage> | null = null;

async function buildWarmPage(): Promise<WarmPage> {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    locale: "ar-SA",
    viewport: { width: 1366, height: 800 },
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  });
  try {
    await ctx.route("**/*", (route) => {
      const t = route.request().resourceType();
      if (t === "image" || t === "font" || t === "media") return route.abort();
      const u = route.request().url();
      if (/google-analytics|googletagmanager|doubleclick|hotjar|facebook|gstatic\.com\/ea\//.test(u)) {
        return route.abort();
      }
      return route.continue();
    });
    await ctx.addInitScript(() => {
      if (typeof (globalThis as any).__name !== "function") {
        (globalThis as any).__name = (fn: any) => fn;
      }
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(45_000);
    await page.goto(HHR_HOME, { waitUntil: "commit", timeout: 60_000 });
    await page.waitForSelector(`select[id="${FORM_PREFIX}comboStationFrom"]`, { timeout: 45_000 });
    await page.waitForFunction(
      (s) => {
        const el = document.querySelector(s) as HTMLSelectElement | null;
        return !!el && !el.disabled && el.options.length > 1;
      },
      `select[id="${FORM_PREFIX}comboStationFrom"]`,
      { timeout: 30_000 },
    );
    return { ctx, page, createdAt: Date.now() };
  } catch (e) {
    await ctx.close().catch(() => {});
    throw e;
  }
}

function startWarmPageBuild(): Promise<WarmPage> {
  if (warmPageInflight) return warmPageInflight;
  warmPageInflight = buildWarmPage()
    .then((wp) => {
      warmPage = wp;
      return wp;
    })
    .catch((e) => {
      console.log("HHR warm-page build failed:", e instanceof Error ? e.message : e);
      throw e;
    })
    .finally(() => { warmPageInflight = null; });
  warmPageInflight.catch(() => {});
  return warmPageInflight;
}

async function consumeWarmPage(): Promise<WarmPage> {
  if (warmPage && Date.now() - warmPage.createdAt < WARM_PAGE_MAX_AGE_MS) {
    const wp = warmPage;
    warmPage = null;
    return wp;
  }
  // Stale warm page — close it
  if (warmPage) {
    const stale = warmPage;
    warmPage = null;
    stale.ctx.close().catch(() => {});
  }
  // Build (or join in-flight build), then take ownership: clear the global
  // pool slot so a subsequent consumer doesn't try to use the same page.
  const wp = await startWarmPageBuild();
  if (warmPage === wp) warmPage = null;
  return wp;
}

export function prewarmHhr(): void {
  if (!cachedToken && !inflightToken) startTokenSolve();
  if (!warmPage && !warmPageInflight) startWarmPageBuild();
}

function isoToHhrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function parseDuration(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const h = cleaned.match(/(\d+)\s*(?:س|ساعة|ساعات|h)/);
  const mn = cleaned.match(/(\d+)\s*(?:د|دقيقة|دقائق|m|min)/);
  if (h || mn) return `${h ? h[1] : "0"}س ${mn ? mn[1] : "0"}د`;
  return cleaned;
}

async function selectNative(page: Page, fieldId: string, value: string): Promise<void> {
  const sel = `select[id="${FORM_PREFIX}${fieldId}"]`;
  await page.waitForSelector(sel, { timeout: 30000 });
  // Wait until it's not disabled
  await page.waitForFunction(
    (s) => {
      const el = document.querySelector(s) as HTMLSelectElement | null;
      return !!el && !el.disabled;
    },
    sel,
    { timeout: 20000 },
  );
  await page.selectOption(sel, value);
  // Mojarra.ab fires automatically via inline onchange; brief wait for AJAX
  await page.waitForTimeout(350);
}

// HHR fixed price matrix (SAR, adult one-way) by station-pair: economy / business.
// Station IDs: 1=Makkah, 2=Sulaymaniyah Jeddah, 3=Jeddah Airport, 4=KAEC, 5=Madinah.
const HHR_PRICES: Record<string, { economy: number; business: number }> = {
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
function priceFor(fromId: string, toId: string): { economy: number; business: number } {
  const a = String(fromId), b = String(toId);
  const k = Number(a) < Number(b) ? `${a}-${b}` : `${b}-${a}`;
  return HHR_PRICES[k] || { economy: 0, business: 0 };
}

async function extractTrips(page: Page, fromId: string, toId: string): Promise<HhrTrip[]> {
  const raw = await page.evaluate(() => {
    const norm = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").trim();
    const rows = Array.from(document.querySelectorAll("tr[data-rk], tr[data-ri], tbody.ui-datatable-data > tr"));
    const out: any[] = [];
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td")).map((c) => norm((c as HTMLElement).innerText || c.textContent));
      const txt = norm((row as HTMLElement).innerText || row.textContent || "");
      const times = (txt.match(/\b\d{1,2}:\d{2}\b/g) || []).slice(0, 2);
      if (times.length < 2) continue;
      const trainCodeEl = row.querySelector(".train-code");
      const trainCode = trainCodeEl ? norm(trainCodeEl.textContent) : "";
      // Duration column is typically the 4th td (toggle, depart, arrive, duration, train#)
      let duration = "";
      for (const c of cells) {
        if (/\d+\s*(?:س|ساعة|ساعات|h)/i.test(c) && !/:/.test(c)) { duration = c; break; }
      }
      if (!duration) {
        const m =
          txt.match(/(\d+\s*(?:س|ساعة|ساعات)\s*\d+\s*(?:د|دقيقة|دقائق))/) ||
          txt.match(/(\d+\s*(?:س|ساعة|ساعات))/);
        duration = m ? m[1] : "";
      }
      // Stops label format: "1 توقف" / "2 توقف" — number BEFORE word.
      const stopsLabelEl = row.querySelector('[id$=":stops"] label, .ico-train-stop label');
      const stopsTxt = stopsLabelEl ? norm(stopsLabelEl.textContent) : "";
      let stops = 0;
      const sm = stopsTxt.match(/(\d+)\s*توقف/) || txt.match(/(\d+)\s*توقف/);
      if (sm) stops = parseInt(sm[1], 10);
      else if (/مباشر|بدون\s*توقف/.test(txt)) stops = 0;
      // Stop names from the popup ul/li (e.g., "السليمانية - جدة 4 د")
      const stopItems = Array.from(row.querySelectorAll('[id$=":stopsLabel"] li, .train-stop-pane li'))
        .map((li) => norm((li as HTMLElement).textContent).replace(/\s*\d+\s*د\s*$/, ""))
        .filter(Boolean);
      const rk = row.getAttribute("data-rk") || row.getAttribute("data-ri") || "";
      // data-rk is "{adults}_{fromId}_{trainCode}"; train code is the last segment.
      const trainFromRk = rk.split("_").pop() || "";
      out.push({
        train: trainCode || trainFromRk,
        departure: times[0],
        arrival: times[1],
        duration,
        stops,
        stopNames: stopItems,
      });
    }
    return out;
  });
  const trips: HhrTrip[] = [];
  const fixed = priceFor(fromId, toId);
  for (const r of raw) {
    if (!r.departure || !r.arrival) continue;
    const dur = parseDuration(r.duration);
    trips.push({
      train: r.train || "",
      departure: r.departure,
      arrival: r.arrival,
      duration: dur,
      priceBusiness: fixed.business,
      priceEconomy: fixed.economy,
      stops: r.stops,
      stopNames: r.stopNames || [],
    });
  }
  const seen = new Set<string>();
  return trips.filter((t) => {
    const k = `${t.departure}|${t.train}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function scrapeHhr(input: HhrSearchInput): Promise<HhrTrip[]> {
  return serializeScrape(() => scrapeHhrInner(input));
}

async function scrapeHhrInner(input: HhrSearchInput): Promise<HhrTrip[]> {
  const t0 = Date.now();
  const lap = (label: string) => console.log(`HHR ${label} +${Date.now() - t0}ms`);
  // Use cached/in-flight token if available; otherwise start a fresh solve.
  const solveTokenP = getRecaptchaToken();
  solveTokenP.catch(() => {});
  // Grab a pre-warmed page (form already rendered) — saves ~14s. If the warm
  // build fails, fall back to a cold build so this request still succeeds.
  let wp: WarmPage;
  try {
    wp = await consumeWarmPage();
    lap("warm-page");
  } catch (e) {
    console.log("HHR warm-page unavailable, cold build:", e instanceof Error ? e.message : e);
    wp = await buildWarmPage();
    lap("cold-page");
  }
  const { ctx, page } = wp;
  // Kick off the next warm page in background so the next scrape is fast.
  startWarmPageBuild();
  try {
    await selectNative(page, "comboStationFrom", input.fromId);
    await selectNative(page, "comboStationTo", input.toId);
    lap("from+to");

    const dateStr = isoToHhrDate(input.date);
    await page.evaluate(
      ({ id, d }) => {
        const inp = document.getElementById(id) as HTMLInputElement | null;
        if (inp) {
          inp.removeAttribute("readonly");
          inp.value = d;
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          inp.dispatchEvent(new Event("change", { bubbles: true }));
          inp.dispatchEvent(new Event("blur", { bubbles: true }));
        }
      },
      { id: `${FORM_PREFIX}calendar`, d: dateStr },
    );
    await page.waitForTimeout(250);

    if (input.adults && input.adults !== 1) {
      await selectNative(page, "adults", String(Math.max(1, Math.min(input.adults, 9))));
    }
    if (input.children && input.children > 0) {
      await selectNative(page, "children", String(Math.min(input.children, 9)));
    }
    if (input.infants && input.infants > 0) {
      await selectNative(page, "infants", String(Math.min(input.infants, 9)));
    }

    lap("form-filled");
    // Wait for CapSolver token, inject into g-recaptcha-response, then submit.
    const token = await solveTokenP;
    lap("token");
    await page.evaluate((tok) => {
      document.querySelectorAll('textarea[id^="g-recaptcha-response"]').forEach((el) => {
        const t = el as HTMLTextAreaElement;
        t.style.display = "block";
        t.value = tok;
      });
      const ta = document.getElementById("g-recaptcha-response") as HTMLTextAreaElement | null;
      if (ta) {
        ta.style.display = "block";
        ta.value = tok;
      }
      // Walk grecaptcha config for callback (in case site relies on it)
      const cfg = (window as any).___grecaptcha_cfg;
      if (cfg?.clients) {
        const stack: any[] = Object.values(cfg.clients);
        const seen = new Set<any>();
        while (stack.length) {
          const n = stack.pop();
          if (!n || typeof n !== "object" || seen.has(n)) continue;
          seen.add(n);
          for (const k of Object.keys(n)) {
            const v = (n as any)[k];
            if (typeof v === "function" && (k === "callback" || k.startsWith("callback"))) {
              try { v(tok); } catch {}
            }
            if (v && typeof v === "object") stack.push(v);
          }
        }
      }
    }, token);

    await page.click(`button[id="${FORM_PREFIX}search"]`);
    lap("submit");

    // Wait for results (rows in datatable) or a "no results" message.
    await page.waitForFunction(
      () =>
        document.querySelectorAll("tbody.ui-datatable-data > tr, tr[data-rk], tr[data-ri]").length > 0
          || /لا توجد|no results|sin resultados|لا تتوفر/i.test(document.body.innerText || ""),
      undefined,
      { timeout: 60_000 },
    );

    lap("results-ready");
    const trips = await extractTrips(page, input.fromId, input.toId);
    lap("done");
    if (process.env.HHR_DEBUG_DUMP === "1") {
      try {
        const dumpDir = "/tmp/hhr-debug";
        fs.mkdirSync(dumpDir, { recursive: true });
        const stamp = Date.now();
        const tag = trips.length > 0 ? "ok" : "empty";
        const html = await page.content();
        fs.writeFileSync(`${dumpDir}/${tag}-${stamp}.html`, html);
        try {
          const files = fs
            .readdirSync(dumpDir)
            .map((f) => ({ f, t: fs.statSync(`${dumpDir}/${f}`).mtimeMs }))
            .sort((a, b) => b.t - a.t);
          for (const old of files.slice(20)) {
            fs.unlinkSync(`${dumpDir}/${old.f}`);
          }
        } catch {}
        console.log(`HHR scrape ${tag}: trips=${trips.length} dump=/tmp/hhr-debug/${tag}-${stamp}.html`);
      } catch (e) {
        console.log("HHR dump failed:", e instanceof Error ? e.message : e);
      }
    } else {
      console.log(`HHR scrape ${trips.length > 0 ? "ok" : "empty"}: trips=${trips.length}`);
    }
    return trips;
  } finally {
    await ctx.close().catch(() => {});
  }
}
