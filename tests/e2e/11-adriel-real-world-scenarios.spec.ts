import { test, expect, Page } from "@playwright/test";

// Environment Configuration
const BASE_URL = process.env.BASE_URL || "https://indigo-yield-platform.lovable.app";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "qa.admin@indigo.fund";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "IndigoInvestor2026!";

// Generate unique identifiers to prevent collisions with existing Profiles
const TIMESTAMP = Date.now();

const INVESTOR_PAUL = "Paul Johnson";
const INVESTOR_LP = "Indigo LP";
const INVESTOR_SAM = "Sam Johnson";
const FUND_SOL = "Solana Yield Fund";
const FUND_XRP = "Ripple Yield Fund";

// Login Credentials - Use standardized QA Admin instead of deleted Adriel account
const ADRIEL_EMAIL = ADMIN_EMAIL;
const ADRIEL_PASS = ADMIN_PASSWORD;

// Fee Variables
const INDIGO_FEES_NAME = "INDIGO Fees";
const DEFAULT_FEE = "13.5";
const XRP_FEE = "16";
const XRP_IB = "4";
const PAUL_IB = "1.5";

// Helpers
async function loginAsAdmin(page: Page, email: string = ADRIEL_EMAIL, pass: string = ADRIEL_PASS) {
  console.log(`LOGIN: Navigating to ${BASE_URL}/login for ${email}`);
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitBtn = page.locator('button[type="submit"]');

  await emailInput.fill(email);
  await passwordInput.fill(pass);
  await submitBtn.click();

  console.log("LOGIN: Waiting for dashboard content...");
  await page.waitForSelector("text=Command Center", { timeout: 30000 });
  console.log("LOGIN: Dashboard loaded successfully.");
}

async function createFund(page: Page, fundName: string, assetType: string) {
  await page.goto(`${BASE_URL}/admin/funds`);
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: /Add Fund|New Fund/i })
    .first()
    .click();

  const dialog = page.getByRole("dialog").first();
  await dialog.waitFor({ state: "visible" });

  // Name
  await dialog.locator('input[name="name"], input#name').fill(fundName);

  // Config - generate truly UNIQUE 10-char code to avoid Postgres UNIQUE constraint errors
  const uniquePrefix = fundName
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .substring(0, 5);
  const timeSuffix = Date.now().toString().slice(-5);
  await dialog.locator('input[name="code"], input#code').fill(`${uniquePrefix}${timeSuffix}`);

  // Asset / Currency (combobox or input in V5)
  const currencySelect = dialog.locator('button[role="combobox"]').first();
  if (await currencySelect.isVisible()) {
    await currencySelect.click();
    await page.getByRole("option", { name: new RegExp(assetType, "i") }).click();
  } else {
    const currencyInput = dialog.locator(
      'input[id="asset"], input[name="asset"], input[name="ticker"]'
    );
    if (await currencyInput.isVisible()) await currencyInput.fill(assetType);
  }

  // Decimals & Fees (safe optional fills)
  const decimalsInput = dialog.locator('input[name="decimals"]');
  if (await decimalsInput.isVisible()) await decimalsInput.fill("4");
  const defaultFeeInput = dialog.locator('input[name="performanceFee"]');
  if (await defaultFeeInput.isVisible()) await defaultFeeInput.fill("20");

  // Inception Date (CRITICAL: Fill explicitly to avoid Timezone 'future date' validation blocks)
  const inceptionInput = dialog.locator('input[name="inception_date"], input[type="date"]');
  if (await inceptionInput.isVisible()) await inceptionInput.fill("2024-01-01");

  await dialog.getByRole("button", { name: /Create|Save/i }).click();
  await expect(dialog).toBeHidden({ timeout: 10000 });
}

