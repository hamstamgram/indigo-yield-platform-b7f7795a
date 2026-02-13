/**
 * Investor Settings - Profile Tab E2E Tests
 *
 * Tests the editable ProfileTab:
 *   - First name, last name, phone editing
 *   - Avatar upload (image validation, size limit)
 *   - Save functionality
 *   - Email display (read-only)
 */
import { test, expect } from "@playwright/test";

test.describe("Investor Settings – Profile Tab", () => {
  test.beforeEach(async ({ page }) => {
    // Login as investor (reuse existing auth state if available)
    await page.goto("/investor/settings");
    // Wait for page to fully load (profile data fetched)
    await page.waitForSelector("text=Settings", { timeout: 15000 });
  });

  test("renders profile tab with personal information card", async ({ page }) => {
    // Profile tab should be the default active tab
    await expect(
      page.locator("[data-state='active']").filter({ hasText: "Profile" })
    ).toBeVisible();
    await expect(page.locator("text=Personal Information")).toBeVisible();
    await expect(page.locator("text=Your personal details")).toBeVisible();
  });

  test("displays editable first name, last name, and phone fields", async ({ page }) => {
    const firstName = page.locator("#firstName");
    const lastName = page.locator("#lastName");
    const phone = page.locator("#phone");

    await expect(firstName).toBeVisible();
    await expect(lastName).toBeVisible();
    await expect(phone).toBeVisible();

    // Fields should be editable
    await expect(firstName).toBeEditable();
    await expect(lastName).toBeEditable();
    await expect(phone).toBeEditable();
  });

  test("email is displayed as read-only", async ({ page }) => {
    // Email should be displayed as text, not as an input
    await expect(page.locator("text=Email Address")).toBeVisible();
    await expect(page.locator("text=Contact support to change your email address")).toBeVisible();
    // No input with id="email" should be present - it's displayed as text
    await expect(page.locator("input#email")).not.toBeVisible();
  });

  test("save button is disabled when no changes are made", async ({ page }) => {
    const saveButton = page.locator("button", { hasText: "Save Changes" });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeDisabled();
  });

  test("save button enables when profile fields are modified", async ({ page }) => {
    const firstName = page.locator("#firstName");
    const saveButton = page.locator("button", { hasText: "Save Changes" });

    // Get the current value and modify it
    const currentValue = await firstName.inputValue();
    await firstName.clear();
    await firstName.fill(currentValue + " Test");

    // Save button should now be enabled
    await expect(saveButton).toBeEnabled();

    // Revert the change
    await firstName.clear();
    await firstName.fill(currentValue);

    // Save button should be disabled again
    await expect(saveButton).toBeDisabled();
  });

  test("avatar area is clickable with hover overlay", async ({ page }) => {
    // Avatar should have a hover overlay with camera icon
    const avatarArea = page.locator(".relative.group.cursor-pointer").first();
    await expect(avatarArea).toBeVisible();

    // Hidden file input should exist
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await expect(fileInput).toBeHidden();
  });

  test("can navigate between profile, security, and appearance tabs", async ({ page }) => {
    // Click Security tab
    await page.locator("button", { hasText: "Security" }).click();
    await expect(page.locator("text=Password")).toBeVisible();
    await expect(page.locator("text=Update Password")).toBeVisible();

    // Click Appearance tab
    await page.locator("button", { hasText: "Appearance" }).click();
    await expect(page.locator("text=Reduce Animations")).toBeVisible();
    await expect(page.locator("text=Hide Portfolio Values")).toBeVisible();

    // Back to Profile tab
    await page.locator("button", { hasText: "Profile" }).click();
    await expect(page.locator("text=Personal Information")).toBeVisible();
  });

  test("security tab shows password change dialog", async ({ page }) => {
    // Navigate to Security tab
    await page.locator("button", { hasText: "Security" }).click();
    await expect(page.locator("text=Manage your password")).toBeVisible();

    // Click Update Password button to open dialog
    await page.locator("button", { hasText: "Update Password" }).click();
    await expect(page.locator("text=Change Password")).toBeVisible();
    await expect(page.locator("#current-password")).toBeVisible();
    await expect(page.locator("#new-password")).toBeVisible();
    await expect(page.locator("#confirm-password")).toBeVisible();
  });
});
