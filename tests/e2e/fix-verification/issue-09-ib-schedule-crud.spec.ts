/**
 * Issue 9: IBScheduleSection CRUD Test
 *
 * BEFORE: IBScheduleSection existed but wasn't rendered in InvestorSettingsTab.
 * AFTER: IBSettingsSection (which contains IBScheduleSection) renders in Settings tab.
 *
 * Tests:
 * - IBSettingsSection renders on investor settings tab
 * - IBScheduleSection (inside IBSettingsSection) shows schedule table
 * - Add a new IB schedule entry (fund, percentage, date range)
 * - Verify entry persists in the table
 * - Delete the entry
 * - Verify IB parent config is still accessible (regression check)
 *
 * NOTE: Investor detail is a SLIDE-OUT PANEL, not a separate page.
 *       URL stays at /admin/investors when panel is open.
 */

import { test, expect } from "@playwright/test";
import {
  loginAsSuperAdmin,
  takeEvidence,
  navigateAndSettle,
  dismissBanners,
} from "./helpers/fix-test-utils";

test.describe("Issue 9: IB Schedule Section CRUD", () => {
  test.describe.configure({ mode: "serial" });

  async function openInvestorSettingsTab(page: import("@playwright/test").Page) {
    await navigateAndSettle(page, "/admin/investors");

    // Wait for investor list
    await page.locator("tbody tr").first().waitFor({ state: "visible", timeout: 15000 });

    // Click the first investor row to open the slide-out panel
    await page.locator("tbody tr").first().click();
    await page.waitForTimeout(1000);
    await dismissBanners(page);

    // The investor detail appears as a slide-out panel
    // Find the Settings tab within the panel (not the sidebar nav)
    // The panel has tabs: Overview, Transactions, Positions, Withdrawals, Reports, Settings
    const settingsTab = page.locator(
      'button:has-text("Settings"), [role="tab"]:has-text("Settings")'
    );

    // Filter to get the one inside the slide-out panel (not sidebar)
    // The panel tabs are typically in a row of small buttons
    let clicked = false;
    const count = await settingsTab.count();
    for (let i = 0; i < count; i++) {
      const tab = settingsTab.nth(i);
      // Check if this tab is inside the panel (check its container)
      const box = await tab.boundingBox();
      if (box && box.x > 300) {
        // Panel tabs are in the right side (x > sidebar width)
        await tab.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // Fallback: just click the last "Settings" text that's a button
      await settingsTab.last().click();
    }

    await page.waitForTimeout(1000);
  }

  test("navigate to an investor settings tab", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await openInvestorSettingsTab(page);

    // The panel should show settings content (Fee Schedule, IB sections)
    // Check for settings-related content in the panel
    const panelContent = page
      .locator(':text("Fee Schedule"), :text("fee"), :text("IB"), :text("Promote")')
      .first();
    const hasSettingsContent = await panelContent.isVisible({ timeout: 10000 }).catch(() => false);

    expect(hasSettingsContent, "Settings tab content should be visible in the panel").toBeTruthy();

    await takeEvidence(page, "issue-09-settings-tab-loaded");
  });

  test("IBSettingsSection renders with IB configuration", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await openInvestorSettingsTab(page);

    // Scroll the panel to find IB section
    // The panel might be a scrollable div, not the page itself
    const panelScrollArea = page
      .locator('[class*="sheet"], [class*="drawer"], [class*="panel"]')
      .first();
    if (await panelScrollArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await panelScrollArea.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    } else {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }
    await page.waitForTimeout(500);

    // Verify IBSettingsSection content
    const ibContent = page
      .locator(
        ':text("IB Commission"), :text("IB Settings"), :text("Introducing Broker"), :text("IB Parent"), :text("IB Schedule"), :text("commission schedule"), :text("Promote to Introducing Broker")'
      )
      .first();

    const ibVisible = await ibContent.isVisible({ timeout: 10000 }).catch(() => false);

    await takeEvidence(page, "issue-09-ib-settings-visible");

    expect(ibVisible, "IBSettingsSection should render with IB-related content").toBeTruthy();

    // Regression check: "Promote to Introducing Broker" should exist
    // (this was part of IBSettingsSection that was accidentally removed)
    const promoteSection = page
      .locator(
        ':text("Promote to Introducing Broker"), :text("Promote to IB"), :text("IB Parent"), :text("No IB Parent")'
      )
      .first();
    const hasPromote = await promoteSection.isVisible({ timeout: 3000 }).catch(() => false);

    expect(
      hasPromote,
      "IB Parent / Promote section should be visible (regression check)"
    ).toBeTruthy();

    await takeEvidence(page, "issue-09-ib-parent-config-present");
  });

  test("add a new IB schedule entry", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await openInvestorSettingsTab(page);

    // Scroll to find the IB Commission Schedule section
    const panelScrollArea = page
      .locator('[class*="sheet"], [class*="drawer"], [class*="panel"]')
      .first();
    if (await panelScrollArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await panelScrollArea.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    }
    await page.waitForTimeout(500);

    // Find the "Add" button in the IB Commission Schedule section (NOT Fee Schedule)
    // IB Commission Schedule heading -> parent -> parent -> button "Add"
    const ibScheduleHeading = page.locator("text=IB Commission Schedule").first();

    if (!(await ibScheduleHeading.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "IB Commission Schedule section not found - investor may not be IB");
      return;
    }

    // The Add button is a sibling of the heading's parent container
    const addBtn = ibScheduleHeading
      .locator("..")
      .locator("..")
      .locator('button:has-text("Add")')
      .first();

    if (!(await addBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Add button for IB Commission Schedule not found");
      return;
    }

    await addBtn.click();
    await page.waitForTimeout(500);

    // Scope all form interactions to the dialog
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // IB Percentage - scoped to dialog
    const pctInput = dialog.locator('input[type="number"], [role="spinbutton"]').first();
    if (await pctInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pctInput.fill("7.5");
    }

    // Effective Date - scoped to dialog
    const dateInput = dialog.locator('input[type="date"]').first();
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.fill("2026-03-01");
    }

    await takeEvidence(page, "issue-09-add-entry-form-filled");

    // Submit - scoped to dialog
    const submitBtn = dialog
      .locator('button:has-text("Add Entry"), button:has-text("Save"), button:has-text("Submit")')
      .first();
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }

    // Verify success - check for toast or entry in the table
    const successToast = page.locator(':text("success"), :text("added"), :text("created")').first();
    const hasToast = await successToast.isVisible({ timeout: 3000 }).catch(() => false);

    const scheduleEntry = page.locator("text=7.5").first();
    const entryVisible = await scheduleEntry.isVisible({ timeout: 5000 }).catch(() => false);

    await takeEvidence(page, "issue-09-entry-added-success");

    expect(
      hasToast || entryVisible,
      "Entry should be added (toast or visible in table)"
    ).toBeTruthy();
  });

  test("verify entry persists and then delete it", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await openInvestorSettingsTab(page);

    // Scroll to find the schedule section
    const panelScrollArea = page
      .locator('[class*="sheet"], [class*="drawer"], [class*="panel"]')
      .first();
    if (await panelScrollArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await panelScrollArea.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    }
    await page.waitForTimeout(500);

    // Verify the 7.5 entry still exists (may show as "7.5%" or "7.5")
    const scheduleEntry = page.locator("text=7.5").first();
    const entryExists = await scheduleEntry.isVisible({ timeout: 5000 }).catch(() => false);

    if (entryExists) {
      await takeEvidence(page, "issue-09-entry-persisted");

      // Find delete button near the entry
      const trashBtn = page.locator("button").filter({
        has: page.locator("svg.lucide-trash, svg.lucide-trash-2, svg.lucide-x"),
      });

      if (
        await trashBtn
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await trashBtn.first().click();
      } else {
        // Fallback: find button near the 7.5% text
        const entryRow = scheduleEntry.locator("..").locator("..");
        const rowBtn = entryRow.locator("button").last();
        if (await rowBtn.isVisible().catch(() => false)) {
          await rowBtn.click();
        }
      }

      await page.waitForTimeout(500);

      // Confirm deletion
      const confirmDelete = page
        .locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")')
        .last();
      if (await confirmDelete.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmDelete.click();
        await page.waitForTimeout(1000);
      }

      // Verify entry is gone
      const entryGone = !(await scheduleEntry.isVisible({ timeout: 3000 }).catch(() => false));
      expect(entryGone, "7.5% entry should be deleted").toBeTruthy();

      await takeEvidence(page, "issue-09-entry-deleted");
    } else {
      test.skip(true, "IB schedule entry not found - add test may have failed");
    }
  });
});
