import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";

let _admin: SupabaseClient | null = null;

export function supaAdmin(): SupabaseClient | null {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn(
      "[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — Supabase routes will be unavailable.",
    );
    return null;
  }
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
    realtime: {
      params: { eventsPerSecond: 50 },
      transport: WebSocket as any,
    },
  });
  return _admin;
}

export const SUPABASE_URL = process.env.SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
