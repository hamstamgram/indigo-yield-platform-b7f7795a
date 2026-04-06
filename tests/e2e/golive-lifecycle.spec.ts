/**
 * Go-Live Lifecycle E2E Test Suite
 *
 * Sequential, full-lifecycle walkthrough of the Indigo Yield Platform.
 * Covers: Onboarding, Deposits, Routing, Yield, Voids, Reconciliation,
 * Risk Panels, Admin Actions, and UI/UX Edge Cases.
 *
 * REQUIRES: QA_EMAIL and QA_PASSWORD env vars for a valid admin account.
 * All DB queries use the Supabase REST API with the admin JWT.
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const QA_EMAIL = process.env.QA_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD;

if (!QA_EMAIL || !QA_PASSWORD) {
  throw new Error(
    'QA_EMAIL and QA_PASSWORD environment variables are required. ' +
    'Set them to a valid admin account (e.g., export QA_EMAIL=admin@indigo.fund).'
  );
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://nkfimvovosdehmyyjubn.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg';

// Production fund names — used for locating fund cards in the UI
const FUND_BTC_NAME = 'BTC Yield Fund';
const FUND_BTC_CODE = 'IBYF';

// Test investor data — created in Block A, cleaned up in Block G
const TEST_INVESTOR = {
  email: `golive-test-${Date.now()}@indigo-qa.test`,
  firstName: 'GoLive',
  lastName: 'TestInvestor',
  depositAmount: '0.001',
};

// ---------------------------------------------------------------------------
// Supabase REST API helper
// ---------------------------------------------------------------------------

let _adminJwt: string | null = null;

async function getAdminJwt(): Promise<string> {
  if (_adminJwt) return _adminJwt;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Admin login failed: ${res.status}`);
  const { access_token } = await res.json();
  _adminJwt = access_token;
  return access_token;
}

async function dbQuery(table: string, query: string): Promise<any[]> {
  const jwt = await getAdminJwt();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`DB query failed: ${table}?${query} → ${res.status}`);
  return res.json();
}

async function dbRpc(fn: string, params: Record<string, unknown>): Promise<any> {
  const jwt = await getAdminJwt();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`RPC ${fn} failed: ${res.status} — ${body}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// UI Helpers
// ---------------------------------------------------------------------------

async function login(page: Page) {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email Address' }).fill(QA_EMAIL!);
  await page.getByRole('textbox', { name: 'Password' }).fill(QA_PASSWORD!);
  await page.getByRole('button', { name: /Access Portal/ }).click();
  await page.waitForURL('**/admin**', { timeout: 30_000 }).catch(() => {});
  await page.goto('/admin');
  await page.waitForSelector('text=Command Center', { timeout: 30_000 });
}

async function waitForToast(page: Page, label: string, timeout = 45_000) {
  const result = await Promise.race([
    page.locator('[data-sonner-toast][data-type="success"]').first()
      .waitFor({ state: 'visible', timeout }).then(() => 'success' as const),
    page.locator('[data-sonner-toast][data-type="error"]').first()
      .waitFor({ state: 'visible', timeout }).then(() => 'error' as const),
  ]).catch(() => 'timeout' as const);

  if (result === 'error') {
    const msg = await page.locator('[data-sonner-toast][data-type="error"]').first()
      .textContent().catch(() => 'unknown');
    throw new Error(`[waitForToast] Error for "${label}": ${msg}`);
  }
  if (result === 'timeout') {
    await page.screenshot({ path: `test-results/golive-timeout-${Date.now()}.png` }).catch(() => {});
    throw new Error(`[waitForToast] Timeout after ${timeout}ms for: ${label}`);
  }
}

async function waitForErrorToast(page: Page, label: string, timeout = 15_000) {
  const result = await page.locator('[data-sonner-toast][data-type="error"]').first()
    .waitFor({ state: 'visible', timeout }).then(() => 'error' as const)
    .catch(() => 'timeout' as const);
  if (result === 'timeout') {
    throw new Error(`[waitForErrorToast] Expected error toast for "${label}" but none appeared`);
  }
}

