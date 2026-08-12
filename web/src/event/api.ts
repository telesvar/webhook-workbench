import type { EventDetail, EventPage } from "../api/generated";

import { problemMessage, request, requestJson } from "../api/problem";

export const EVENT_PAGE_SIZE = 50;

export async function fetchEventPage(
  inboxId: string,
  page: number,
  signal?: AbortSignal,
): Promise<EventPage> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(EVENT_PAGE_SIZE),
  });
  return requestJson<EventPage>(`/api/inboxes/${inboxId}/events?${params}`, { signal });
}

export async function fetchEvent(eventId: string, signal?: AbortSignal): Promise<EventDetail> {
  return requestJson<EventDetail>(`/api/events/${eventId}`, { signal });
}

export async function deleteEvent(eventId: string): Promise<void> {
  return request(`/api/events/${eventId}`, { method: "DELETE" });
}

export function eventErrorMessage(error: unknown): string {
  return problemMessage(error, "Webhook Workbench could not load this event. Try again.");
}
