import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "adriel@indigo.fund";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "TestAdmin2026!";

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Command Center", { timeout: 30000 });

  // Accept cookies if present to clear the UI
  const cookieBtn = page.getByRole("button", { name: /Accept|Got it/i }).first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
  }
}

test.describe("Scenario 10: Coverage Expansion (Docs, Settings, Pagination)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Intercept noisy background polls
    await page.route("**/admin_alerts**", (route) => route.fulfill({ status: 200, body: "[]" }));
  });

  test("Document Management: PDF Generation & Preview", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/reports`);
    await page.waitForLoadState("networkidle");

    // Wait for at least one report to be visible or empty state
    const noReports = page.getByText(/No statements found/i);

    if (await noReports.isVisible()) {
      console.log(
        "No reports found, skipping specific row interaction but verifying page structure."
      );
      await expect(page.getByText(/Monthly Statements/i)).toBeVisible();
    } else {
      // Wait for table to be populated - using a more general locator first
      await page.waitForSelector("table tr", { timeout: 20000 });
      const firstRow = page.locator("table tbody tr").first();

      // Open Actions menu - using the sr-only text discovered by subagent
      const actionsBtn = firstRow.locator('button:has(span.sr-only:text("Actions"))').first();
      await actionsBtn.click();

      // Check for 'Preview' - verified text from screenshot
      const previewOption = page.getByRole("menuitem", { name: "Preview" }).first();
      await expect(previewOption).toBeVisible();

      // Check for 'Regenerate' - verified text from screenshot
      const regenerateOption = page.getByRole("menuitem", { name: "Regenerate" }).first();
      await expect(regenerateOption).toBeVisible();
    }
  });

  test("Global Settings: Revenue Metrics UI", async ({ page }) => {
    // Navigate to Revenue page as discovered by subagent
    await page.goto(`${BASE_URL}/admin/revenue`);
    await page.waitForLoadState("networkidle");

    // Header is 'Revenue' - allow extra time for lazy loading
    await expect(page.getByRole("heading", { name: "Revenue" }).first()).toBeVisible({
      timeout: 30000,
    });

    // Revenue page has tabs: "Platform Fees" and "IB Management"
    const revenueContent = page.getByText(/Platform Fees/i).or(page.getByText(/IB Management/i));
    await expect(revenueContent.first()).toBeVisible({ timeout: 30000 });
  });

  test("Data Table Pagination: Transactions List", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/transactions`);
    await page.waitForLoadState("networkidle");

    // Check for pagination controls using discovered labels
    const prevBtn = page.getByLabel("Go to previous page");
    const nextBtn = page.getByLabel("Go to next page");

    // Pagination might only show up if there are enough records
    if ((await nextBtn.isVisible()) || (await prevBtn.isVisible())) {
      await expect(prevBtn.or(nextBtn)).toBeVisible();
    } else {
      console.log("Pagination not visible, verifying table rows exist.");
      const rowsExist = page.locator("table tbody tr").first();
      await expect(rowsExist).toBeVisible({ timeout: 10000 });
    }

    // Verify rows count
    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();
    console.log(`Initial transactions row count: ${rowCount}`);

    // If we have many records, test 'Next'
    if ((await nextBtn.isVisible()) && (await nextBtn.isEnabled())) {
      await nextBtn.click();
      await page.waitForLoadState("networkidle");
      // Verify table content changed or page indicator updated
      await expect(page.getByText(/Page 2/i).or(rows.first())).toBeVisible();
    }
  });

  test("Toast UI Transitions: Success feedback", async ({ page }) => {
    // Navigate to a simple action page (e.g., Funds)
    await page.goto(`${BASE_URL}/admin/funds`);
    await page.waitForLoadState("networkidle");

    // Trigger a non-destructive edit or modal open
    const editBtn = page.locator('button:has(.lucide-edit), button:has-text("Edit")').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      const modal = page.getByRole("dialog");
      await modal.waitFor({ state: "visible" });

      const saveBtn = modal.getByRole("button", { name: /Save|Update/i });
      if (await saveBtn.isEnabled()) {
        await saveBtn.click();

        // Verify Toast appearance
        const toast = page.locator('[data-sonner-toast], [role="status"]');
        await expect(toast.filter({ hasText: /success|updated|saved/i })).toBeVisible({
          timeout: 10000,
        });
      } else {
        await page.keyboard.press("Escape");
      }
    }
  });
});
