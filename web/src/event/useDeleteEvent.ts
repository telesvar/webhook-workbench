import type { Inbox } from "../api/generated";
import type { EventDetail, EventPage, EventSummary } from "../api/generated";
import type { InfiniteData } from "@tanstack/react-query";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setInboxEventCount } from "../inbox/cache";
import { inboxKeys } from "../inbox/queries";
import { deleteEvent } from "./api";
import { mergeCachedEvent, removeCachedEvent } from "./cache";
import { eventKeys } from "./queries";

/** Snapshots the detail entry too. Otherwise rollback restores the list but not the open event. */
interface DeleteEventContext {
  detail: EventDetail | undefined;
  preDeleteCount: number;
  removed: EventSummary | undefined;
}

/**
 * Optimistic delete with rollback. `onMutate` snapshots the count and both cache entries first.
 * Lives with the event route so removed state comes from `mutation.variables`, not a flag.
 */
export function useDeleteEvent(inboxId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, DeleteEventContext>({
    mutationFn: deleteEvent,
    onMutate: async (eventId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: eventKeys.list(inboxId) }),
        queryClient.cancelQueries({ queryKey: eventKeys.detail(eventId) }),
      ]);
      const current = queryClient.getQueryData<InfiniteData<EventPage, number>>(
        eventKeys.list(inboxId),
      );
      const preDeleteCount =
        current?.pages[0]?.totalElements ??
        queryClient.getQueryData<Inbox>(inboxKeys.detail(inboxId))?.eventCount ??
        0;
      let removed: EventSummary | undefined;
      queryClient.setQueryData<InfiniteData<EventPage, number>>(
        eventKeys.list(inboxId),
        (cached) => {
          const result = removeCachedEvent(cached, eventId);
          removed = result.removed;
          return result.data;
        },
      );
      const detail = queryClient.getQueryData<EventDetail>(eventKeys.detail(eventId));
      if (removed) {
        setInboxEventCount(queryClient, inboxId, (count) => Math.max(0, count - 1));
      }
      return { detail, preDeleteCount, removed };
    },
    onError: (_error, eventId, context) => {
      if (context?.removed) {
        const { preDeleteCount, removed } = context;
        queryClient.setQueryData<InfiniteData<EventPage, number>>(
          eventKeys.list(inboxId),
          (current) => mergeCachedEvent(current, removed, preDeleteCount),
        );
        setInboxEventCount(queryClient, inboxId, (count) => Math.max(count, preDeleteCount));
      }
      if (context?.detail) {
        const { detail } = context;
        queryClient.setQueryData<EventDetail>(
          eventKeys.detail(eventId),
          (current) => current ?? detail,
        );
      }
    },
    onSuccess: (_data, eventId) => {
      queryClient.removeQueries({ queryKey: eventKeys.detail(eventId) });
    },
    onSettled: (_data, error, eventId) => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.list(inboxId) });
      void queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      void queryClient.invalidateQueries({ queryKey: inboxKeys.detail(inboxId) });
      if (error) {
        void queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      }
    },
  });
}
