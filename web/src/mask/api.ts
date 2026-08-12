import type { Settings } from "../api/generated";

import { requestJson } from "../api/problem";

export function fetchSettings(signal?: AbortSignal): Promise<Settings> {
  return requestJson<Settings>("/api/settings", { signal });
}

export function saveSettings(settings: Settings): Promise<Settings> {
  return requestJson<Settings>("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}
