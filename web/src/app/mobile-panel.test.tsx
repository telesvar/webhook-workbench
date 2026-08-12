import type { EventDetail, Inbox } from "../api/generated";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { formatAbsoluteTimestamp } from "../event/timestamps";
import { App } from "./App";

const inbox: Inbox = {
  id: "inbox-1",
  name: "Payments",
  slug: "payments-c84f",
  endpoint: "/hooks/payments-c84f",
  eventCount: 1,
  createdAt: "2026-08-05T10:30:00Z",
};

const event: EventDetail = {
  id: "event-1",
  inboxId: inbox.id,
  httpMethod: "POST",
  contentType: "application/json",
  receivedAt: "2026-08-05T10:31:00Z",
  inbox: { id: inbox.id, name: inbox.name, slug: inbox.slug, endpoint: inbox.endpoint },
  headers: {},
  body: JSON.stringify({ paid: true }),
};

function response(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const eventLinkName = `${event.httpMethod} ${event.contentType} received ${formatAbsoluteTimestamp(event.receivedAt)}`;

function tab(name: string): HTMLButtonElement {
  return screen.getByRole("button", { name });
}

describe("mobile panels", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async (input) => {
        const raw = input instanceof Request ? input.url : String(input);
        const path = new URL(raw, "http://localhost").pathname;
        if (path === "/api/inboxes") return response([inbox]);
        if (path.endsWith("/events")) {
          return response({ items: [event], page: 0, size: 50, totalElements: 1, totalPages: 1 });
        }
        if (path === `/api/events/${event.id}`) return response(event);
        return response(inbox);
      }),
    );
  });

  it("follows the route and never leaves an unreachable tab selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    // At the root only the inbox list exists, so the other panels are out of reach.
    await screen.findByRole("heading", { name: "Inboxes" });
    expect(tab("Inboxes")).toHaveAttribute("aria-current", "page");
    expect(tab("Events")).toBeDisabled();
    expect(tab("Inspector")).toBeDisabled();

    await user.click(await screen.findByRole("link", { name: /Payments/ }));
    await screen.findByRole("heading", { name: inbox.name, level: 1 });
    expect(tab("Events")).toHaveAttribute("aria-current", "page");
    expect(tab("Inspector")).toBeDisabled();

    await user.click(await screen.findByRole("link", { name: eventLinkName }));
    await screen.findByLabelText("Webhook payload");
    expect(tab("Inspector")).toHaveAttribute("aria-current", "page");

    // Back to the list is a view change, not navigation, so the event stays selected.
    await user.click(tab("Events"));
    expect(tab("Events")).toHaveAttribute("aria-current", "page");
    expect(window.location.pathname).toBe(`/inboxes/${inbox.id}/events/${event.id}`);

    // Going home should clear the panel. A stranded selection leaves a tab current and disabled.
    await user.click(screen.getByRole("link", { name: "Webhook Workbench home" }));
    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
    expect(tab("Inboxes")).toHaveAttribute("aria-current", "page");
    expect(tab("Events")).toBeDisabled();
    expect(tab("Inspector")).toBeDisabled();
  });
});
