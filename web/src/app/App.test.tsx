import type { EventDetail, EventPage, EventSummary } from "../api/generated";
import type { Inbox } from "../api/generated";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { formatAbsoluteTimestamp } from "../event/timestamps";
import { App } from "./App";

const inbox: Inbox = {
  id: "64d3e71d-3cd6-4cc4-930f-c688b2e14d82",
  name: "Payment Events",
  slug: "payment-events-c84f",
  endpoint: "/hooks/payment-events-c84f",
  eventCount: 1,
  createdAt: "2026-08-05T10:30:00Z",
};

const eventDetail: EventDetail = {
  id: "34d3e71d-3cd6-4cc4-930f-c688b2e14d11",
  inboxId: inbox.id,
  httpMethod: "POST",
  contentType: "application/json",
  receivedAt: "2026-08-05T10:31:00Z",
  inbox: { id: inbox.id, name: inbox.name, slug: inbox.slug, endpoint: inbox.endpoint },
  headers: {
    authorization: ["Bearer secret"],
    "x-provider-signature": ["sha256=example"],
  },
  body: JSON.stringify({ orderId: "ord_42", paid: true }),
};

const olderEventDetail: EventDetail = {
  ...eventDetail,
  id: "24d3e71d-3cd6-4cc4-930f-c688b2e14d10",
  receivedAt: "2026-08-05T10:29:00Z",
  body: JSON.stringify({ orderId: "ord_older" }),
};

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function eventPage(items = [eventDetail]): EventPage {
  return {
    items,
    page: 0,
    size: 50,
    totalElements: items.length,
    totalPages: items.length > 0 ? 1 : 0,
  };
}

function eventLinkName(event: EventSummary): string {
  return `${event.httpMethod} ${event.contentType} received ${formatAbsoluteTimestamp(event.receivedAt)}`;
}

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function bodyText(body: BodyInit | null | undefined): string {
  return typeof body === "string" ? body : "";
}

function pathOf(input: RequestInfo | URL): string {
  const raw = input instanceof Request ? input.url : String(input);
  const url = new URL(raw, "http://localhost");
  return `${url.pathname}${url.search}`;
}

