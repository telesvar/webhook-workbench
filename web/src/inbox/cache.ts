import type { Inbox } from "../api/generated";
import type { QueryClient } from "@tanstack/react-query";

import { inboxKeys } from "./queries";

/**
 * Writes an event count into both inbox caches.
 * Accepts an absolute total (from the stream) or a delta (from optimistic mutations).
 */
export function setInboxEventCount(
  queryClient: QueryClient,
  inboxId: string,
  next: number | ((current: number) => number),
) {
  const resolve = typeof next === "function" ? next : () => next;

  queryClient.setQueryData<Inbox[]>(inboxKeys.all, (current) =>
    current?.map((inbox) =>
      inbox.id === inboxId ? { ...inbox, eventCount: resolve(inbox.eventCount) } : inbox,
    ),
  );
  queryClient.setQueryData<Inbox>(inboxKeys.detail(inboxId), (current) =>
    current ? { ...current, eventCount: resolve(current.eventCount) } : current,
  );
}
