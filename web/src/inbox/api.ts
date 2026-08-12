import type { CreateInboxRequest, Inbox } from "../api/generated";

import { problemMessage, request, requestJson } from "../api/problem";

export async function fetchInboxes(signal?: AbortSignal): Promise<Inbox[]> {
  return requestJson<Inbox[]>("/api/inboxes", { signal });
}

export async function fetchInbox(inboxId: string, signal?: AbortSignal): Promise<Inbox> {
  return requestJson<Inbox>(`/api/inboxes/${inboxId}`, { signal });
}

export async function createInbox(input: CreateInboxRequest): Promise<Inbox> {
  return requestJson<Inbox>("/api/inboxes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function deleteInbox(inboxId: string): Promise<void> {
  return request(`/api/inboxes/${inboxId}`, { method: "DELETE" });
}

export async function clearInbox(inboxId: string): Promise<void> {
  return request(`/api/inboxes/${inboxId}/events`, { method: "DELETE" });
}

export function inboxErrorMessage(error: unknown): string {
  return problemMessage(error, "Webhook Workbench could not reach the server. Try again.");
}
