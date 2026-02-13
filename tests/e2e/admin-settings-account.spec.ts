/**
 * Admin Settings - Account Tab E2E Tests
 *
 * Tests the Admin Settings page with focus on the new "Account" tab:
 *   - Profile editing (reused ProfileTab component)
 *   - Password change (SecurityTab)
 *   - Tab navigation across all 5 tabs
 *   - Admin routing (get_user_admin_status RPC)
 */
import { test, expect } from "@playwright/test";

test.describe("Admin Settings – Account Tab", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin settings – requires admin auth
    await page.goto("/admin/settings");
    // Wait for page to load, expect admin routing to resolve
    await page.waitForSelector("text=Settings", { timeout: 15000 });
  });

  test("admin settings page renders with 5 tabs", async ({ page }) => {
    await expect(page.locator("h1", { hasText: "Settings" })).toBeVisible();
    await expect(page.locator("text=Platform configuration and admin management")).toBeVisible();

    // Verify all 5 tabs exist
    await expect(page.locator("button[role='tab']", { hasText: "General" })).toBeVisible();
    await expect(page.locator("button[role='tab']", { hasText: "Notifications" })).toBeVisible();
    await expect(page.locator("button[role='tab']", { hasText: "Limits" })).toBeVisible();
    await expect(page.locator("button[role='tab']", { hasText: "Admins" })).toBeVisible();
    await expect(page.locator("button[role='tab']", { hasText: "Account" })).toBeVisible();
  });

  test("Account tab renders ProfileTab and SecurityTab", async ({ page }) => {
    // Click Account tab
    await page.locator("button[role='tab']", { hasText: "Account" }).click();

    // Should show profile card (ProfileTab)
    await expect(page.locator("text=Personal Information")).toBeVisible();
    await expect(page.locator("text=Your personal details")).toBeVisible();

    // Should show security card (SecurityTab)
    await expect(page.locator("text=Password")).toBeVisible();
    await expect(page.locator("text=Manage your password")).toBeVisible();
  });

  test("Account tab profile fields are editable", async ({ page }) => {
    await page.locator("button[role='tab']", { hasText: "Account" }).click();

    const firstName = page.locator("#firstName");
    const lastName = page.locator("#lastName");
    const phone = page.locator("#phone");

    await expect(firstName).toBeVisible();
    await expect(lastName).toBeVisible();
    await expect(phone).toBeVisible();

    await expect(firstName).toBeEditable();
    await expect(lastName).toBeEditable();
    await expect(phone).toBeEditable();
  });

  test("Account tab save button responds to changes", async ({ page }) => {
    await page.locator("button[role='tab']", { hasText: "Account" }).click();

    const firstName = page.locator("#firstName");
    const saveButton = page.locator("button", { hasText: "Save Changes" }).last();

    await expect(saveButton).toBeDisabled();

    // Modify first name
    const currentValue = await firstName.inputValue();
    await firstName.clear();
    await firstName.fill(currentValue + " Test");

    await expect(saveButton).toBeEnabled();

    // Revert
    await firstName.clear();
    await firstName.fill(currentValue);
    await expect(saveButton).toBeDisabled();
  });

  test("Account tab password change dialog opens", async ({ page }) => {
    await page.locator("button[role='tab']", { hasText: "Account" }).click();

    // Click Update Password
    await page.locator("button", { hasText: "Update Password" }).click();

    // Dialog should open with password fields
    await expect(page.locator("text=Change Password").first()).toBeVisible();
    await expect(page.locator("#current-password")).toBeVisible();
    await expect(page.locator("#new-password")).toBeVisible();
    await expect(page.locator("#confirm-password")).toBeVisible();
  });

  test("General tab has platform settings", async ({ page }) => {
    // General is the default tab
    await expect(page.locator("text=General Settings")).toBeVisible();
    await expect(page.locator("#platform_name")).toBeVisible();
    await expect(page.locator("text=Maintenance Mode")).toBeVisible();
    await expect(page.locator("text=Allow New Registrations")).toBeVisible();
  });

  test("navigates between all 5 tabs correctly", async ({ page }) => {
    // Notifications tab
    await page.locator("button[role='tab']", { hasText: "Notifications" }).click();
    await expect(page.locator("text=Notification Settings")).toBeVisible();
    await expect(page.locator("#notification_email")).toBeVisible();

    // Limits tab
    await page.locator("button[role='tab']", { hasText: "Limits" }).click();
    await expect(page.locator("text=Transaction Limits")).toBeVisible();
    await expect(page.locator("#min_deposit")).toBeVisible();

    // Admins tab
    await page.locator("button[role='tab']", { hasText: "Admins" }).click();
    // May show admin management or super-admin guard message
    const adminContent = page
      .locator("text=Admin Management")
      .or(page.locator("text=Only Super Admins can manage administrators"));
    await expect(adminContent.first()).toBeVisible();

    // Account tab
    await page.locator("button[role='tab']", { hasText: "Account" }).click();
    await expect(page.locator("text=Personal Information")).toBeVisible();
  });
});

test.describe("Admin Routing – Nathanael Scenario", () => {
  test("admin page loads without redirect to investor portal", async ({ page }) => {
    // This test verifies that the admin route resolves correctly
    // During the outage, get_user_admin_status RPC fails → defaults to non-admin → redirect
    // When Supabase is back, this should work correctly
    await page.goto("/admin/settings");

    // Should NOT redirect to investor portal
    await page.waitForURL(/.*/, { timeout: 15000 });
    const url = page.url();
    expect(url).not.toContain("/investor");

    // Should show admin settings page
    await expect(page.locator("h1", { hasText: "Settings" })).toBeVisible();
  });
});
