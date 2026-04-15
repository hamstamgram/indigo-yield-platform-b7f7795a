import { test, expect } from "@playwright/test";

test("smoke: login and dashboard access", async ({ page }) => {
  test.setTimeout(60000);

  // Navigate to login
  await page.goto("https://indigo-yield-platform.lovable.app");

  // Fill credentials
  await page.getByRole("textbox", { name: "Email Address" }).fill("Adriel@indigo.fund");
  await page.getByRole("textbox", { name: "Password" }).fill("TestAdmin2026!");

  // Click login
  await page.getByRole("button", { name: /Access Portal/i }).click();

  // Wait for navigation
  await page.waitForURL("**/admin**", { timeout: 30000 });

  // Verify we're on admin page - check for common admin elements
  const body = page.locator("body");
  await expect(body).toContainText(/admin|command center|dashboard/i, { timeout: 10000 });

  console.log("✅ Login and dashboard access working");
});