describe("Webhook Workbench application", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined) },
    });
  });

  it("creates the first inbox, selects its route, and shows its empty state", async () => {
    const user = userEvent.setup();
    let createRequestBody: string | undefined;
    const fetchMock = vi.fn<FetchMock>(async (input, init) => {
      const path = pathOf(input);
      if (path === "/api/inboxes" && init?.method === "POST") {
        createRequestBody = bodyText(init.body);
        return response({ ...inbox, eventCount: 0 }, 201);
      }
      if (path === "/api/inboxes") {
        return response([]);
      }
      if (path.includes("/events?")) {
        return response(eventPage([]));
      }
      return response({ ...inbox, eventCount: 0 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText("No inboxes yet.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Create an inbox" }));
    await user.type(screen.getByRole("textbox", { name: "Inbox name" }), inbox.name);
    await user.click(screen.getByRole("button", { name: "Create inbox" }));

    expect(await screen.findByRole("heading", { name: inbox.name, level: 1 })).toBeVisible();
    expect(await screen.findByText("Waiting for a webhook")).toBeVisible();
    expect(window.location.pathname).toBe(`/inboxes/${inbox.id}`);
    expect(JSON.parse(createRequestBody ?? "null")).toEqual({ name: "Payment Events" });
  });

  it("renders RFC problem details when inbox creation fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn<FetchMock>(async (input, init) => {
        if (pathOf(input) === "/api/inboxes" && init?.method === "POST") {
          return response(
            {
              type: "urn:webhook-workbench:problem:invalid-inbox-name",
              title: "Invalid inbox name",
              status: 400,
              detail: "Inbox names cannot contain control characters.",
            },
            400,
          );
        }
        return response([]);
      }),
    );

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Create an inbox" }));
    await user.type(screen.getByRole("textbox", { name: "Inbox name" }), "Payments");
    await user.click(screen.getByRole("button", { name: "Create inbox" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Inbox names cannot contain control characters.",
    );
  });

  it("selects an inbox from the URL and inspects its event payload and headers", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", `/inboxes/${inbox.id}`);
    vi.stubGlobal(
      "fetch",
      vi.fn<FetchMock>(async (input) => {
        const path = pathOf(input);
        if (path === "/api/inboxes") return response([inbox]);
        if (path.includes("/events?")) return response(eventPage());
        if (path === `/api/events/${eventDetail.id}`) return response(eventDetail);
        return response(inbox);
      }),
    );

    render(<App />);

    await user.click(await screen.findByRole("link", { name: eventLinkName(eventDetail) }));
    expect(await screen.findByLabelText("Webhook payload")).toHaveTextContent(
      '"orderId": "ord_42"',
    );
    expect(screen.getByText("x-provider-signature")).toBeVisible();
    expect(screen.getByText("sha256=example")).toBeVisible();
    expect(screen.getByText("Bearer secret")).toBeVisible();
    expect(window.location.pathname).toBe(`/inboxes/${inbox.id}/events/${eventDetail.id}`);
  });

  it("restores an optimistically deleted event after a server failure", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", `/inboxes/${inbox.id}`);
    let finishDelete: ((value: Response) => void) | undefined;
    const deleteResponse = new Promise<Response>((resolve) => {
      finishDelete = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn<FetchMock>(async (input, init) => {
        const path = pathOf(input);
        if (path === `/api/events/${eventDetail.id}` && init?.method === "DELETE") {
          return deleteResponse;
        }
        if (path === "/api/inboxes") return response([inbox]);
        if (path.includes("/events?")) return response(eventPage());
        if (path === `/api/events/${eventDetail.id}`) return response(eventDetail);
        return response(inbox);
      }),
    );

    render(<App />);
    await user.click(await screen.findByRole("link", { name: eventLinkName(eventDetail) }));
    await screen.findByLabelText("Webhook payload");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete event" }));
    expect(await screen.findByText("Event removed")).toBeVisible();

    finishDelete?.(
      response(
        {
          title: "Unexpected error",
          status: 500,
          detail: "The event could not be deleted.",
        },
        500,
      ),
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Webhook payload")).toBeVisible();
    });
    expect(screen.getByRole("alert")).toHaveTextContent("The event could not be deleted.");
  });

  it("loads an older page and keeps the selected event in its deleted state", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", `/inboxes/${inbox.id}`);
    let deleted = false;
    vi.stubGlobal(
      "fetch",
      vi.fn<FetchMock>(async (input, init) => {
        const path = pathOf(input);
        if (path === `/api/events/${olderEventDetail.id}` && init?.method === "DELETE") {
          deleted = true;
          return new Response(null, { status: 204 });
        }
        if (path === "/api/inboxes") return response([inbox]);
        if (path.includes("/events?")) {
          const pageNumber = new URL(path, "http://localhost").searchParams.get("page");
          if (pageNumber === "1") {
            return response({
              items: deleted ? [] : [olderEventDetail],
              page: 1,
              size: 50,
              totalElements: deleted ? 1 : 2,
              totalPages: deleted ? 1 : 2,
            } satisfies EventPage);
          }
          return response({
            items: [eventDetail],
            page: 0,
            size: 50,
            totalElements: deleted ? 1 : 2,
            totalPages: deleted ? 1 : 2,
          } satisfies EventPage);
        }
        if (path === `/api/events/${olderEventDetail.id}`) {
          return response(olderEventDetail);
        }
        if (path === `/api/events/${eventDetail.id}`) return response(eventDetail);
        return response(inbox);
      }),
    );

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Load older events" }));
    await user.click(await screen.findByRole("link", { name: eventLinkName(olderEventDetail) }));
    expect(await screen.findByLabelText("Webhook payload")).toHaveTextContent("ord_older");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete event" }));

    expect(await screen.findByText("Event removed")).toBeVisible();
  });
});
