import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../app/App";

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("access gate", () => {
  beforeEach(() => {
    document.cookie = "workbench_token=; Path=/; Max-Age=0";
    window.history.replaceState(null, "", "/");
  });

  it("asks for a token, rejects a wrong one, and keeps a working one", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = new URL(
          input instanceof Request ? input.url : String(input),
          "http://localhost",
        ).pathname;
        if (path === "/api/session") return response({ authenticationRequired: true });
        if (new Headers(init?.headers).get("Authorization") !== "Bearer right") {
          return response({ title: "Unauthorized", status: 401 }, 401);
        }
        return response([]);
      }),
    );

    render(<App />);

    const field = await screen.findByLabelText("Access token");
    await user.type(field, "wrong");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That token was not accepted.");

    await user.clear(field);
    await user.type(field, "right");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("No inboxes yet.")).toBeVisible();
    expect(document.cookie).toContain("workbench_token=right");

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByLabelText("Access token")).toBeVisible();
  });

  it("returns to the prompt when the stored token stops working", async () => {
    document.cookie = "workbench_token=stale; Path=/";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const path = new URL(
          input instanceof Request ? input.url : String(input),
          "http://localhost",
        ).pathname;
        if (path === "/api/session") return response({ authenticationRequired: true });
        return response({ title: "Unauthorized", status: 401 }, 401);
      }),
    );

    render(<App />);

    expect(await screen.findByLabelText("Access token")).toBeVisible();
  });
});
