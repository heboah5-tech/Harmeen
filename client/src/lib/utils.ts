import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const onlyNumbers = (value: string) => {
  return value.replace(/[^\d٠-٩]/g, "");
};

// Online-status tracking moved server-side. We POST a heartbeat every 20s,
// flip to offline on `pagehide` via sendBeacon, and watch visibility.
const onlineState = new Map<
  string,
  { timer: number; online: boolean; teardown: () => void }
>();

async function postOnline(visitorId: string, online: boolean) {
  if (!visitorId) return;
  try {
    await fetch("/api/fb/visitor/online", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, online }),
      credentials: "same-origin",
      keepalive: true,
    });
  } catch {
    /* swallow */
  }
}

function beaconOffline(visitorId: string) {
  if (!visitorId || typeof navigator === "undefined") return;
  try {
    const blob = new Blob(
      [JSON.stringify({ visitorId, online: false })],
      { type: "application/json" },
    );
    navigator.sendBeacon?.("/api/fb/visitor/online", blob);
  } catch {
    /* swallow */
  }
}

export const setupOnlineStatus = (userId: string) => {
  if (!userId || typeof window === "undefined") return;
  if (onlineState.has(userId)) return;

  void postOnline(userId, true);
  const timer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      void postOnline(userId, true);
    }
  }, 20_000);

  const onVis = () => {
    if (document.visibilityState === "hidden") {
      beaconOffline(userId);
    } else {
      void postOnline(userId, true);
    }
  };
  const onLeave = () => beaconOffline(userId);
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", onLeave);
  window.addEventListener("beforeunload", onLeave);

  const teardown = () => {
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pagehide", onLeave);
    window.removeEventListener("beforeunload", onLeave);
  };
  onlineState.set(userId, { timer, online: true, teardown });
};

export const setUserOffline = async (userId: string) => {
  if (!userId) return;
  const entry = onlineState.get(userId);
  if (entry) {
    clearInterval(entry.timer);
    entry.teardown();
    onlineState.delete(userId);
  }
  await postOnline(userId, false);
};
