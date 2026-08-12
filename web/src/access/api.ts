import type { Session } from "../api/generated";

import { requestJson } from "../api/problem";

export function fetchSession(signal?: AbortSignal): Promise<Session> {
  return requestJson<Session>("/api/session", { signal });
}

/**
 * Checks the token before storing it, so a typo is caught here rather than on every later request.
 *
 * Probes a real guarded endpoint rather than a dedicated one, because "the token works" and "the
 * token can read the API" are the same question. `/api/session` cannot answer it, since the filter
 * leaves that path open.
 */
export async function tokenIsAccepted(token: string): Promise<boolean> {
  const response = await fetch("/api/inboxes", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.ok;
}
