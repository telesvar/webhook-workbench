import { useSyncExternalStore } from "react";

const COOKIE_NAME = "workbench_token";
const ONE_MONTH_IN_SECONDS = 2_592_000;

const listeners = new Set<() => void>();

/**
 * Token lives in a cookie rather than localStorage. `EventSource` cannot set headers, and a
 * cookie is the credential the live stream can still carry.
 */
export function accessToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string | null) {
  // Secure only on HTTPS. Setting it on http would drop the cookie on loopback.
  const attributes = `Path=/; SameSite=Strict${location.protocol === "https:" ? "; Secure" : ""}`;
  document.cookie = token
    ? `${COOKIE_NAME}=${encodeURIComponent(token)}; ${attributes}; Max-Age=${ONE_MONTH_IN_SECONDS}`
    : `${COOKIE_NAME}=; ${attributes}; Max-Age=0`;
  for (const listener of listeners) {
    listener();
  }
}

export function useToken(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    accessToken,
    () => null,
  );
}
