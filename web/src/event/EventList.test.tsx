import type { EventSummary } from "../api/generated";

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithRouter } from "../test/render";
import { EventList } from "./EventList";
import { formatEventTime } from "./timestamps";

const base: EventSummary = {
  id: "event-1",
  inboxId: "inbox-1",
  httpMethod: "POST",
  contentType: "application/json",
  receivedAt: "2026-08-05T12:00:00Z",
};

describe("EventList", () => {
  it("distinguishes events that arrived in the same minute and links each to its route", async () => {
    const burst: EventSummary[] = [
      base,
      { ...base, id: "event-2", receivedAt: "2026-08-05T12:00:01Z" },
      { ...base, id: "event-3", receivedAt: "2026-08-05T12:00:02Z" },
    ];

    renderWithRouter(<EventList events={burst} inboxId="inbox-1" />);

    // Relative times would all say "now". Clock times stay distinct.
    const times = burst.map((event) => formatEventTime(event.receivedAt));
    expect(new Set(times).size).toBe(3);
    for (const time of times) {
      expect(await screen.findByText(time)).toBeVisible();
    }

    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute(
      "href",
      "/inboxes/inbox-1/events/event-1",
    );
  });
});
