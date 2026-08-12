import type { EventPage, EventSummary } from "../api/generated";
import type { InfiniteData } from "@tanstack/react-query";

import { EVENT_PAGE_SIZE } from "./api";

/**
 * Optimistic edits on the paginated event list.
 *
 * The server pages by offset, so insert or remove shifts later pages. Editing `pages[0].items`
 * in place would make "Load older" return a row you already have. Flatten, edit, then re-slice.
 */

/**
 * Newest first by id. UUIDv7 is creation order and matches the server index.
 * Compare by code unit, not `localeCompare`, because MySQL compares as unsigned bytes.
 */
function eventOrder(left: EventSummary, right: EventSummary): number {
  if (left.id === right.id) {
    return 0;
  }
  return left.id > right.id ? -1 : 1;
}

function flatten(current: InfiniteData<EventPage, number>): EventSummary[] {
  return current.pages.flatMap((page) => page.items);
}

/**
 * `preservePageSlots` keeps loaded pages from collapsing on delete.
 * Captures should not preserve slots, because retention can prune more than one row and those
 * pages are gone.
 */
function rebuildPages(
  current: InfiniteData<EventPage, number>,
  items: EventSummary[],
  totalElements: number,
  preservePageSlots = false,
): InfiniteData<EventPage, number> {
  const totalPages = Math.ceil(totalElements / EVENT_PAGE_SIZE);
  const loadedPageCount = preservePageSlots
    ? current.pages.length
    : Math.min(current.pages.length, Math.max(1, totalPages));
  const maximumLoadedItems = loadedPageCount * EVENT_PAGE_SIZE;
  const loadedItems = items.slice(0, maximumLoadedItems);
  const pages = current.pages.slice(0, loadedPageCount).map((page, index) => ({
    ...page,
    items: loadedItems.slice(index * EVENT_PAGE_SIZE, (index + 1) * EVENT_PAGE_SIZE),
    page: index,
    size: EVENT_PAGE_SIZE,
    totalElements,
    totalPages,
  }));

  return {
    pages,
    pageParams: current.pageParams.slice(0, loadedPageCount),
  };
}

/** Truncates to the server's new total so retention pruning shows up in the cache. */
export function prependCapturedEvent(
  current: InfiniteData<EventPage, number> | undefined,
  summary: EventSummary,
  eventCount: number,
): InfiniteData<EventPage, number> | undefined {
  if (!current || current.pages.length === 0) {
    return current;
  }
  const items = [summary, ...flatten(current).filter((item) => item.id !== summary.id)].slice(
    0,
    eventCount,
  );
  return rebuildPages(current, items, eventCount);
}

/** Returns the removed row so a failed delete can put it back exactly. */
export function removeCachedEvent(
  current: InfiniteData<EventPage, number> | undefined,
  eventId: string,
): {
  data: InfiniteData<EventPage, number> | undefined;
  removed: EventSummary | undefined;
} {
  if (!current || current.pages.length === 0) {
    return { data: current, removed: undefined };
  }
  const items = flatten(current);
  const removed = items.find((item) => item.id === eventId);
  if (!removed) {
    return { data: current, removed: undefined };
  }
  const totalElements = Math.max(0, current.pages[0].totalElements - 1);
  return {
    data: rebuildPages(
      current,
      items.filter((item) => item.id !== eventId),
      totalElements,
      true,
    ),
    removed,
  };
}

/**
 * `minimumTotalElements` is the pre-delete count. The stream may have raised the real total
 * since then. Take the larger so nothing that arrived mid-delete is dropped.
 */
export function mergeCachedEvent(
  current: InfiniteData<EventPage, number> | undefined,
  summary: EventSummary,
  minimumTotalElements: number,
): InfiniteData<EventPage, number> | undefined {
  if (!current || current.pages.length === 0) {
    return current;
  }
  const existing = flatten(current);
  if (existing.some((item) => item.id === summary.id)) {
    return current;
  }
  const items = [...existing, summary].toSorted(eventOrder);
  return rebuildPages(
    current,
    items,
    Math.max(current.pages[0].totalElements, minimumTotalElements),
  );
}
