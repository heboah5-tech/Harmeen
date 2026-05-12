import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let _app: App | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function loadServiceAccount(): any | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch (err) {
    console.error("[firebase-admin] FIREBASE_SERVICE_ACCOUNT is not valid JSON:", err);
    return null;
  }
}

export function getAdmin(): { app: App; db: Firestore; auth: Auth } | null {
  if (_app && _db && _auth) return { app: _app, db: _db, auth: _auth };

  const sa = loadServiceAccount();
  if (!sa) {
    console.warn("[firebase-admin] FIREBASE_SERVICE_ACCOUNT not configured.");
    return null;
  }

  try {
    _app = getApps().length > 0 ? getApp() : initializeApp({ credential: cert(sa), projectId: sa.project_id });
    _db = getFirestore(_app);
    _auth = getAuth(_app);
    return { app: _app, db: _db, auth: _auth };
  } catch (err) {
    console.error("[firebase-admin] init failed:", err);
    return null;
  }
}

export function adminDb(): Firestore | null {
  return getAdmin()?.db ?? null;
}

export function adminAuth(): Auth | null {
  return getAdmin()?.auth ?? null;
}

export const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || "";