async function createProfileUser(page: Page, fullName: string, email: string) {
  console.log(`CREATING PROFILE: ${fullName} (${email})`);
  await page.goto(`${BASE_URL}/admin/investors`);
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: /Add Investor/i })
    .first()
    .click();
  const dialog = page.getByRole("dialog").first();
  await dialog.waitFor({ state: "visible" });

  const [first, ...rest] = fullName.split(" ");
  await dialog.locator('input[name="first_name"]').fill(first);
  await dialog.locator('input[name="last_name"]').fill(rest.join(" ") || "Test");
  await dialog.locator('input[name="email"]').fill(email);

  // In some wizards, we must click Next
  const nextBtn = dialog.getByRole("button", { name: /Next|Continue/i });
  while (await nextBtn.isVisible()) {
    await nextBtn.click();
    await page.waitForTimeout(500);
  }

  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes("/rest/v1/profiles") && resp.status() === 201,
    { timeout: 15000 }
  );

  await dialog
    .getByRole("button", { name: /Create|Save|Finish|Complete|Onboarding/i })
    .first()
    .click();
  await responsePromise;
  await expect(dialog).toBeHidden({ timeout: 10000 });
}

async function assignFundAndFees(
  page: Page,
  investorName: string,
  fundName: string,
  platformFee: string
) {
  await page.goto(`${BASE_URL}/admin/investors`);
  await page.waitForLoadState("networkidle");

  // Filter and open profile
  await page.getByPlaceholder("Search").fill(investorName);
  await page.waitForTimeout(1000);
  const row = page.locator("tr").filter({ hasText: investorName }).first();
  const viewBtn = row.getByRole("button", { name: /Open|View/i });
  if (await viewBtn.isVisible()) {
    await viewBtn.click();
  } else {
    // V5 Icon-only (Eye/Chevron) Fallback
    await row.locator("button").first().click();
  }
  await page.waitForLoadState("domcontentloaded");

  // Click Settings Tab
  const settingsTab = page.getByRole("tab", { name: /Settings/i });
  if (await settingsTab.isVisible()) {
    await settingsTab.click();
  }

  // Set Global Performance Fee
  const globalFeeInput = page.locator('input[type="number"], spinbutton').first();
  await globalFeeInput.fill(platformFee);
  await page.locator('button:has-text("Save")').first().click();
  await page.waitForTimeout(500);

  // Give them access to the specific Fund so we can deposit
  // Navigate to Access/Funds area if required by architecture.
  // Testing reveals that users can be assigned via the deposit modal directly,
  // or we might need to grant access. Assuming standard configuration grants all active users
  // visibility in the deposit dropdown if they are an active investor.
}

async function assignIBCommission(
  page: Page,
  investorName: string,
  fundName: string,
  ibName: string,
  ibFee: string
) {
  await page.goto(`${BASE_URL}/admin/investors`);
  await page.waitForLoadState("networkidle");

  await page.getByPlaceholder("Search").fill(investorName);
  await page.waitForTimeout(1000);
  const row = page.locator("tr").filter({ hasText: investorName }).first();
  await row.getByRole("button", { name: /Open|View/i }).click();

  const settingsTab = page.getByRole("tab", { name: /Settings/i });
  if (await settingsTab.isVisible()) {
    await settingsTab.click();
  }

  // Assign IB
  const ibSection = page.locator('h3:has-text("Partnership & IB Settings")').locator("xpath=./..");
  const addBtn = ibSection.getByRole("button", { name: /Add/i }).first();
  await addBtn.click();

  const dialog = page.locator('div[role="dialog"]').first();
  await dialog.waitFor({ state: "visible" });

  // Select Fund
  const fundTrigger = dialog.locator('button[role="combobox"]').nth(0);
  await fundTrigger.click();
  await page.getByRole("option", { name: new RegExp(fundName, "i") }).click();

  // Select IB
  const ibTrigger = dialog.locator('button[role="combobox"]').nth(1);
  await ibTrigger.click();
  await page.getByRole("option", { name: new RegExp(ibName, "i") }).click();

  // Fill Fee
  await dialog.locator('input[type="number"]').first().fill(ibFee);

  await dialog.getByRole("button", { name: /Add Entry|Save/i }).click();
  await expect(dialog).toBeHidden({ timeout: 10000 });
}

