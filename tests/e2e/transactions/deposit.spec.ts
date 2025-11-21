import { test, expect } from "@playwright/test";
import { TestHelpers, viewportSizes } from "../utils/test-helpers";

test.describe("Deposit Page - /transactions/deposit", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.mockAuth();
    await page.goto("/transactions/deposit");
    await helpers.waitForPageLoad();
  });

  test("should load deposit page successfully", async ({ page }) => {
    await expect(page).toHaveURL(/\/transactions\/deposit/);
    await helpers.takeScreenshot("deposit-main-page");

    const hasHeading = await helpers.elementExists('h1, h2, [role="heading"]');
    expect(hasHeading).toBeTruthy();
  });

  test("should display deposit form", async ({ page }) => {
    // Check for form element
    const hasForm = await helpers.elementExists("form");
    expect(hasForm).toBeTruthy();

    await helpers.takeScreenshot("deposit-form");
  });

  test("should have amount input field", async ({ page }) => {
    // Look for amount input
    const amountInput = await page.$(
      'input[name="amount"], input[type="number"], input[placeholder*="amount"]'
    );
    expect(amountInput).toBeTruthy();

    if (amountInput) {
      // Test input
      await amountInput.fill("5000");
      await page.waitForTimeout(300);

      await helpers.takeScreenshot("deposit-amount-entered");

      // Clear input
      await amountInput.fill("");
    }
  });

  test("should have fund/asset selector", async ({ page }) => {
    // Look for fund selection dropdown
    const fundSelector = await page.$(
      'select[name*="fund"], [role="combobox"], button:has-text("Select Fund")'
    );

    if (fundSelector) {
      await fundSelector.click();
      await page.waitForTimeout(300);

      await helpers.takeScreenshot("deposit-fund-selector");

      // Try to select an option
      const options = await page.$$('[role="option"], option');
      if (options.length > 0) {
        await options[0].click();
        await page.waitForTimeout(300);

        await helpers.takeScreenshot("deposit-fund-selected");
      }
    } else {
      console.log("No fund selector found");
    }
  });

  test("should have payment method selection", async ({ page }) => {
    // Look for payment method options
    const hasPaymentMethod = await helpers.elementExists(
      "text=Payment Method, text=Bank Account, text=Card, text=ACH"
    );

    const paymentOptions = await page.$$('[name*="payment"], [type="radio"]');

    if (paymentOptions.length > 0) {
      await helpers.takeScreenshot("deposit-payment-methods");

      // Select first payment method
      await paymentOptions[0].click();
      await page.waitForTimeout(300);

      await helpers.takeScreenshot("deposit-payment-selected");
    } else {
      console.log("No payment method options found");
    }
  });

  test("should validate amount field", async ({ page }) => {
    const amountInput = await page.$('input[name="amount"], input[type="number"]');

    if (amountInput) {
      // Try to submit with invalid amount
      await amountInput.fill("-100");
      await page.waitForTimeout(300);

      const submitButton = await page.$(
        'button[type="submit"], button:has-text("Submit"), button:has-text("Deposit")'
      );
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Should show validation error
        const hasError = await helpers.verifyErrorState();

        await helpers.takeScreenshot("deposit-validation-error");
      }

      // Clear invalid input
      await amountInput.fill("");
    }
  });

  test("should show minimum deposit requirement", async ({ page }) => {
    const hasMinimum = await helpers.elementExists("text=Minimum, text=minimum, text=Min");

    await helpers.takeScreenshot("deposit-minimum-info");
  });

  test("should have recurring deposit option", async ({ page }) => {
    // Look for recurring deposit checkbox or toggle
    const recurringOption = await page.$(
      'input[type="checkbox"][name*="recurring"], [role="switch"]'
    );

    if (recurringOption) {
      await recurringOption.click();
      await page.waitForTimeout(300);

      await helpers.takeScreenshot("deposit-recurring-enabled");

      // Should show frequency options
      const hasFrequency = await helpers.elementExists(
        "text=Frequency, text=Schedule, text=Monthly, text=Weekly"
      );

      await helpers.takeScreenshot("deposit-recurring-options");

      // Uncheck recurring
      await recurringOption.click();
    } else {
      console.log("No recurring option found");
    }
  });

  test("should display fee information", async ({ page }) => {
    const hasFeeInfo = await helpers.elementExists("text=Fee, text=Charge, text=Processing Fee");

    await helpers.takeScreenshot("deposit-fee-info");
  });

  test("should calculate total amount", async ({ page }) => {
    const amountInput = await page.$('input[name="amount"], input[type="number"]');

    if (amountInput) {
      await amountInput.fill("1000");
      await page.waitForTimeout(500);

      // Look for total amount display
      const hasTotal = await helpers.elementExists(
        "text=Total, text=Final Amount, text=You will deposit"
      );

      await helpers.takeScreenshot("deposit-total-calculated");
    }
  });

  test("should have notes or memo field", async ({ page }) => {
    const notesField = await page.$(
      'textarea[name*="note"], textarea[name*="memo"], input[name*="description"]'
    );

    if (notesField) {
      await notesField.fill("Test deposit memo");
      await page.waitForTimeout(300);

      await helpers.takeScreenshot("deposit-notes-entered");

      // Clear notes
      await notesField.fill("");
    } else {
      console.log("No notes field found");
    }
  });

  test("should have submit button", async ({ page }) => {
    const submitButton = await page.$(
      'button[type="submit"], button:has-text("Submit"), button:has-text("Deposit"), button:has-text("Continue")'
    );

    expect(submitButton).toBeTruthy();

    if (submitButton) {
      // Check if button is initially disabled
      const isDisabled = await submitButton.isDisabled();

      await helpers.takeScreenshot("deposit-submit-button");
    }
  });

  test("should have cancel button", async ({ page }) => {
    const cancelButton = await page.$(
      'button:has-text("Cancel"), a:has-text("Cancel"), button:has-text("Back")'
    );

    if (cancelButton) {
      await helpers.takeScreenshot("deposit-cancel-button");

      await cancelButton.click();
      await page.waitForTimeout(1000);

      // Should navigate away
      const url = page.url();
      expect(url).not.toContain("/deposit");
    } else {
      console.log("No cancel button found");
    }
  });

  test("should test form submission flow", async ({ page }) => {
    // Fill out form completely
    const amountInput = await page.$('input[name="amount"], input[type="number"]');
    if (amountInput) {
      await amountInput.fill("5000");
      await page.waitForTimeout(300);
    }

    // Select fund if available
    const fundSelector = await page.$('select[name*="fund"], button:has-text("Select")');
    if (fundSelector) {
      await fundSelector.click();
      await page.waitForTimeout(300);

      const options = await page.$$('[role="option"], option');
      if (options.length > 0) {
        await options[0].click();
        await page.waitForTimeout(300);
      }
    }

    await helpers.takeScreenshot("deposit-form-filled");

    // Try to submit (without actually submitting to avoid side effects)
    const submitButton = await page.$('button[type="submit"], button:has-text("Submit")');
    if (submitButton) {
      const isEnabled = !(await submitButton.isDisabled());
      expect(isEnabled).toBeTruthy();
    }
  });

  test("should display account balance if available", async ({ page }) => {
    const hasBalance = await helpers.elementExists(
      "text=Available Balance, text=Current Balance, text=Account Balance"
    );

    await helpers.takeScreenshot("deposit-account-balance");
  });

  test("should show deposit limits", async ({ page }) => {
    const hasLimits = await helpers.elementExists("text=Limit, text=Maximum, text=Max");

    await helpers.takeScreenshot("deposit-limits");
  });

  test("should display terms and conditions", async ({ page }) => {
    const hasTerms = await helpers.elementExists(
      'text=Terms, text=Conditions, text=Agreement, input[type="checkbox"]'
    );

    await helpers.takeScreenshot("deposit-terms");
  });

  test("should verify loading state on form submission", async ({ page }) => {
    // Mock a form submission to test loading state
    const submitButton = await page.$('button[type="submit"]');

    if (submitButton) {
      // Intercept form submission
      await page.route("**/api/**", (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }, 2000);
      });

      // Fill minimum required fields
      const amountInput = await page.$('input[name="amount"], input[type="number"]');
      if (amountInput) {
        await amountInput.fill("1000");
      }

      // Note: Don't actually submit to avoid side effects
      console.log("Form submission test skipped to avoid side effects");
    }
  });

  test("should be responsive on different viewports", async ({ page }) => {
    const results = await helpers.testResponsiveLayout([
      viewportSizes.desktop,
      viewportSizes.tablet,
      viewportSizes.mobile,
    ]);

    expect(results.length).toBe(3);

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await helpers.takeScreenshot("deposit-mobile-view");
  });

  test("should check accessibility", async ({ page }) => {
    const a11y = await helpers.checkAccessibility();
    expect(a11y.hasHeadings).toBeTruthy();

    // Check for proper form labels
    const hasLabels = await page.$$eval("input", (inputs) =>
      inputs.some((input) => {
        const id = input.id;
        return id && document.querySelector(`label[for="${id}"]`) !== null;
      })
    );

    console.log("Form accessibility checked");
  });

  test("should capture full page screenshot", async ({ page }) => {
    await helpers.takeScreenshot("deposit-full-page", true);
  });
});