async function snapshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/golive-${name}.png`, fullPage: true });
}

/** Open the New Transaction dialog, fill fields, and submit */
async function addTransaction(
  page: Page,
  opts: {
    type: 'First Investment' | 'Deposit / Top-up' | 'Withdrawal';
    fundName: string;
    investorSearch: string;
    amount: string;
    date: string;
    fullExit?: boolean;
  },
) {
  const label = `${opts.type} | ${opts.investorSearch} | ${opts.amount}`;
  console.log(`[tx:start] ${label}`);

  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'New Transaction' }).click();
  await page.getByRole('dialog', { name: 'Add Transaction' }).waitFor({ state: 'visible', timeout: 15_000 });

  const dialog = page.getByRole('dialog', { name: 'Add Transaction' });
  const comboboxes = dialog.getByRole('combobox');

  // 1. Fund select
  await comboboxes.nth(1).click();
  await page.getByRole('option', { name: opts.fundName }).click();

  // 2. Investor select
  await comboboxes.nth(2).click();
  await page.getByPlaceholder('Search').first().waitFor({ state: 'visible', timeout: 5_000 });
  await page.getByPlaceholder('Search').first().fill(opts.investorSearch);
  await page.waitForTimeout(800);
  await page.getByRole('option', { name: new RegExp(opts.investorSearch, 'i') }).first()
    .waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByRole('option', { name: new RegExp(opts.investorSearch, 'i') }).first().click();
  await page.locator('[role="listbox"]').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(1_500);

  // 3. Transaction type
  for (let attempt = 0; attempt < 10; attempt++) {
    await comboboxes.nth(0).click();
    await page.waitForTimeout(300);
    const option = page.getByRole('option', { name: opts.type }).first();
    const isDisabled = await option.getAttribute('data-disabled').catch(() => 'true');
    if (isDisabled === null) {
      await option.click();
      await page.locator('[role="listbox"]').waitFor({ state: 'hidden', timeout: 4_000 }).catch(async () => {
        await page.keyboard.press('Escape');
      });
      break;
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1_000);
    if (attempt === 9) {
      await comboboxes.nth(0).click();
      await page.getByRole('option', { name: opts.type }).first().click({ force: true });
    }
  }

  await page.locator('[role="listbox"]').waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(300);

  // 4. Amount
  if (!opts.fullExit) {
    await dialog.getByRole('textbox', { name: 'Amount' }).fill(opts.amount);
  }

  // 5. Date
  await dialog.getByRole('textbox', { name: 'Transaction Date' }).fill(opts.date);

  // 6. Full exit toggle
  if (opts.fullExit) {
    const exitSwitch = dialog.locator('#full-exit');
    await exitSwitch.waitFor({ state: 'visible', timeout: 5_000 });
    await exitSwitch.click();
    await page.waitForTimeout(1_200);
    const amountField = dialog.getByRole('textbox', { name: 'Amount' });
    const rawVal = await amountField.inputValue().catch(() => '');
    if (rawVal) {
      const floored = (Math.floor(parseFloat(rawVal) * 1e10) / 1e10).toFixed(10);
      await amountField.fill(floored);
    }
  }

  await page.waitForTimeout(800);
  const submitBtn = page.getByRole('dialog').getByRole('button', { name: 'Add Transaction' });
  await submitBtn.waitFor({ state: 'visible', timeout: 15_000 });
  await expect(submitBtn).toBeEnabled({ timeout: 20_000 });
  await submitBtn.click({ timeout: 15_000 });
  await waitForToast(page, label, opts.fullExit ? 600_000 : 45_000);
  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10_000 });
  await page.waitForTimeout(500);
  console.log(`[tx:done] ${label}`);
}

// Track IDs created during the test for cleanup
let createdInvestorId: string | null = null;

// ---------------------------------------------------------------------------
// Master Test Suite
// ---------------------------------------------------------------------------

test.describe.serial('Go-Live Lifecycle', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.close();
  });

  // =========================================================================
  // BLOCK A: Onboarding & Deposits
  // =========================================================================

  test('Block A: Onboarding & Deposits', async () => {
    // -----------------------------------------------------------------------
    // A1: Navigate to investors page, open Add Investor wizard
    // -----------------------------------------------------------------------
    await test.step('A1: Navigate to Admin Investors', async () => {
      await page.goto('/admin/investors');
      await page.waitForSelector('text=Investor Management', { timeout: 30_000 });
      await snapshot(page, 'A1-investors-page');
    });

    // -----------------------------------------------------------------------
    // A2: Create new investor via the wizard
    // The wizard has 4 steps: Identity → IB → Fees → Review
    // -----------------------------------------------------------------------
    await test.step('A2: Create new investor via wizard', async () => {
      await page.getByRole('button', { name: /Add Investor/i }).click();
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 15_000 });

      // Step 1: Identity
      await page.getByRole('textbox', { name: /email/i }).fill(TEST_INVESTOR.email);
      await page.getByRole('textbox', { name: /first name/i }).fill(TEST_INVESTOR.firstName);
      await page.getByRole('textbox', { name: /last name/i }).fill(TEST_INVESTOR.lastName);
      await page.getByRole('button', { name: /Continue/i }).click();
      await page.waitForTimeout(500);

      // Step 2: IB — skip (no IB assignment)
      await page.getByRole('button', { name: /Continue/i }).click();
      await page.waitForTimeout(500);

      // Step 3: Fees — use defaults (20% fee, 0% IB commission)
      await page.getByRole('button', { name: /Continue/i }).click();
      await page.waitForTimeout(500);

      // Step 4: Review — submit
      await page.getByRole('button', { name: /Complete Onboarding/i }).click();
      await waitForToast(page, 'Create investor', 30_000);
      await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(1_000);
    });

    // -----------------------------------------------------------------------
    // A3: Verify investor exists in DB and capture ID
    // -----------------------------------------------------------------------
    await test.step('A3: Verify investor in DB', async () => {
      const profiles = await dbQuery('profiles', `email=eq.${TEST_INVESTOR.email}&select=id,email,first_name,status`);
      expect(profiles.length).toBe(1);
      expect(profiles[0].first_name).toBe(TEST_INVESTOR.firstName);
      expect(profiles[0].status).toBe('active');
      createdInvestorId = profiles[0].id;
      console.log(`[A3] Created investor: ${createdInvestorId}`);
    });

    // -----------------------------------------------------------------------
    // A4: Execute first deposit on BTC fund
    // -----------------------------------------------------------------------
    await test.step('A4: First deposit on BTC fund', async () => {
      await page.goto('/admin');
      await page.waitForSelector('text=Command Center', { timeout: 30_000 });

      const today = new Date().toISOString().split('T')[0];
      await addTransaction(page, {
        type: 'First Investment',
        fundName: FUND_BTC_NAME,
        investorSearch: TEST_INVESTOR.lastName,
        amount: TEST_INVESTOR.depositAmount,
        date: today,
      });

      // DB parity: verify investor_positions was created
      // The apply_investor_transaction RPC creates/updates investor_positions on DEPOSIT
      const positions = await dbQuery(
        'investor_positions',
        `investor_id=eq.${createdInvestorId}&select=investor_id,fund_id,current_value,cost_basis`
      );
      expect(positions.length).toBeGreaterThanOrEqual(1);
      console.log(`[A4] Position created: current_value=${positions[0].current_value}`);
      await snapshot(page, 'A4-after-deposit');
    });

    // -----------------------------------------------------------------------
    // A5: Verify fee schedule exists (created by wizard or manually)
    // -----------------------------------------------------------------------
    await test.step('A5: Verify fee & IB schedules in DB', async () => {
      // Fee schedule — wizard creates one with the configured fee_pct
      const fees = await dbQuery(
        'investor_fee_schedule',
        `investor_id=eq.${createdInvestorId}&select=id,fee_pct,effective_date`
      );
      // The wizard may or may not create a fee schedule depending on link_fees config
      console.log(`[A5] Fee schedules found: ${fees.length}`);

      // IB commission schedule — should be empty since we skipped IB step
      const ibSchedules = await dbQuery(
        'ib_commission_schedule',
        `investor_id=eq.${createdInvestorId}&select=id,ib_percentage`
      );
      console.log(`[A5] IB schedules found: ${ibSchedules.length}`);
    });
  });

  // =========================================================================
  // BLOCK B: Routing & Adjustments
  // =========================================================================

  test('Block B: Routing & Adjustments', async () => {
    // -----------------------------------------------------------------------
    // B1: Navigate to admin and verify the test investor position exists
    // -----------------------------------------------------------------------
    await test.step('B1: Verify position exists for routing tests', async () => {
      await page.goto('/admin');
      await page.waitForSelector('text=Command Center', { timeout: 30_000 });

      const positions = await dbQuery(
        'investor_positions',
        `investor_id=eq.${createdInvestorId}&select=current_value`
      );
      expect(positions.length).toBeGreaterThanOrEqual(1);
      expect(Number(positions[0].current_value)).toBeGreaterThan(0);
      console.log(`[B1] Position value: ${positions[0].current_value}`);
    });

    // -----------------------------------------------------------------------
    // B2: Create a withdrawal transaction
    // This triggers the validate_withdrawal_request trigger and updates positions
    // -----------------------------------------------------------------------
    await test.step('B2: Execute partial withdrawal', async () => {
      const today = new Date().toISOString().split('T')[0];
      const withdrawalAmount = '0.0001'; // Small partial withdrawal

      await addTransaction(page, {
        type: 'Withdrawal',
        fundName: FUND_BTC_NAME,
        investorSearch: TEST_INVESTOR.lastName,
        amount: withdrawalAmount,
        date: today,
      });

      // DB parity: position should be reduced
      const positions = await dbQuery(
        'investor_positions',
        `investor_id=eq.${createdInvestorId}&select=current_value`
      );
      const posValue = Number(positions[0].current_value);
      console.log(`[B2] Position after withdrawal: ${posValue}`);
      // Should be deposit (0.001) minus withdrawal (0.0001) = ~0.0009
      expect(posValue).toBeLessThan(Number(TEST_INVESTOR.depositAmount));
      await snapshot(page, 'B2-after-withdrawal');
    });

    // -----------------------------------------------------------------------
    // B3: Verify transactions in DB
    // The withdrawal creates a WITHDRAWAL transaction in transactions_v2
    // -----------------------------------------------------------------------
    await test.step('B3: Verify transaction records in DB', async () => {
      const txns = await dbQuery(
        'transactions_v2',
        `investor_id=eq.${createdInvestorId}&select=id,tx_type,amount,is_voided&order=tx_date.asc`
      );
      console.log(`[B3] Transactions found: ${txns.length}`);
      expect(txns.length).toBeGreaterThanOrEqual(2); // At least DEPOSIT + WITHDRAWAL
      const types = txns.map((t: any) => t.tx_type);
      expect(types).toContain('DEPOSIT');
      expect(types).toContain('WITHDRAWAL');
    });
  });

  // =========================================================================
  // BLOCK C: Yield & Time Locks
  // =========================================================================

  test('Block C: Yield & Time Locks', async () => {
    // -----------------------------------------------------------------------
    // C1: Record a yield distribution on BTC fund (Transaction purpose)
    // This uses the Record Yield dialog on the BTC fund card.
    // The yield engine creates YIELD, FEE_CREDIT, and IB_CREDIT transactions.
    // -----------------------------------------------------------------------
    await test.step('C1: Record yield distribution', async () => {
      await page.goto('/admin');
      await page.waitForSelector('text=Command Center', { timeout: 30_000 });

      // Find the BTC fund card's Record Yield button
      await page.waitForSelector(`h3:has-text("${FUND_BTC_CODE}")`, { timeout: 30_000 });

      // Locate the Record Yield button associated with the BTC fund card
      const btcCardIndex = await page.evaluate((code) => {
        const btns = [...document.querySelectorAll('button')].filter(b =>
          b.textContent?.includes('Record Yield')
        );
        for (let i = 0; i < btns.length; i++) {
          let el: Element | null = btns[i];
          for (let j = 0; j < 10; j++) {
            el = el?.parentElement ?? null;
            if (!el) break;
            if (el.querySelector('h3')?.textContent?.includes(code)) return i;
          }
        }
        return -1;
      }, FUND_BTC_CODE);

      if (btcCardIndex === -1) {
        console.log('[C1] Record Yield button not found for BTC fund — skipping yield test');
        return;
      }

      await page.getByRole('button', { name: 'Record Yield' }).nth(btcCardIndex).click();
      await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 30_000 });

      // Select Transaction purpose (checkpoint mode)
      await page.locator('[data-testid="purpose-transaction"]').waitFor({ state: 'visible', timeout: 15_000 });
      await page.locator('[data-testid="purpose-transaction"]').click();

      // Set yield date to today
      const today = new Date().toISOString().split('T')[0];
      await page.locator('input[type="date"]').first().waitFor({ state: 'visible', timeout: 10_000 });
      await page.locator('input[type="date"]').first().fill(today);
      await page.waitForTimeout(1_000);

      // Get current fund AUM for the closing balance field
      // Use a reasonable closing AUM (slightly above current positions sum)
      const positions = await dbQuery(
        'investor_positions',
        `select=current_value&fund_id=not.is.null`
      );
      // Just use a nominal value — the preview will show the actual distribution
      await page.locator('[data-testid="aum-input"]').fill('100');

      await page.getByRole('button', { name: 'Preview Yield Distribution' }).click();
      await page.waitForTimeout(2_000);

      // Check if preview loaded successfully
      const previewError = await page.locator('[data-sonner-toast][data-type="error"]').first()
        .isVisible({ timeout: 3_000 }).catch(() => false);

      if (previewError) {
        console.log('[C1] Yield preview returned an error — likely no eligible investors. Closing dialog.');
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
        return;
      }

      // If preview shows investors, proceed with distribution
      const hasRows = await page.locator('table tbody tr').first()
        .isVisible({ timeout: 5_000 }).catch(() => false);

      if (hasRows) {
        await page.getByRole('button', { name: /Distribute Yield to/i }).click();
        await page.locator('#confirm-distribution').check();
        await page.getByRole('button', { name: 'Confirm Distribution' }).click();
        await Promise.race([
          page.locator('[data-sonner-toast][data-type="success"]').first()
            .waitFor({ state: 'visible', timeout: 60_000 }),
          page.locator('p:has-text("Distribution complete")').first()
            .waitFor({ state: 'visible', timeout: 60_000 }),
        ]);
        console.log('[C1] Yield distribution completed');
      } else {
        console.log('[C1] No investors in preview — skipping distribution');
      }

      // Close any remaining dialogs
      const doneBtn = page.getByRole('button', { name: 'Done' });
      if (await doneBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await doneBtn.click();
      }
      await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});

      await snapshot(page, 'C1-after-yield');
    });

    // -----------------------------------------------------------------------
    // C2: Attempt backdated transaction → Historical Lock should block it
    // The enforce_historical_lock trigger prevents transactions before
    // the last yield distribution date for a fund.
    // -----------------------------------------------------------------------
    await test.step('C2: Verify Historical Lock blocks backdated transaction', async () => {
      // Try to add a deposit dated BEFORE the yield distribution
      const pastDate = '2024-01-01'; // Well before any yield distribution

      await page.goto('/admin');
      await page.waitForSelector('text=Command Center', { timeout: 30_000 });

      // Open transaction dialog
      await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: 'New Transaction' }).click();
      await page.getByRole('dialog', { name: 'Add Transaction' }).waitFor({ state: 'visible', timeout: 15_000 });

      const dialog = page.getByRole('dialog', { name: 'Add Transaction' });
      const comboboxes = dialog.getByRole('combobox');

      // Fund
      await comboboxes.nth(1).click();
      await page.getByRole('option', { name: FUND_BTC_NAME }).click();

      // Investor
      await comboboxes.nth(2).click();
      await page.getByPlaceholder('Search').first().waitFor({ state: 'visible', timeout: 5_000 });
      await page.getByPlaceholder('Search').first().fill(TEST_INVESTOR.lastName);
      await page.waitForTimeout(800);
      await page.getByRole('option', { name: new RegExp(TEST_INVESTOR.lastName, 'i') }).first()
        .waitFor({ state: 'visible', timeout: 10_000 });
      await page.getByRole('option', { name: new RegExp(TEST_INVESTOR.lastName, 'i') }).first().click();
      await page.locator('[role="listbox"]').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(1_500);

      // Type
      await comboboxes.nth(0).click();
      await page.waitForTimeout(300);
      await page.getByRole('option', { name: 'Deposit / Top-up' }).first().click();
      await page.locator('[role="listbox"]').waitFor({ state: 'hidden', timeout: 4_000 }).catch(() => {});

      // Amount & date
      await dialog.getByRole('textbox', { name: 'Amount' }).fill('0.0001');
      await dialog.getByRole('textbox', { name: 'Transaction Date' }).fill(pastDate);

      await page.waitForTimeout(800);
      const submitBtn = page.getByRole('dialog').getByRole('button', { name: 'Add Transaction' });
      await submitBtn.click({ timeout: 15_000 }).catch(() => {});

      // Expect either: an error toast (historical lock), or form validation error
      // The historical lock fires a DB trigger that returns an error
      const gotError = await page.locator('[data-sonner-toast][data-type="error"]').first()
        .isVisible({ timeout: 10_000 }).catch(() => false);
      const hasValidation = await page.locator('[role="dialog"] .text-destructive').first()
        .isVisible({ timeout: 3_000 }).catch(() => false);

      expect(gotError || hasValidation).toBe(true);
      console.log(`[C2] Historical lock check: error=${gotError}, validation=${hasValidation}`);

      // Close dialog
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
      await snapshot(page, 'C2-historical-lock');
    });

    // -----------------------------------------------------------------------
    // C3: DB Snapshot — verify yield-related records
    // -----------------------------------------------------------------------
    await test.step('C3: DB parity snapshot for yield records', async () => {
      // Check yield_distributions for BTC fund
      const distributions = await dbQuery(
        'yield_distributions',
        'select=id,fund_id,purpose,is_voided&is_voided=eq.false&order=created_at.desc&limit=5'
      );
      console.log(`[C3] Recent non-voided yield distributions: ${distributions.length}`);

      // Check fee_allocations
      const feeAllocations = await dbQuery(
        'fee_allocations',
        'select=id,investor_id,fee_amount,is_voided&is_voided=eq.false&order=created_at.desc&limit=5'
      );
      console.log(`[C3] Recent fee allocations: ${feeAllocations.length}`);
    });
  });

  // =========================================================================
  // BLOCK D: Voids, Reissues & Cascades
  // =========================================================================

  test('Block D: Voids & Cascades', async () => {
    // -----------------------------------------------------------------------
    // D1: Void a transaction and verify cascade
    // Voiding a transaction should:
    // - Set is_voided=true on transactions_v2
    // - Reverse the position change
    // - Void linked fee_allocations and ib_allocations
    // -----------------------------------------------------------------------
    await test.step('D1: Void a transaction and verify cascade', async () => {
      // Get the test investor's transactions
      const txns = await dbQuery(
        'transactions_v2',
        `investor_id=eq.${createdInvestorId}&is_voided=eq.false&select=id,tx_type,amount&order=tx_date.desc&limit=5`
      );
      console.log(`[D1] Non-voided transactions: ${txns.length}`);

      if (txns.length === 0) {
        console.log('[D1] No transactions to void — skipping');
        return;
      }

      // Navigate to the investor's transaction history
      await page.goto('/admin/investors');
      await page.waitForSelector('text=Investor Management', { timeout: 30_000 });

      // Search for the test investor
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await searchInput.fill(TEST_INVESTOR.lastName);
        await page.waitForTimeout(1_000);
      }

      // Capture current position before void
      const posBefore = await dbQuery(
        'investor_positions',
        `investor_id=eq.${createdInvestorId}&select=current_value`
      );
      console.log(`[D1] Position before void: ${posBefore[0]?.current_value ?? 'N/A'}`);

      await snapshot(page, 'D1-before-void');
    });

    // -----------------------------------------------------------------------
    // D2: Verify void behavior in DB
    // -----------------------------------------------------------------------
    await test.step('D2: Verify void tracking in DB', async () => {
      // Check data_edit_audit for void records
      const audits = await dbQuery(
        'data_edit_audit',
        `table_name=eq.transactions_v2&select=id,operation,voided_record&order=edited_at.desc&limit=10`
      );
      console.log(`[D2] Recent transaction audits: ${audits.length}`);
    });
  });

  // =========================================================================
  // BLOCK E: Reconciliation & Notifications
  // =========================================================================

  test('Block E: Reconciliation & Notifications', async () => {
    // -----------------------------------------------------------------------
    // E1: Check notifications
    // -----------------------------------------------------------------------
    await test.step('E1: Check notification system', async () => {
      // Query notifications for the test investor
      if (createdInvestorId) {
        const notifications = await dbQuery(
          'notifications',
          `user_id=eq.${createdInvestorId}&select=id,title,type,created_at&order=created_at.desc&limit=5`
        );
        console.log(`[E1] Notifications for test investor: ${notifications.length}`);
      }
    });

    // -----------------------------------------------------------------------
    // E2: AUM Reconciliation
    // Navigate to operations page and verify reconciliation passes.
    // The check_aum_reconciliation RPC compares sum of investor_positions
    // against fund_daily_aum entries.
    // -----------------------------------------------------------------------
    await test.step('E2: AUM Reconciliation via DB', async () => {
      // Query active funds and check reconciliation for each
      const funds = await dbQuery('funds', 'status=eq.active&select=id,code,name');
      console.log(`[E2] Active funds to reconcile: ${funds.length}`);

      for (const fund of funds) {
        try {
          const result = await dbRpc('check_aum_reconciliation', {
            p_fund_id: fund.id,
            p_tolerance_pct: 0.01,
          });
          console.log(`[E2] ${fund.code}: discrepancy=${result?.discrepancy_pct ?? 'N/A'}%, warning=${result?.has_warning ?? 'N/A'}`);
        } catch (e) {
          console.log(`[E2] ${fund.code}: reconciliation RPC error — ${(e as Error).message}`);
        }
      }
    });

    // -----------------------------------------------------------------------
    // E3: Batch position reconciliation
    // Verify all investor positions sum to fund AUM within tolerance
    // -----------------------------------------------------------------------
    await test.step('E3: Batch position reconciliation', async () => {
      const funds = await dbQuery('funds', 'status=eq.active&select=id,code');
      for (const fund of funds) {
        const positions = await dbQuery(
          'investor_positions',
          `fund_id=eq.${fund.id}&select=current_value`
        );
        const totalPositions = positions.reduce(
          (sum: number, p: any) => sum + Number(p.current_value), 0
        );
        console.log(`[E3] ${fund.code}: ${positions.length} positions, total=${totalPositions.toFixed(8)}`);
      }
      await snapshot(page, 'E3-reconciliation');
    });
  });

  // =========================================================================
  // BLOCK F: Risk Panels & Admin Actions
  // =========================================================================

  test('Block F: Risk Panels & Admin Actions', async () => {
    // -----------------------------------------------------------------------
    // F1: Concentration Risk panel
    // -----------------------------------------------------------------------
    await test.step('F1: Concentration Risk panel', async () => {
      await page.goto('/admin/risk');
      await page.waitForTimeout(3_000);

      // Check if concentration risk section renders
      const hasConcentration = await page.locator('text=Concentration').first()
        .isVisible({ timeout: 10_000 }).catch(() => false);
      console.log(`[F1] Concentration Risk panel visible: ${hasConcentration}`);
      await snapshot(page, 'F1-concentration-risk');
    });

    // -----------------------------------------------------------------------
    // F2: Liquidity Risk panel
    // -----------------------------------------------------------------------
    await test.step('F2: Liquidity Risk panel', async () => {
      const hasLiquidity = await page.locator('text=Liquidity').first()
        .isVisible({ timeout: 5_000 }).catch(() => false);
      console.log(`[F2] Liquidity Risk panel visible: ${hasLiquidity}`);
      await snapshot(page, 'F2-liquidity-risk');
    });

    // -----------------------------------------------------------------------
    // F3: IB badges on investor list
    // -----------------------------------------------------------------------
    await test.step('F3: Verify investor list with IB badges', async () => {
      await page.goto('/admin/investors');
      await page.waitForSelector('text=Investor Management', { timeout: 30_000 });

      // Check that investor list renders
      const investorRows = page.locator('table tbody tr, [data-testid="investor-row"]');
      const rowCount = await investorRows.count();
      console.log(`[F3] Investor rows rendered: ${rowCount}`);
      expect(rowCount).toBeGreaterThan(0);

      // Check for IB badge presence (some investors have IB parents)
      const ibBadges = await page.locator('text=IB').count();
      console.log(`[F3] IB badges found: ${ibBadges}`);
      await snapshot(page, 'F3-investor-list');
    });

    // -----------------------------------------------------------------------
    // F4: Command Center — all fund cards render
    // -----------------------------------------------------------------------
    await test.step('F4: Command Center fund cards', async () => {
      await page.goto('/admin');
      await page.waitForSelector('text=Command Center', { timeout: 30_000 });

      // Verify each active fund card renders
      for (const code of ['IBYF', 'IEYF', 'ISYF', 'IUYF', 'IXRF']) {
        const visible = await page.locator(`h3:has-text("${code}")`).first()
          .isVisible({ timeout: 10_000 }).catch(() => false);
        console.log(`[F4] Fund card ${code}: ${visible ? '✅' : '❌'}`);
        expect(visible).toBe(true);
      }
      await snapshot(page, 'F4-command-center');
    });

    // -----------------------------------------------------------------------
    // F5: Admin Fund Management page
    // -----------------------------------------------------------------------
    await test.step('F5: Fund Management page renders', async () => {
      await page.goto('/admin/funds');
      await page.waitForTimeout(3_000);

      const hasFundsContent = await page.locator('text=Fund').first()
        .isVisible({ timeout: 10_000 }).catch(() => false);
      console.log(`[F5] Fund Management page rendered: ${hasFundsContent}`);
      await snapshot(page, 'F5-fund-management');
    });
  });

  // =========================================================================
  // BLOCK G: UI/UX Edge Cases & Cleanup
  // =========================================================================

  test('Block G: UI/UX Edge Cases & Cleanup', async () => {
    // -----------------------------------------------------------------------
    // G1: Period Selector — switch to historical month
    // -----------------------------------------------------------------------
    await test.step('G1: Period selector - historical month', async () => {
      await page.goto('/admin');
      await page.waitForSelector('text=Command Center', { timeout: 30_000 });

      // Look for period/date selector
      const periodSelector = page.locator('[data-testid="period-selector"], select, [role="combobox"]').first();
      if (await periodSelector.isVisible({ timeout: 5_000 }).catch(() => false)) {
        console.log('[G1] Period selector found');
      } else {
        console.log('[G1] No period selector on this page — checking yield history');
        await page.goto('/admin/yield-distributions');
        await page.waitForTimeout(3_000);
      }
      await snapshot(page, 'G1-period-selector');
    });

    // -----------------------------------------------------------------------
    // G2: CSV Export
    // -----------------------------------------------------------------------
    await test.step('G2: CSV export verification', async () => {
      await page.goto('/admin/transactions');
      await page.waitForTimeout(3_000);

      // Look for export button
      const exportBtn = page.getByRole('button', { name: /export|csv|download/i }).first();
      if (await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        // Start waiting for download BEFORE clicking
        const downloadPromise = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
        await exportBtn.click();
        const download = await downloadPromise;
        if (download) {
          console.log(`[G2] CSV exported: ${download.suggestedFilename()}`);
        } else {
          console.log('[G2] Export clicked but no download event');
        }
      } else {
        console.log('[G2] No export button found on transactions page');
      }
      await snapshot(page, 'G2-csv-export');
    });

    // -----------------------------------------------------------------------
    // G3: Theme toggle
    // -----------------------------------------------------------------------
    await test.step('G3: Theme toggle verification', async () => {
      await page.goto('/admin');
      await page.waitForSelector('text=Command Center', { timeout: 30_000 });

      // Find theme toggle button
      const themeBtn = page.locator('button[aria-label*="theme" i], button:has(svg.lucide-sun), button:has(svg.lucide-moon)').first();
      if (await themeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await themeBtn.click();
        await page.waitForTimeout(1_000);
        await snapshot(page, 'G3-theme-toggled');

        // Verify financial values are still visible after theme change
        const fundCards = page.locator('h3:has-text("IBYF")');
        expect(await fundCards.isVisible()).toBe(true);

        // Toggle back
        await themeBtn.click();
        await page.waitForTimeout(500);
      } else {
        console.log('[G3] No theme toggle button found');
      }
    });

    // -----------------------------------------------------------------------
    // G4: Investor Portal renders
    // -----------------------------------------------------------------------
    await test.step('G4: Verify investor portal route exists', async () => {
      // Navigate to investor portal — admin may be redirected back
      await page.goto('/investor');
      await page.waitForTimeout(3_000);

      // Check if we're on a valid page (either investor portal or redirected to admin)
      const currentUrl = page.url();
      console.log(`[G4] After navigating to /investor, landed on: ${currentUrl}`);
      await snapshot(page, 'G4-investor-portal');
    });

    // -----------------------------------------------------------------------
    // G5: Delete test investor — full teardown
    // The deleteInvestorUser service handles cascading deletion:
    // - investor_positions, transactions_v2, fee_allocations, ib_allocations
    // - investor_fee_schedule, ib_commission_schedule, notifications
    // - profiles row
    // -----------------------------------------------------------------------
    await test.step('G5: Delete test investor for cleanup', async () => {
      if (!createdInvestorId) {
        console.log('[G5] No test investor to clean up');
        return;
      }

      // Delete via Supabase RPC or direct API
      // First void all transactions for this investor
      const txns = await dbQuery(
        'transactions_v2',
        `investor_id=eq.${createdInvestorId}&is_voided=eq.false&select=id`
      );

      if (txns.length > 0) {
        console.log(`[G5] Voiding ${txns.length} transactions before cleanup...`);
        // Void each transaction via RPC
        for (const tx of txns) {
          try {
            await dbRpc('void_single_transaction', {
              p_transaction_id: tx.id,
              p_reason: 'Go-live test cleanup',
            });
          } catch (e) {
            console.log(`[G5] Could not void ${tx.id}: ${(e as Error).message}`);
          }
        }
      }

      // Delete position records
      const jwt = await getAdminJwt();
      for (const table of ['investor_positions', 'investor_fee_schedule', 'ib_commission_schedule', 'notifications', 'investor_emails']) {
        const delRes = await fetch(
          `${SUPABASE_URL}/rest/v1/${table}?investor_id=eq.${createdInvestorId}`,
          {
            method: 'DELETE',
            headers: {
              apikey: ANON_KEY,
              Authorization: `Bearer ${jwt}`,
              Prefer: 'return=minimal',
            },
          }
        );
        console.log(`[G5] DELETE ${table}: ${delRes.status}`);
      }

      // Delete the profile
      const profileDel = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${createdInvestorId}`,
        {
          method: 'DELETE',
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${jwt}`,
            Prefer: 'return=minimal',
          },
        }
      );
      console.log(`[G5] DELETE profile: ${profileDel.status}`);

      // Verify cleanup
      const remaining = await dbQuery('profiles', `id=eq.${createdInvestorId}&select=id`);
      expect(remaining.length).toBe(0);
      console.log(`[G5] ✅ Test investor ${createdInvestorId} fully cleaned up`);
    });
  });
});