async function executeDeposit(
  page: Page,
  fundName: string,
  investorName: string,
  amount: string,
  dateStr: string
) {
  console.log(`EXECUTING DEPOSIT: ${amount} ${fundName} for ${investorName} on ${dateStr}`);
  await page.goto(`${BASE_URL}/admin/transactions`);
  await page.waitForLoadState("networkidle");

  await page
    .getByRole("button", { name: /Add Transaction/i })
    .first()
    .click();

  const modal = page.getByRole("dialog");
  await modal.waitFor({ state: "visible" });

  // Type = DEPOSIT
  const typeTrigger = modal.locator('button[role="combobox"]').nth(0);
  await typeTrigger.click();
  await page.getByRole("option", { name: /DEPOSIT/i }).click();

  // Fund
  const fundTrigger = modal.locator('button[role="combobox"]').nth(1);
  await fundTrigger.click();
  await page.getByRole("option", { name: new RegExp(fundName, "i") }).click();

  // Investor
  const invTrigger = modal.locator('button[role="combobox"]').nth(2);
  await invTrigger.click();
  await page.getByPlaceholder(/Search by name or email/i).fill(investorName);
  await page
    .locator('[role="option"]')
    .filter({ hasText: new RegExp(investorName, "i") })
    .first()
    .click();

  // Amount
  await modal.locator('input[name="amount"]').fill(amount);

  // Optional Date Override if available in the UI
  const dateInput = modal.locator('input[type="date"]');
  if ((await dateInput.isVisible()) && dateStr) {
    await dateInput.fill(dateStr);
  }

  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes("/rpc/apply_investor_transaction") && resp.status() === 200,
    { timeout: 15000 }
  );

  // Submit
  await modal.getByRole("button", { name: /Add Transaction/i }).click();
  await responsePromise;
  await expect(modal).toBeHidden({ timeout: 10000 });
}

