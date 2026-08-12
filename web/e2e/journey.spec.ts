import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

test("create, receive, inspect, delete, and deep-link an inbox", async ({ page }) => {
  await page.request.put("/api/settings", {
    data: { maskedFields: ["authorization", "cookie", "password", "secret", "token"] },
  });

  await page.goto("/");

  await page.getByRole("button", { name: "Create an inbox" }).click();
  await page.getByRole("textbox", { name: "Inbox name" }).fill("Payment Events");
  await page.getByRole("button", { name: "Create inbox" }).click();

  await expect(page.getByRole("heading", { name: "Payment Events", level: 1 })).toBeVisible();
  const endpoint = await page.getByText(/\/hooks\/payment-events-/).innerText();
  expect(endpoint).toContain("/hooks/payment-events-");

  const capture = await page.request.post(endpoint, {
    data: { orderId: "ord_42", amount: 4900, paid: true },
    headers: {
      Authorization: "Bearer sk_live_9f21",
      "X-Provider-Signature": "sha256=workbench",
    },
  });
  expect(capture.status()).toBe(201);

  const event = page.getByRole("link", { name: /POST.*application\/json/ }).first();
  await expect(event).toBeVisible();
  await event.click();

  await expect(page.getByLabel("Webhook payload")).toContainText('"orderId": "ord_42"');
  await expect(page.getByText("sha256=workbench")).toBeVisible();
  await expect(page.getByText("Bearer sk_live_9f21")).toHaveCount(0);

  if (process.env.UPDATE_SCREENSHOT === "1") {
    const currentFile = fileURLToPath(import.meta.url);
    const screenshot = path.resolve(path.dirname(currentFile), "../../docs/webhook-workbench.png");
    mkdirSync(path.dirname(screenshot), { recursive: true });
    await page.screenshot({ path: screenshot, fullPage: true });
  }

  // URL holds the open event, so reload restores it without selection in component state.
  const eventLink = page.url();
  expect(eventLink).toMatch(/\/inboxes\/[^/]+\/events\/[^/]+$/);
  await page.reload();
  expect(page.url()).toBe(eventLink);
  await expect(page.getByLabel("Webhook payload")).toContainText('"orderId": "ord_42"');

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete event" }).click();
  await expect(page.getByText("Waiting for a webhook")).toBeVisible();
  await expect(page.getByText("Event removed")).toBeVisible();

  // The removed state survives a reload. The loader 404s into the route's not-found UI.
  const deepLink = page.url();
  await page.reload();
  expect(page.url()).toBe(deepLink);
  await expect(page.getByText("Waiting for a webhook")).toBeVisible();
  await expect(page.getByText("Event removed")).toBeVisible();

  await page.emulateMedia({ colorScheme: "dark" });
  const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.emulateMedia({ colorScheme: "light" });
  const lightBackground = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(darkBackground).not.toBe(lightBackground);
});
