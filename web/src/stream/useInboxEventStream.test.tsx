import type { EventPage, WebhookCapturedMessage } from "../api/generated";
import type { Inbox } from "../api/generated";
import type { ReactNode } from "react";

import { type InfiniteData, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { eventKeys } from "../event/queries";
import { inboxKeys } from "../inbox/queries";
import { useInboxEventStream } from "./useInboxEventStream";

class ControlledEventSource {
  static instances: ControlledEventSource[] = [];

  readonly url: string | URL;
  readonly listeners = new Map<string, (event: Event) => void>();
  closed = false;

  constructor(url: string | URL) {
    this.url = url;
    ControlledEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.set(type, (event) => {
      if (typeof listener === "function") {
        listener(event);
      } else {
        listener.handleEvent(event);
      }
    });
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: unknown) {
    this.listeners.get(type)?.(new MessageEvent(type, { data: JSON.stringify(data) }));
  }

  signal(type: string) {
    this.listeners.get(type)?.(new Event(type));
  }
}

const inbox: Inbox = {
  id: "inbox-1",
  name: "Payments",
  slug: "payments-c84f",
  endpoint: "/hooks/payments-c84f",
  eventCount: 1,
  createdAt: "2026-08-05T10:30:00Z",
};

const page: InfiniteData<EventPage, number> = {
  pageParams: [0],
  pages: [
    {
      items: [
        {
          id: "event-1",
          inboxId: inbox.id,
          httpMethod: "POST",
          contentType: "application/json",
          receivedAt: "2026-08-05T10:31:00Z",
        },
      ],
      page: 0,
      size: 50,
      totalElements: 1,
      totalPages: 1,
    },
  ],
};

describe("inbox event stream", () => {
  beforeEach(() => {
    ControlledEventSource.instances = [];
    Object.defineProperty(globalThis, "EventSource", {
      configurable: true,
      writable: true,
      value: ControlledEventSource,
    });
  });

  it("inserts and deduplicates capture messages while updating counts", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(inboxKeys.all, [inbox]);
    queryClient.setQueryData(inboxKeys.detail(inbox.id), inbox);
    queryClient.setQueryData(eventKeys.list(inbox.id), page);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useInboxEventStream(inbox.id), {
      wrapper,
    });
    const source = ControlledEventSource.instances[0];
    const message: WebhookCapturedMessage = {
      id: "event-2",
      inboxId: inbox.id,
      httpMethod: "POST",
      contentType: "application/json; charset=utf-8",
      receivedAt: "2026-08-05T10:32:00Z",
      eventCount: 2,
    };

    act(() => {
      source.emit("webhook-captured", message);
      source.emit("webhook-captured", message);
    });

    const cached = queryClient.getQueryData<InfiniteData<EventPage, number>>(
      eventKeys.list(inbox.id),
    );
    expect(cached?.pages[0].items.map((item) => item.id)).toEqual(["event-2", "event-1"]);
    expect(queryClient.getQueryData<Inbox[]>(inboxKeys.all)?.[0].eventCount).toBe(2);
    // Nothing has failed, so no warning even though "open" never fired.
    expect(result.current).toBe(false);
  });

  it("refetches only when the server says it cannot replay, and closes on cleanup", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, unmount } = renderHook(() => useInboxEventStream(inbox.id), { wrapper });
    const source = ControlledEventSource.instances[0];

    // The server replays on reconnect, so a plain open should not trigger a refetch.
    act(() => {
      source.signal("open");
    });
    expect(result.current).toBe(false);
    expect(invalidate).not.toHaveBeenCalled();

    act(() => {
      source.signal("error");
    });
    expect(result.current).toBe(true);

    act(() => {
      source.signal("open");
      source.signal("reset");
    });
    expect(result.current).toBe(false);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: eventKeys.list(inbox.id),
      refetchType: "active",
    });
    expect(invalidate).toHaveBeenCalledTimes(3);

    unmount();
    expect(source.closed).toBe(true);
  });
});