async function simulateYieldWorkflow(
  page: Page,
  fundName: string,
  newAUM: string,
  purpose: "Transaction" | "Reporting",
  dateStr: string,
  asserts?: any[]
) {
  console.log(`\n--- Simulating ${purpose} Yield: ${newAUM} ${fundName} for ${dateStr} ---`);

  // Always navigate to the Command Center to ensure "Apply Yield" is visible
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForSelector('h1:has-text("Command Center")', { timeout: 30000 });

  await page.getByRole("button", { name: /Apply Yield/i }).click();

  // Select Fund (Support both card-based and combobox-based fund selection)
  const fundCard = page.getByRole("button").filter({ hasText: fundName }).first();
  const fundSelect = page.getByRole("combobox", { name: "Select Fund" });

  if (await fundCard.isVisible()) {
    await fundCard.click();
    // Wait for the actual distribution form to appear
    await page.waitForSelector("text=Record Yield Event", { timeout: 10000 });
  } else if (await fundSelect.isVisible()) {
    await fundSelect.click();
    await page.getByRole("option", { name: fundName, exact: false }).click();
  }
  await page.waitForTimeout(500);

  // Wait for modal and purpose selection
  await page.waitForSelector("text=Choose Period & Purpose", { timeout: 10000 });

  // Purpose Selection (Transaction vs Reporting)
  if (purpose === "Transaction") {
    console.log("Selecting Transaction purpose...");
    const transactionToggle = page.getByText("Transaction", { exact: true });
    if (await transactionToggle.isVisible()) {
      await transactionToggle.click({ force: true });
    }
  } else {
    console.log("Selecting Reporting purpose...");
    const reportingToggle = page.getByText("Reporting", { exact: true });
    if (await reportingToggle.isVisible()) {
      await reportingToggle.click({ force: true });
    }
  }
  await page.waitForTimeout(2000);

  // Date / Month Handling
  if (purpose === "Reporting") {
    const date = new Date(dateStr);
    const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
      date
    );
    console.log(`Selecting month: ${monthLabel}`);

    const combobox = page.locator('button[role="combobox"]').first();
    await expect(combobox).toBeVisible({ timeout: 20000 });
    await combobox.click();
    await page.waitForTimeout(1000);

    // Log available options for debugging
    const options = await page.getByRole("option").allInnerTexts();
    console.log(`Available months: ${options.join(", ")}`);

    const option = page.getByRole("option", { name: monthLabel, exact: false }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click({ force: true });
    await page.waitForTimeout(1000);
  } else {
    const dateInput = page.locator('input[type="date"], input#yield-date').first();
    console.log(`Filling date: ${dateStr}`);
    await dateInput.fill(dateStr);
    await dateInput.press("Enter");
    await page.waitForTimeout(1000);
  }

  // New AUM Input
  console.log(`Setting AUM: ${newAUM}`);
  const aumInput = page.locator('input[name="newAUM"], input#newAUM, input[id*="aum"]').first();
  await aumInput.fill(newAUM);
  await aumInput.press("Tab");
  await page.waitForTimeout(1000);

  // Preview
  const previewBtn = page.getByRole("button", { name: /Preview Yield Distribution/i });
  if (await previewBtn.isVisible()) {
    await expect(previewBtn).toBeEnabled({ timeout: 15000 });
    await previewBtn.click();
  } else {
    await page
      .getByRole("button", { name: /Preview/i })
      .first()
      .click();
  }
  await page.waitForTimeout(1000);

  // Assertions
  const previewHeader = page.getByText(/Investor Allocation Breakdown|Confirm & Apply/i);
  await expect(previewHeader).toBeVisible({ timeout: 20000 });

  if (asserts && asserts.length > 0) {
    console.log("Verifying Preview Breakdown...");
    // Scope to the table to avoid background rows
    const previewTable = page
      .locator("table")
      .filter({ hasText: /Investor|Gross|Net/i })
      .first();

    for (const req of asserts) {
      const row = previewTable.locator("tr").filter({ hasText: req.name }).first();
      await expect(row).toBeVisible({ timeout: 15000 });

      console.log(`Checking row for ${req.name} matches ${req.value}`);
      const rowText = await row.innerText();
      console.log(`[DEBUG] Row text for ${req.name}:`, rowText);
      const cell = row.getByText(req.value, { exact: false }).first();
      await expect(cell).toBeVisible({ timeout: 10000 });

      if (req.ibValue) {
        await expect(row.getByText(req.ibValue, { exact: false }).first()).toBeVisible({
          timeout: 10000,
        });
      }
    }
  }

  // Distribute
  const distributeBtn = page
    .getByRole("button", { name: /Distribute Yield to/i })
    .or(page.locator("button").filter({ hasText: /Distribute/i }));
  if (await distributeBtn.isVisible()) {
    await distributeBtn.click();
    await page.waitForTimeout(1000);

    // Discrepancy Checkbox in Confirmation Dialog
    const discrepancy = page
      .getByText(/acknowledge the .* AUM discrepancy/i)
      .or(page.locator("label").filter({ hasText: /discrepancy/i }));
    if (await discrepancy.first().isVisible()) {
      console.log("Acknowledging discrepancy...");
      await discrepancy.first().click({ force: true });
      await page.waitForTimeout(300);
    }

    // Final Confirmation Checkbox
    const confirmation = page
      .getByText(/I confirm this yield/i)
      .or(page.locator("label").filter({ hasText: /confirm.*accurate/i }));
    if (await confirmation.first().isVisible()) {
      console.log("Confirming distribution accuracy...");
      await confirmation.first().click({ force: true });
      await page.waitForTimeout(300);
    }

    const finalConfirm = page.getByRole("button", { name: /Confirm Distribution/i });
    await expect(finalConfirm).toBeEnabled({ timeout: 10000 });

    // Resilient wait for the RPC response
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("apply_segmented_yield_distribution"),
      { timeout: 30000 }
    );
    await finalConfirm.click();
    await responsePromise;

    await expect(page.getByText(/complete|success/i).first()).toBeVisible({ timeout: 20000 });
    await page
      .getByRole("button", { name: /Done/i })
      .click()
      .catch(() => {});
  }
}

