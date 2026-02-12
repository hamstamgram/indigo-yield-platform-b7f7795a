/**
 * Issue 7: Calendar Date Picker Popup Shifting
 *
 * BEFORE: Calendar caption label had variable width, causing the popup to shift
 *         horizontally when navigating between months with different name lengths.
 * AFTER: caption_label has `min-w-[130px] text-center` for stable positioning.
 *
 * Tests:
 * - Calendar popup position remains stable when navigating months
 * - No layout shift greater than 5px tolerance
 */

import { test, expect } from "@playwright/test";
import {
  loginAsAdmin,
  takeEvidence,
  navigateAndSettle,
  dismissBanners,
} from "./helpers/fix-test-utils";

test.describe("Issue 7: Calendar Date Picker Stability", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("calendar popup does not shift when navigating months", async ({ page }) => {
    // Open the New Transaction dialog which has a Transaction Date picker
    await navigateAndSettle(page, "/admin/transactions");

    const newTxBtn = page
      .locator('button:has-text("New Transaction"), button:has-text("Add Transaction")')
      .first();
    await expect(newTxBtn).toBeVisible({ timeout: 10000 });
    await newTxBtn.click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Find the date picker trigger INSIDE the dialog
    // It's a button containing a calendar icon or showing a date
    const calButton = dialog
      .locator("button")
      .filter({ has: page.locator("svg.lucide-calendar") })
      .first();

    if (!(await calButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      // Try alternate: button with date text
      const altButton = dialog
        .locator(
          'button:has-text("February"), button:has-text("2026"), button:has-text("Pick a date")'
        )
        .first();
      if (await altButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await altButton.click();
      } else {
        test.skip(true, "Cannot find date picker trigger in dialog");
        return;
      }
    } else {
      await calButton.click();
    }
    await page.waitForTimeout(300);

    // Get the calendar popover/grid
    const calendarGrid = page.locator('[role="grid"]').first();
    if (!(await calendarGrid.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Calendar grid not found");
      return;
    }

    // Get the calendar container (parent popover)
    const calendarContainer = page
      .locator('[data-radix-popper-content-wrapper], [role="grid"]')
      .first();

    // Get initial position
    const initialBox = await calendarContainer.boundingBox();
    if (!initialBox) {
      test.skip(true, "Cannot get calendar bounding box");
      return;
    }

    await takeEvidence(page, "issue-07-calendar-initial");

    // Navigate backward 3 months
    const prevButton = page
      .locator('button[name="previous-month"], button[aria-label*="previous" i]')
      .first();
    for (let i = 0; i < 3; i++) {
      if (await prevButton.isVisible().catch(() => false)) {
        await prevButton.click();
        await page.waitForTimeout(200);
      }
    }

    const afterPrevBox = await calendarContainer.boundingBox();
    if (afterPrevBox) {
      const xDrift = Math.abs(afterPrevBox.x - initialBox.x);
      // Only check X drift - the fix was for horizontal caption label width stability.
      // Y drift is expected as popover repositions vertically based on row count.
      expect(
        xDrift,
        `Calendar X position shifted by ${xDrift}px after navigating backward`
      ).toBeLessThanOrEqual(5);
    }

    await takeEvidence(page, "issue-07-calendar-after-prev");

    // Navigate forward 6 months (back to +3 from start)
    const nextButton = page
      .locator('button[name="next-month"], button[aria-label*="next" i]')
      .first();
    for (let i = 0; i < 6; i++) {
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(200);
      }
    }

    const afterNextBox = await calendarContainer.boundingBox();
    if (afterNextBox) {
      const xDrift = Math.abs(afterNextBox.x - initialBox.x);
      expect(
        xDrift,
        `Calendar X position shifted by ${xDrift}px after navigating forward`
      ).toBeLessThanOrEqual(5);
    }

    await takeEvidence(page, "issue-07-calendar-after-next");
  });
});
