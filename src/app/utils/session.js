"use client";

const SESSION_EXPIRY_MS = 5 * 60 * 1000;

let cachedSession = null;
let cachedAt = 0;

export function getDecodedSession() {
  if (typeof window === "undefined") return null;

  if (cachedSession && Date.now() - cachedAt < SESSION_EXPIRY_MS) {
    console.log('[Session] Returning cached session:', cachedSession);
    return cachedSession;
  }

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const session = searchParams.get("session");

    if (!session) {
      return null;
    }

    const decoded = atob(decodeURIComponent(session));

    const parsed = JSON.parse(decoded);

    if (!parsed?.appuserid) {
      return null;
    }

    cachedSession = parsed;
    cachedAt = Date.now();

    return parsed;
  } catch (error) {
    console.error("[Session] Failed to decode session:", error);
    return null;
  }
}

export function clearSessionCache() {
  cachedSession = null;
  cachedAt = 0;
}

export function cleanSessionFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("session");
  window.history.replaceState({}, document.title, url.toString());
}