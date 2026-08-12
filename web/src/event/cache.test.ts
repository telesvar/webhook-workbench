import type { EventPage, EventSummary } from "../api/generated";
import type { InfiniteData } from "@tanstack/react-query";

import { describe, expect, it } from "vitest";

import { mergeCachedEvent, prependCapturedEvent, removeCachedEvent } from "./cache";

function summary(index: number): EventSummary {
  return {
    id: `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`,
    inboxId: "inbox-1",
    httpMethod: "POST",
    contentType: "application/json",
    receivedAt: new Date(Date.UTC(2026, 7, 5, 12, 0, index)).toISOString(),
  };
}

function cache(items: EventSummary[]): InfiniteData<EventPage, number> {
  return {
    pageParams: [0, 1],
    pages: [
      {
        items: items.slice(0, 50),
        page: 0,
        size: 50,
        totalElements: items.length,
        totalPages: Math.ceil(items.length / 50),
      },
      {
        items: items.slice(50),
        page: 1,
        size: 50,
        totalElements: items.length,
        totalPages: Math.ceil(items.length / 50),
      },
    ],
  };
}

describe("event cache updates", () => {
  it("deduplicates a captured event and keeps the authoritative total", () => {
    const existing = cache([summary(2), summary(1)]);
    const message = summary(3);

    const first = prependCapturedEvent(existing, message, 3);
    const duplicate = prependCapturedEvent(first, message, 3);

    expect(duplicate?.pages.flatMap((page) => page.items)).toHaveLength(3);
    expect(duplicate?.pages[0].items[0]).toEqual(message);
    expect(duplicate?.pages[0].totalElements).toBe(3);
  });

  it("rolls back a page-boundary delete without losing a concurrent SSE arrival", () => {
    const originalItems = Array.from({ length: 51 }, (_, index) => summary(51 - index));
    const original = cache(originalItems);
    const deleted = originalItems[50];
    const optimistic = removeCachedEvent(original, deleted.id);

    expect(optimistic.data?.pages).toHaveLength(2);
    expect(optimistic.data?.pages[1].items).toHaveLength(0);

    const arrival = summary(52);
    const afterSse = prependCapturedEvent(optimistic.data, arrival, 52);
    const rolledBack = mergeCachedEvent(afterSse, deleted, 51);
    const ids = rolledBack?.pages.flatMap((page) => page.items).map((item) => item.id);

    expect(ids).toHaveLength(52);
    expect(ids).toContain(arrival.id);
    expect(ids).toContain(deleted.id);
    expect(rolledBack?.pages[0].totalElements).toBe(52);
  });
});
