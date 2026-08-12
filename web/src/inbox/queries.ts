import { queryOptions } from "@tanstack/react-query";

import { fetchInbox, fetchInboxes } from "./api";

/**
 * An inbox is cached under list and detail keys. The sidebar uses one and the workspace the
 * other. `inbox/cache.ts` keeps them in sync.
 */

export const inboxKeys = {
  all: ["inboxes"] as const,
  detail: (inboxId: string) => ["inboxes", inboxId] as const,
};

export function inboxesQuery() {
  return queryOptions({
    queryKey: inboxKeys.all,
    queryFn: ({ signal }) => fetchInboxes(signal),
  });
}

export function inboxQuery(inboxId: string) {
  return queryOptions({
    queryKey: inboxKeys.detail(inboxId),
    queryFn: ({ signal }) => fetchInbox(inboxId, signal),
  });
}
