import { expect, test } from "@playwright/test";

/**
 * Masking in a real browser. Unit tests cover the rules; this is where `DOMParser` and
 * `XMLSerializer` actually run.
 */
test("masks every shape it can read, reveals with m, and shares the list", async ({ page }) => {
  await page.request.put("/api/settings", { data: { maskedFields: ["authorization", "token"] } });
  const inbox = await (
    await page.request.post("/api/inboxes", { data: { name: "Masking" } })
  ).json();

  await page.request.post(inbox.endpoint, {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer sk_live_secret",
      "X-Provider-Signature": "sha256=keepme",
    },
    data: { amount: 4900, card: { Token: "tok_live_1" } },
  });
  await page.request.post(inbox.endpoint, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: "channel=%23general&token=tok_live_2",
  });
  await page.request.post(inbox.endpoint, {
    headers: { "Content-Type": "application/xml" },
    data: '<payment><amount token="tok_live_3">4900</amount></payment>',
  });

  await page.goto(`/inboxes/${inbox.id}`);
  const events = page.getByRole("link", { name: /POST/ });

  await events.nth(2).click();
  await expect(page.getByLabel("Webhook payload")).toContainText("••••••••");
  await expect(page.getByLabel("Webhook payload")).not.toContainText("tok_live_1");
  await expect(page.getByText("sha256=keepme")).toBeVisible();
  await expect(page.getByText("sk_live_secret")).toHaveCount(0);

  await events.nth(1).click();
  await expect(page.getByLabel("Webhook payload")).toHaveText(
    "channel=%23general\n&token=••••••••",
  );

  await events.nth(0).click();
  await expect(page.getByLabel("Webhook payload")).toContainText("••••••••");
  await expect(page.getByLabel("Webhook payload")).not.toContainText("tok_live_3");

  // Header should reflect reveal state before secrets are left on screen.
  await page.keyboard.press("m");
  await expect(page.getByText("Revealed")).toBeVisible();
  await expect(page.getByLabel("Webhook payload")).toContainText("tok_live_3");
  await page.keyboard.press("m");
  await expect(page.getByLabel("Webhook payload")).not.toContainText("tok_live_3");

  // A list edit is shared. Assert on the event with the header, after it hits the screen.
  await events.nth(2).click();
  await expect(page.getByText("sha256=keepme")).toBeVisible();

  await page.getByRole("button", { name: "Masked fields" }).click();
  await page.getByLabel("Field names").fill("x-provider-signature");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("sha256=keepme")).toHaveCount(0);
  await expect(page.getByText("sk_live_secret")).toBeVisible();

  expect(await (await page.request.get("/api/settings")).json()).toEqual({
    maskedFields: ["x-provider-signature"],
  });
});