test.describe("Adriel Real-World Golden Scenarios (E2E UI TEST)", () => {
  test.describe.configure({ mode: "serial" });

  test("Unified Adriel Real-World Golden Scenarios (SOL + XRP)", async ({ page }) => {
    test.setTimeout(900000); // 15 minutes for the whole flow

    // Setup loggers
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log(`BROWSER ERROR: ${msg.text()}`);
      if (msg.type() === "log") console.log(`BROWSER LOG: ${msg.text()}`);
    });
    page.on("requestfailed", (request) => {
      console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
    });
    await page.addInitScript(() => {
      window.localStorage.setItem("block_emails", "true");
    });

    // 1. Intercept noisy background polls to stabilize UI
    await page.route("**/admin_alerts**", (route) => route.fulfill({ status: 200, body: "[]" }));
    await page.route("**/risk_alerts**", (route) => route.fulfill({ status: 200, body: "[]" }));
    await page.route(
      "**/*.supabase.co/rest/v1/profiles?select=id,email,first_name,last_name,is_admin**",
      (route) => route.fulfill({ status: 200, body: "[]" })
    );
    await page.route("**/functions/v1/notify-yield-applied", (route) =>
      route.fulfill({ status: 200, body: '{"success":true}' })
    );

    // 2. Login
    await loginAsAdmin(page, ADRIEL_EMAIL, ADRIEL_PASS);
    await page.waitForTimeout(2000);

    // --- SCENARIO 1: SOL Fund Flow ---
    console.log("\n>>> STARTING SCENARIO 1: SOL");
    await page.goto(`${BASE_URL}/admin/transactions`);
    await page.waitForSelector("h1", { timeout: 30000 });

    // 3. Action (02/09/2025): Deposit INDIGO LP = 1250 SOL
    await executeDeposit(page, FUND_SOL, INVESTOR_LP, "1250", "2025-09-02");

    // 4. Action (04/09/2025): Yield (Transaction). New AUM 1252 SOL.
    await simulateYieldWorkflow(page, FUND_SOL, "1252", "Transaction", "2025-09-04", [
      { name: INVESTOR_LP, value: "+2" },
    ]);

    // 5. Action (04/09/2025): Deposit Paul Johnson = 234.17 SOL
    await executeDeposit(page, FUND_SOL, INVESTOR_PAUL, "234.17", "2025-09-04");

    // 5b. Assign IB for Paul (to match benchmarks)
    await assignIBCommission(page, INVESTOR_PAUL, FUND_SOL, INVESTOR_LP, "1.5");

    // 6. Action (30/09/2025): Yield (Reporting). New AUM 1500 SOL.
    const solGoldenAsserts = [
      { name: INVESTOR_LP, value: "+11.6479" },
      { name: INVESTOR_PAUL, value: "+1.8002", ibValue: "-0.0327" },
    ];
    await simulateYieldWorkflow(
      page,
      FUND_SOL,
      "1500",
      "Reporting",
      "2025-09-30",
      solGoldenAsserts
    );

    // --- SCENARIO 2: XRP Fund Flow ---
    console.log("\n>>> STARTING SCENARIO 2: XRP");
    await page.goto(`${BASE_URL}/admin/transactions`);
    await page.waitForSelector("h1", { timeout: 30000 });

    // 4. Action (08/10/2025): Sam Johnson Deposits 11,400 XRP
    await executeDeposit(page, FUND_XRP, INVESTOR_SAM, "11400", "2025-10-08");

    // 4. Deposit 25/11/2025: Sam = 49000 XRP
    await executeDeposit(page, FUND_XRP, INVESTOR_SAM, "49000", "2025-11-25");

    // 5. Yield 30/11/2025 (Reporting). New AUM: 184358 XRP.
    const xrpFirstYieldAsserts = [{ name: INVESTOR_SAM, value: "+99,166.40" }];
    await simulateYieldWorkflow(
      page,
      FUND_XRP,
      "184358",
      "Reporting",
      "2025-11-30",
      xrpFirstYieldAsserts
    );

    // 6. Deposit 30/11/2025: Sam = 45000 XRP
    await executeDeposit(page, FUND_XRP, INVESTOR_SAM, "45000", "2025-11-30");

    // 7. Yield 08/12/2025 (Transaction). New AUM: 229731 XRP.
    const xrpSecondYieldAsserts = [{ name: INVESTOR_SAM, value: "+266.1456", ibValue: "-13.3073" }];
    await simulateYieldWorkflow(
      page,
      FUND_XRP,
      "229731",
      "Transaction",
      "2025-12-08",
      xrpSecondYieldAsserts
    );
  });
});
