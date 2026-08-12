import type { EventSummary } from "../api/generated";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../app/App";
import { formatAbsoluteTimestamp } from "./timestamps";

const inbox = {
  id: "inbox-1",
  name: "Payments",
  slug: "payments-c84f",
  endpoint: "/hooks/payments-c84f",
  eventCount: 2,
  createdAt: "2026-08-05T10:30:00Z",
};

const newer: EventSummary = {
  id: "event-newer",
  inboxId: inbox.id,
  httpMethod: "POST",
  contentType: "application/json",
  receivedAt: "2026-08-05T10:32:00Z",
};

const older: EventSummary = { ...newer, id: "event-older", receivedAt: "2026-08-05T10:31:00Z" };

function response(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function eventLinkName(event: EventSummary): string {
  return `${event.httpMethod} ${event.contentType} received ${formatAbsoluteTimestamp(event.receivedAt)}`;
}

function detailOf(event: EventSummary) {
  return {
    ...event,
    inbox: { id: inbox.id, name: inbox.name, slug: inbox.slug },
    headers: {},
    body: JSON.stringify({ id: event.id }),
  };
}

describe("event list keyboard navigation", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", `/inboxes/${inbox.id}`);
    vi.stubGlobal(
      "fetch",
      vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async (input) => {
        const raw = input instanceof Request ? input.url : String(input);
        const path = new URL(raw, "http://localhost").pathname;
        if (path === "/api/inboxes") return response([inbox]);
        if (path === `/api/inboxes/${inbox.id}/events`) {
          return response({
            items: [newer, older],
            page: 0,
            size: 50,
            totalElements: 2,
            totalPages: 1,
          });
        }
        if (path === `/api/events/${newer.id}`) return response(detailOf(newer));
        if (path === `/api/events/${older.id}`) return response(detailOf(older));
        return response(inbox);
      }),
    );
  });

  it("steps through events with the arrow keys and j/k", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("link", { name: eventLinkName(newer) });

    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(window.location.pathname).toBe(`/inboxes/${inbox.id}/events/${newer.id}`);
    });

    await user.keyboard("j");
    await waitFor(() => {
      expect(window.location.pathname).toBe(`/inboxes/${inbox.id}/events/${older.id}`);
    });

    await user.keyboard("k");
    await waitFor(() => {
      expect(window.location.pathname).toBe(`/inboxes/${inbox.id}/events/${newer.id}`);
    });

    await user.keyboard("{ArrowUp}");
    await waitFor(() => {
      expect(window.location.pathname).toBe(`/inboxes/${inbox.id}/events/${newer.id}`);
    });
  });

  it("does not hijack keys typed into the inbox name field", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("link", { name: eventLinkName(newer) });

    await user.click(await screen.findByRole("button", { name: "Create an inbox" }));
    const field = await screen.findByRole("textbox", { name: "Inbox name" });
    await user.type(field, "jk checkout");

    expect(field).toHaveValue("jk checkout");
    expect(window.location.pathname).toBe(`/inboxes/${inbox.id}`);
  });
});
