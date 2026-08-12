import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { fetchEvent, fetchEventPage } from "./api";

/** Shared by loaders and components so both name the same cache entries. */

export const eventKeys = {
  list: (inboxId: string) => ["events", "inbox", inboxId] as const,
  detail: (eventId: string) => ["events", "detail", eventId] as const,
};

/** Uses the server's `totalPages` so retention pruning shortens the list correctly. */
export function eventPagesQuery(inboxId: string) {
  return infiniteQueryOptions({
    queryKey: eventKeys.list(inboxId),
    queryFn: ({ pageParam, signal }) => fetchEventPage(inboxId, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

export function eventQuery(eventId: string) {
  return queryOptions({
    queryKey: eventKeys.detail(eventId),
    queryFn: ({ signal }) => fetchEvent(eventId, signal),
  });
}
