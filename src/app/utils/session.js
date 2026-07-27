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

    console.log('[Session] Raw session param from URL:', session);

    if (!session) {
      console.log('[Session] No session param found in URL');
      return null;
    }

    const decoded = atob(decodeURIComponent(session));
    console.log('[Session] Decoded base64 string:', decoded);

    const parsed = JSON.parse(decoded);
    console.log('[Session] Parsed session object:', parsed);

    if (!parsed?.appuserid) {
      console.error("[Session] Decoded session missing appuserid", parsed);
      return null;
    }

    cachedSession = parsed;
    cachedAt = Date.now();

    console.log('[Session] Session decoded and cached successfully');
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