import type { EventPage, WebhookCapturedMessage } from "../api/generated";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { prependCapturedEvent } from "../event/cache";
import { eventKeys } from "../event/queries";
import { setInboxEventCount } from "../inbox/cache";
import { inboxKeys } from "../inbox/queries";

/** Guards against a tab left open across a deploy splicing a half-shaped row into the list. */
function isCapturedMessage(value: unknown): value is WebhookCapturedMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<WebhookCapturedMessage>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.inboxId === "string" &&
    typeof candidate.httpMethod === "string" &&
    typeof candidate.contentType === "string" &&
    typeof candidate.receivedAt === "string" &&
    typeof candidate.eventCount === "number" &&
    Number.isInteger(candidate.eventCount) &&
    candidate.eventCount >= 0
  );
}

/** Splices the row in place using the absolute count from the message. */
function applyCapturedMessage(
  queryClient: QueryClient,
  inboxId: string,
  message: WebhookCapturedMessage,
) {
  if (message.inboxId !== inboxId) {
    return;
  }

  const { eventCount, ...summary } = message;
  queryClient.setQueryData<InfiniteData<EventPage, number>>(eventKeys.list(inboxId), (current) =>
    prependCapturedEvent(current, summary, eventCount),
  );
  setInboxEventCount(queryClient, inboxId, eventCount);
}

/**
 * Whether live delivery is broken. Starts `false` so the first connect does not flash a warning.
 * Reconnect sends `Last-Event-ID` and the server replays. On `reset`, the client refetches.
 */
export function useInboxEventStream(inboxId: string): boolean {
  const queryClient = useQueryClient();
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(`/api/inboxes/${inboxId}/stream`);

    const refetchEvents = () => {
      void queryClient.invalidateQueries({
        queryKey: eventKeys.list(inboxId),
        refetchType: "active",
      });
    };

    const refetchEverything = () => {
      refetchEvents();
      void queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      void queryClient.invalidateQueries({ queryKey: inboxKeys.detail(inboxId) });
    };

    source.addEventListener("open", () => {
      setDisconnected(false);
    });

    source.addEventListener("reset", refetchEverything);

    source.addEventListener("error", () => {
      setDisconnected(true);
    });

    source.addEventListener("webhook-captured", (event) => {
      const raw: unknown = event instanceof MessageEvent ? event.data : undefined;
      if (typeof raw !== "string") {
        refetchEvents();
        return;
      }
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        refetchEvents();
        return;
      }
      if (isCapturedMessage(data)) {
        applyCapturedMessage(queryClient, inboxId, data);
      }
    });

    return () => {
      source.close();
    };
  }, [inboxId, queryClient]);

  return disconnected;
}
