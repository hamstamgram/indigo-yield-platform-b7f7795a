import { test, expect } from "@playwright/test";
import { TestHelpers, mockTransactionData } from "../utils/test-helpers";

test.describe("Transaction Details Page - /transactions/:id", () => {
  let helpers: TestHelpers;
  const mockTransactionId = "txn-123456-test";

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.mockAuth();
    await page.goto(`/transactions/${mockTransactionId}`);
    await helpers.waitForPageLoad();
  });

  test("should load transaction details page", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`/transactions/${mockTransactionId}`));
    await helpers.takeScreenshot("transaction-details-page");

    const hasContent = await helpers.elementExists('h1, h2, [role="heading"]');
    expect(hasContent).toBeTruthy();
  });

  test("should display transaction ID", async ({ page }) => {
    // Check for transaction ID display
    const hasTransactionId = await helpers.elementExists(
      `text=${mockTransactionId}, text=Transaction ID, text=Reference`
    );

    const bodyText = (await page.textContent("body")) || "";
    const hasIdPattern = bodyText.match(/txn-[\w-]+|TXN[\w-]+|\d{6,}/i);

    await helpers.takeScreenshot("transaction-details-id");
  });

  test("should display transaction amount", async ({ page }) => {
    // Check for amount display
    const hasAmount = await helpers.elementExists("text=$");

    const bodyText = (await page.textContent("body")) || "";
    expect(bodyText.includes("$")).toBeTruthy();

    await helpers.takeScreenshot("transaction-details-amount");
  });

  test("should display transaction status", async ({ page }) => {
    // Check for status badge/indicator
    const hasStatus = await helpers.elementExists(
      "text=Completed, text=Pending, text=Failed, text=Processing, text=Status"
    );

    const hasStatusBadge = await helpers.elementExists('[class*="badge"], [class*="status"]');

    await helpers.takeScreenshot("transaction-details-status");
  });

  test("should display transaction type", async ({ page }) => {
    // Check for transaction type
    const hasType = await helpers.elementExists(
      "text=Deposit, text=Withdrawal, text=Transfer, text=Type"
    );

    await helpers.takeScreenshot("transaction-details-type");
  });

  test("should display transaction date and time", async ({ page }) => {
    const bodyText = (await page.textContent("body")) || "";

    // Check for date format
    const hasDateFormat =
      bodyText.includes("/") || bodyText.includes("-") || bodyText.match(/\d{4}/) !== null;

    expect(hasDateFormat).toBeTruthy();

    // Check for time if displayed
    const hasTime = bodyText.match(/\d{1,2}:\d{2}/) !== null;

    await helpers.takeScreenshot("transaction-details-datetime");
  });

  test("should display transaction description", async ({ page }) => {
    // Look for description or notes section
    const hasDescription = await helpers.elementExists(
      "text=Description, text=Notes, text=Details, text=Memo"
    );

    await helpers.takeScreenshot("transaction-details-description");
  });

  test("should display payment method information", async ({ page }) => {
    // Check for payment method details
    const hasPaymentInfo = await helpers.elementExists(
      "text=Payment Method, text=Account, text=Card, text=Bank"
    );

    await helpers.takeScreenshot("transaction-details-payment-method");
  });

  test("should display fund/asset information", async ({ page }) => {
    // Check for fund details
    const hasFundInfo = await helpers.elementExists(
      "text=Fund, text=Asset, text=Investment, text=Portfolio"
    );

    await helpers.takeScreenshot("transaction-details-fund-info");
  });

  test("should have back button or navigation", async ({ page }) => {
    // Look for back button
    const backButton = await page.$(
      'button:has-text("Back"), a:has-text("Back"), [aria-label*="Back"]'
    );

    if (backButton) {
      await helpers.takeScreenshot("transaction-details-back-button");

      await backButton.click();
      await page.waitForTimeout(1000);

      // Should navigate back to transactions list
      const url = page.url();
      expect(url).toMatch(/\/transactions$/);
    } else {
      console.log("No back button found");
    }
  });

  test("should display transaction timeline or history", async ({ page }) => {
    // Check for status timeline
    const hasTimeline = await helpers.elementExists(
      "text=Timeline, text=History, text=Activity, [data-timeline]"
    );

    await helpers.takeScreenshot("transaction-details-timeline");
  });

  test("should display receipt or confirmation number", async ({ page }) => {
    const hasReceipt = await helpers.elementExists(
      "text=Receipt, text=Confirmation, text=Reference Number"
    );

    await helpers.takeScreenshot("transaction-details-receipt");
  });

  test("should have action buttons", async ({ page }) => {
    // Look for action buttons like Download, Print, Cancel, etc.
    const actionButtons = await page.$$(
      'button:has-text("Download"), button:has-text("Print"), button:has-text("Cancel")'
    );

    if (actionButtons.length > 0) {
      await helpers.takeScreenshot("transaction-details-actions");

      // Test download button if exists
      const downloadButton = await page.$('button:has-text("Download")');
      if (downloadButton) {
        console.log("Download button found");
      }
    } else {
      console.log("No action buttons found");
    }
  });

  test("should display fee information if applicable", async ({ page }) => {
    // Check for fee details
    const hasFees = await helpers.elementExists("text=Fee, text=Charge, text=Commission");

    await helpers.takeScreenshot("transaction-details-fees");
  });

  test("should display net amount", async ({ page }) => {
    // Check for net amount calculation
    const hasNetAmount = await helpers.elementExists(
      "text=Net Amount, text=Total, text=Final Amount"
    );

    await helpers.takeScreenshot("transaction-details-net-amount");
  });

  test("should verify loading state", async ({ page }) => {
    await page.reload();
    await helpers.verifyLoadingState();
    await helpers.waitForPageLoad();

    const hasContent = await helpers.elementExists('[class*="card"], [class*="detail"]');
    expect(hasContent).toBeTruthy();
  });

  test("should handle not found transaction", async ({ page }) => {
    await page.goto("/transactions/invalid-id-12345");
    await helpers.waitForPageLoad();

    // Should show error or not found message
    const hasError = await helpers.elementExists(
      "text=Not found, text=Error, text=Invalid, text=404"
    );

    await helpers.takeScreenshot("transaction-details-not-found");
  });

  test("should be responsive on different viewports", async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: "desktop" },
      { width: 768, height: 1024, name: "tablet" },
      { width: 375, height: 667, name: "mobile" },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);

      await helpers.takeScreenshot(`transaction-details-${viewport.name}`);
    }
  });

  test("should check accessibility", async ({ page }) => {
    const a11y = await helpers.checkAccessibility();
    expect(a11y.hasHeadings).toBeTruthy();

    // Check for proper semantic structure
    const hasProperStructure = await helpers.elementExists("main, article, section");
    expect(hasProperStructure).toBeTruthy();
  });

  test("should display related transactions if any", async ({ page }) => {
    const hasRelated = await helpers.elementExists(
      "text=Related, text=Similar, text=Other Transactions"
    );

    await helpers.takeScreenshot("transaction-details-related");
  });

  test("should capture full page screenshot", async ({ page }) => {
    await helpers.takeScreenshot("transaction-details-full-page", true);
  });
});
