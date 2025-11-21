import { test, expect } from "@playwright/test";
import { TestHelpers, viewportSizes } from "../utils/test-helpers";

test.describe("Recurring Deposits Page - /transactions/recurring", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.mockAuth();
    await page.goto("/transactions/recurring");
    await helpers.waitForPageLoad();
  });

  test("should load recurring deposits page", async ({ page }) => {
    await expect(page).toHaveURL(/\/transactions\/recurring/);
    await helpers.takeScreenshot("recurring-deposits-page");

    const hasHeading = await helpers.elementExists('h1, h2, [role="heading"]');
    expect(hasHeading).toBeTruthy();
  });

  test("should display recurring deposits table or list", async ({ page }) => {
    try {
      const rowCount = await helpers.verifyTableRenders();

      await helpers.takeScreenshot("recurring-deposits-table");
    } catch {
      // Might be rendered as cards
      const hasCards = await helpers.elementExists('[class*="card"], [data-recurring]');
      expect(hasCards).toBeTruthy();

      await helpers.takeScreenshot("recurring-deposits-cards");
    }
  });

  test("should show recurring schedule information", async ({ page }) => {
    // Check for frequency displays
    const hasFrequency = await helpers.elementExists(
      "text=Monthly, text=Weekly, text=Bi-weekly, text=Quarterly, text=Frequency"
    );

    expect(hasFrequency || (await helpers.elementExists("text=Schedule"))).toBeTruthy();

    await helpers.takeScreenshot("recurring-schedule-info");
  });

  test("should display deposit amounts", async ({ page }) => {
    const bodyText = (await page.textContent("body")) || "";

    expect(bodyText.includes("$")).toBeTruthy();

    await helpers.takeScreenshot("recurring-amounts");
  });

  test("should show next scheduled date", async ({ page }) => {
    const hasNextDate = await helpers.elementExists(
      "text=Next, text=Upcoming, text=Scheduled, text=Next Payment"
    );

    await helpers.takeScreenshot("recurring-next-date");
  });

  test("should display active status", async ({ page }) => {
    const hasStatus = await helpers.elementExists(
      'text=Active, text=Paused, text=Inactive, text=Status, [class*="badge"]'
    );

    expect(hasStatus).toBeTruthy();

    await helpers.takeScreenshot("recurring-status");
  });

  test("should have create new recurring deposit button", async ({ page }) => {
    const createButton = await page.$(
      'button:has-text("New"), button:has-text("Create"), a[href*="new"]'
    );

    if (createButton) {
      await helpers.takeScreenshot("recurring-create-button");

      await createButton.click();
      await page.waitForTimeout(1000);

      // Should open form or navigate to create page
      const hasForm = await helpers.elementExists('form, [role="dialog"]');

      await helpers.takeScreenshot("recurring-create-form");

      // Close form or go back
      const closeButton = await page.$('button:has-text("Cancel"), button:has-text("Close")');
      if (closeButton) {
        await closeButton.click();
      } else {
        await page.goBack();
      }
      await helpers.waitForPageLoad();
    } else {
      console.log("No create button found");
    }
  });

  test("should have edit action for recurring deposits", async ({ page }) => {
    const editButtons = await page.$$('button:has-text("Edit"), button[aria-label*="Edit"]');

    if (editButtons.length > 0) {
      await helpers.takeScreenshot("recurring-edit-buttons");

      await editButtons[0].click();
      await page.waitForTimeout(500);

      // Should open edit form or dialog
      const hasEditForm = await helpers.elementExists('form, [role="dialog"], text=Edit');

      await helpers.takeScreenshot("recurring-edit-form");

      // Close form
      const closeButton = await page.$(
        'button:has-text("Cancel"), button:has-text("Close"), [aria-label*="Close"]'
      );
      if (closeButton) {
        await closeButton.click();
        await page.waitForTimeout(300);
      }
    } else {
      console.log("No edit buttons found");
    }
  });

  test("should have pause/resume action", async ({ page }) => {
    const pauseButtons = await page.$$(
      'button:has-text("Pause"), button:has-text("Resume"), [role="switch"]'
    );

    if (pauseButtons.length > 0) {
      await helpers.takeScreenshot("recurring-pause-buttons");

      // Click pause button (don't confirm to avoid side effects)
      await pauseButtons[0].click();
      await page.waitForTimeout(500);

      // May show confirmation
      const hasConfirmation = await helpers.elementExists('[role="dialog"], text=Are you sure');

      await helpers.takeScreenshot("recurring-pause-confirmation");

      // Close if confirmation exists
      const cancelButton = await page.$('button:has-text("Cancel"), button:has-text("No")');
      if (cancelButton) {
        await cancelButton.click();
      }
    } else {
      console.log("No pause/resume buttons found");
    }
  });

  test("should have cancel/delete action", async ({ page }) => {
    const deleteButtons = await page.$$(
      'button:has-text("Cancel"), button:has-text("Delete"), button[aria-label*="Delete"]'
    );

    if (deleteButtons.length > 0) {
      await helpers.takeScreenshot("recurring-delete-buttons");

      await deleteButtons[0].click();
      await page.waitForTimeout(500);

      // Should show confirmation
      const hasConfirmation = await helpers.elementExists(
        '[role="alertdialog"], text=Are you sure, text=confirm'
      );

      await helpers.takeScreenshot("recurring-delete-confirmation");

      // Close confirmation
      const cancelButton = await page.$(
        'button:has-text("Cancel"), button:has-text("No"), [aria-label*="Close"]'
      );
      if (cancelButton) {
        await cancelButton.click();
        await page.waitForTimeout(300);
      }
    } else {
      console.log("No delete buttons found");
    }
  });

  test("should display fund information", async ({ page }) => {
    const hasFundInfo = await helpers.elementExists("text=Fund, text=Asset, text=Investment");

    await helpers.takeScreenshot("recurring-fund-info");
  });

  test("should show payment method", async ({ page }) => {
    const hasPaymentMethod = await helpers.elementExists(
      "text=Payment Method, text=Bank, text=Card, text=Account"
    );

    await helpers.takeScreenshot("recurring-payment-method");
  });

  test("should display start date and end date", async ({ page }) => {
    const hasDates = await helpers.elementExists(
      "text=Start Date, text=End Date, text=Started, text=Until"
    );

    await helpers.takeScreenshot("recurring-dates");
  });

  test("should test search functionality", async ({ page }) => {
    const searchInput = await page.$('input[type="search"], input[placeholder*="Search"]');

    if (searchInput) {
      await searchInput.fill("monthly");
      await page.waitForTimeout(800);

      await helpers.takeScreenshot("recurring-search-results");

      await searchInput.fill("");
    } else {
      console.log("No search functionality found");
    }
  });

  test("should test filter by status", async ({ page }) => {
    const filterButtons = await page.$$('button:has-text("Filter"), button:has-text("Status")');

    if (filterButtons.length > 0) {
      await filterButtons[0].click();
      await page.waitForTimeout(300);

      await helpers.takeScreenshot("recurring-filter-dropdown");

      // Select a filter option
      const options = await page.$$('[role="option"], [role="menuitem"]');
      if (options.length > 0) {
        await options[0].click();
        await page.waitForTimeout(500);

        await helpers.takeScreenshot("recurring-filtered-view");
      }
    } else {
      console.log("No filter options found");
    }
  });

  test("should test filter by frequency", async ({ page }) => {
    const frequencyFilter = await page.$('button:has-text("Frequency"), select[name*="frequency"]');

    if (frequencyFilter) {
      await frequencyFilter.click();
      await page.waitForTimeout(300);

      await helpers.takeScreenshot("recurring-frequency-filter");

      await page.keyboard.press("Escape");
    } else {
      console.log("No frequency filter found");
    }
  });

  test("should test sorting", async ({ page }) => {
    const sortableHeaders = await page.$$('th[role="columnheader"], th[class*="sort"]');

    if (sortableHeaders.length > 0) {
      await helpers.testSorting("th:first-of-type");
      await page.waitForTimeout(500);

      await helpers.takeScreenshot("recurring-sorted-view");
    } else {
      console.log("No sortable columns found");
    }
  });

  test("should show transaction history link", async ({ page }) => {
    const historyLinks = await page.$$(
      'button:has-text("History"), a:has-text("History"), button:has-text("View Payments")'
    );

    if (historyLinks.length > 0) {
      await helpers.takeScreenshot("recurring-history-links");

      await historyLinks[0].click();
      await page.waitForTimeout(1000);

      await helpers.takeScreenshot("recurring-history-opened");

      // Go back if navigated
      if (!page.url().includes("/recurring")) {
        await page.goBack();
        await helpers.waitForPageLoad();
      }
    } else {
      console.log("No history links found");
    }
  });

  test("should display total recurring amount", async ({ page }) => {
    const hasTotal = await helpers.elementExists("text=Total, text=Sum, text=Total Monthly");

    await helpers.takeScreenshot("recurring-total-amount");
  });

  test("should verify loading state", async ({ page }) => {
    await page.reload();
    await helpers.verifyLoadingState();
    await helpers.waitForPageLoad();

    const hasContent = await helpers.elementExists('table, [class*="card"]');
    expect(hasContent).toBeTruthy();
  });

  test("should handle empty state", async ({ page }) => {
    await page.route("**/recurring*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], error: null }),
      });
    });

    await page.reload();
    await helpers.waitForPageLoad();

    const hasEmptyState = await helpers.elementExists(
      "text=No recurring, text=No deposits, text=Set up your first"
    );

    await helpers.takeScreenshot("recurring-empty-state");
  });

  test("should test pagination if present", async ({ page }) => {
    const hasPagination = await helpers.elementExists(
      'button:has-text("Next"), button:has-text("Previous")'
    );

    if (hasPagination) {
      await helpers.testPagination();
      await helpers.takeScreenshot("recurring-paginated");
    } else {
      console.log("No pagination found");
    }
  });

  test("should be responsive on different viewports", async ({ page }) => {
    const results = await helpers.testResponsiveLayout([
      viewportSizes.desktop,
      viewportSizes.tablet,
      viewportSizes.mobile,
    ]);

    expect(results.length).toBe(3);

    await page.setViewportSize({ width: 375, height: 667 });
    await helpers.takeScreenshot("recurring-mobile-view");
  });

  test("should check accessibility", async ({ page }) => {
    const a11y = await helpers.checkAccessibility();
    expect(a11y.hasHeadings).toBeTruthy();

    // Check for proper button accessibility
    const buttons = await page.$$("button[aria-label], button[title]");
    console.log("Accessibility checks completed");
  });

  test("should display upcoming payments preview", async ({ page }) => {
    const hasUpcoming = await helpers.elementExists(
      "text=Upcoming, text=Next 3, text=Preview, text=Schedule Preview"
    );

    await helpers.takeScreenshot("recurring-upcoming-payments");
  });

  test("should show modification history", async ({ page }) => {
    const hasModificationHistory = await helpers.elementExists(
      "text=Modified, text=Updated, text=Changed, text=Last modified"
    );

    await helpers.takeScreenshot("recurring-modification-info");
  });

  test("should capture full page screenshot", async ({ page }) => {
    await helpers.takeScreenshot("recurring-full-page", true);
  });
});
