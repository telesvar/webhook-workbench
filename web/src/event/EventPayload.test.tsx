import type { Settings } from "../api/generated";
import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toggleReveal } from "../mask/masking";
import { settingsQuery } from "../mask/queries";
import { toggleFormat } from "./body";
import { EventHeaders } from "./EventHeaders";
import { EventPayload } from "./EventPayload";

/**
 * What the reader sees. Rules live in `body.test.ts`. Here we check that the list reaches the
 * screen, toggles re-render, and empty states say something.
 */
function withMaskedFields(node: ReactNode, maskedFields: string[]) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(settingsQuery.queryKey, { maskedFields } satisfies Settings);
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

describe("inspecting a captured request", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined) },
    });
  });

  it("masks headers and body from the instance's list", () => {
    withMaskedFields(
      <>
        <EventPayload
          body='{"amount":42,"card":{"Token":"tok_live_1"}}'
          contentType="application/json"
        />
        <EventHeaders headers={{ Authorization: ["Bearer real"], "x-signature": ["sha256=one"] }} />
      </>,
      ["authorization", "token"],
    );

    expect(screen.getByLabelText("Webhook payload")).not.toHaveTextContent("tok_live_1");
    expect(screen.queryByText("Bearer real")).toBeNull();
    expect(screen.getByText("sha256=one")).toBeVisible();
  });

  it("reveals and hides again on demand", () => {
    withMaskedFields(<EventHeaders headers={{ authorization: ["Bearer real"] }} />, [
      "authorization",
    ]);

    expect(screen.queryByText("Bearer real")).toBeNull();
    act(toggleReveal);
    expect(screen.getByText("Bearer real")).toBeVisible();
    act(toggleReveal);
    expect(screen.queryByText("Bearer real")).toBeNull();
  });

  it("switches between formatted and as sent", () => {
    const minified = '{"amount":4900}';
    withMaskedFields(<EventPayload body={minified} contentType="application/json" />, []);

    expect(screen.getByLabelText("Webhook payload")).toHaveTextContent('"amount": 4900');
    act(toggleFormat);
    expect(screen.getByLabelText("Webhook payload").textContent).toBe(minified);
    act(toggleFormat);
  });

  it("copies the request as it arrived rather than what is on screen", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const body = '{"token":"tok_live_1"}';
    withMaskedFields(<EventPayload body={body} contentType="application/json" />, ["token"]);

    expect(screen.getByLabelText("Webhook payload")).not.toHaveTextContent("tok_live_1");
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(body);
  });

  it("says when the request had no body or headers", () => {
    withMaskedFields(
      <>
        <EventPayload body="" contentType="" />
        <EventHeaders headers={{}} />
      </>,
      [],
    );

    expect(screen.getByText("The request had no body.")).toBeVisible();
    expect(screen.getByText("no content type")).toBeVisible();
    expect(screen.getByText("The request carried no headers.")).toBeVisible();
  });
});
