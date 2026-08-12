import { expect, test } from "@playwright/test";

test("switches a body between formatted and exactly as sent", async ({ page }) => {
  await page.request.put("/api/settings", { data: { maskedFields: [] } });
  const inbox = await (
    await page.request.post("/api/inboxes", { data: { name: "Formatting" } })
  ).json();
  const minified = '{"amount":4900,"card":{"brand":"visa"}}';

  await page.request.post(inbox.endpoint, {
    headers: { "Content-Type": "application/json" },
    data: minified,
  });
  await page.request.post(inbox.endpoint, {
    headers: { "Content-Type": "text/plain" },
    data: "nothing to indent here",
  });

  await page.goto(`/inboxes/${inbox.id}`);
  const events = page.getByRole("link", { name: /POST/ });

  await events.nth(1).click();
  await expect(page.getByLabel("Webhook payload")).toContainText('"amount": 4900');

  await page.keyboard.press("f");
  await expect(page.getByLabel("Webhook payload")).toHaveText(minified);
  await page.getByRole("button", { name: "f As sent" }).click();
  await expect(page.getByRole("button", { name: "f Formatted" })).toBeVisible();

  // Nothing to indent, so no toggle claims otherwise.
  await events.nth(0).click();
  await expect(page.getByLabel("Webhook payload")).toHaveText("nothing to indent here");
  await expect(page.getByRole("button", { name: /Formatted|As sent/ })).toHaveCount(0);
});
