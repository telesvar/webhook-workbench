import type { EventDetail } from "../api/generated";

import { expect, it } from "vitest";

import { curlCommand } from "./curl";

const event: EventDetail = {
  id: "019ff060-dc03-7010-95e6-d6ab0930e494",
  inboxId: "019ff060-0000-7000-8000-000000000001",
  httpMethod: "POST",
  contentType: "application/json",
  receivedAt: "2026-08-11T15:31:47Z",
  inbox: {
    id: "019ff060-0000-7000-8000-000000000001",
    name: "Payments",
    slug: "payments-c84f",
    endpoint: "/hooks/payments-c84f",
  },
  headers: {
    authorization: ["Bearer real"],
    host: ["example.test"],
    "x-signature": ["sha256=one", "sha256=two"],
  },
  body: `{"note":"it's fine"}`,
};

it("rebuilds the request as a runnable command", () => {
  expect(curlCommand(event, "http://localhost:8080")).toBe(
    [
      "curl -X POST 'http://localhost:8080/hooks/payments-c84f' \\",
      "  -H 'Content-Type: application/json' \\",
      "  -H 'authorization: Bearer real' \\",
      "  -H 'x-signature: sha256=one' \\",
      "  -H 'x-signature: sha256=two' \\",
      String.raw`  --data-raw '{"note":"it'\''s fine"}'`,
    ].join("\n"),
  );
});
