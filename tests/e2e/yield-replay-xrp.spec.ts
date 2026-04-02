import { test, expect, type Page } from '@playwright/test';

const QA_EMAIL = process.env.QA_EMAIL ?? 'qa.admin@indigo.fund';
const QA_PASSWORD = process.env.QA_PASSWORD ?? 'QaTest2026!';

// ---------------------------------------------------------------------------
// Persistent cleanup before test suite
// ---------------------------------------------------------------------------

const FUND_ID = '14e0f00a-fb6b-4350-b2e5-ff0cb19fb214';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://nkfimvovosdehmyyjubn.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg';

/**
 * Wipe all TEST XRP fund data so each run starts from a clean slate.
 * Uses the purge_fund_data_for_testing RPC to hard-delete all fund-related data.
 * Enhanced with better error handling and verification.
 */
async function cleanupFundData() {
  // Login to get JWT
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  if (!loginRes.ok) {
    console.warn(`DB cleanup: login failed (${loginRes.status}). Skipping cleanup.`);
    return;
  }
  const { access_token: jwt } = await loginRes.json();
  if (!jwt) {
    console.warn('DB cleanup: could not get JWT. Skipping cleanup.');
    return;
  }

  // Purge all fund data using the SECURITY DEFINER RPC
  const purgeRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/purge_fund_data_for_testing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY, 'Authorization': `Bearer ${jwt}` },
    body: JSON.stringify({ p_fund_id: FUND_ID, p_confirm: FUND_ID }),
  });

  let purgeSuccess = false;
  if (purgeRes.ok) {
    const purgeBody = await purgeRes.json();
    if (purgeBody?.success) {
      console.log(`DB cleanup: purged fund data for ${purgeBody?.fund ?? FUND_ID}`);
      purgeSuccess = true;
    } else {
      console.warn(`DB cleanup: fund purge failed: ${JSON.stringify(purgeBody)}`);
    }
  } else {
    console.warn(`DB cleanup: fund purge failed (HTTP ${purgeRes.status})`);
  }

  // Verify cleanup worked by checking for remaining positions
  if (purgeSuccess) {
    const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/investor_positions?select=count&fund_id=eq.${FUND_ID}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY, 'Authorization': `Bearer ${jwt}` },
    });

    if (verifyRes.ok) {
      const verifyBody = await verifyRes.json();
      const count = Array.isArray(verifyBody) ? verifyBody.length : 0;
      if (count === 0) {
        console.log(`DB cleanup: verified clean state - 0 positions remaining`);
      } else {
        console.warn(`DB cleanup: verification failed - ${count} positions still remain after purge`);
        purgeSuccess = false; // Mark as failed if verification shows data remains
      }
    } else {
      console.warn(`DB cleanup: verification request failed (HTTP ${verifyRes.status})`);
      purgeSuccess = false;
    }
  }

  if (!purgeSuccess) {
    console.warn(`DB cleanup: cleanup verification failed - test may encounter stale data issues`);
  }
}

async function login(page: Page) {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email Address' }).fill(QA_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(QA_PASSWORD);
  await page.getByRole('button', { name: /Access Portal/ }).click();
  await page.waitForURL('**/admin**', { timeout: 30000 }).catch(() => {});
  await page.goto('/admin');
  await page.waitForSelector('text=Command Center', { timeout: 30000 });
}

async function waitForToast(page: Page) {
  await page.locator('[data-sonner-toast][data-type="success"]').first().waitFor({ state: 'visible', timeout: 15000 });
}

async function addTransaction(page: Page, opts: {
  type: 'First Investment' | 'Deposit / Top-up' | 'Withdrawal';
  investorSearch: string; amount: string; date: string; fullExit?: boolean;
}) {
  await page.getByRole('button', { name: 'New Transaction' }).click();
  await page.getByRole('dialog', { name: 'Add Transaction' }).waitFor({ state: 'visible' });
  const dialog = page.getByRole('dialog', { name: 'Add Transaction' });
  const comboboxes = dialog.getByRole('combobox');

  // Fund select FIRST (combobox 1) — triggers fund-change effect that clears txnType;
  // must happen before we set the type
  await comboboxes.nth(1).click();
  await page.getByRole('option', { name: 'TEST XRP Yield Fund' }).click();

  // Investor select (combobox 2)
  await comboboxes.nth(2).click();
  await page.getByPlaceholder('Search').first().fill(opts.investorSearch);
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: new RegExp(opts.investorSearch, 'i') }).first().click();

  // Wait for balance query to resolve so auto-switch effect fires first.
  // 1500ms is generous — Supabase queries on Lovable's hosted app typically resolve in <500ms.
  await page.waitForTimeout(1500);

  // Transaction type select LAST (combobox 0) — now auto-switch has already fired
  // and won't override our "Withdrawal" selection
  await comboboxes.nth(0).click();
  await page.getByRole('option', { name: opts.type }).click();

  await dialog.getByRole('textbox', { name: 'Amount' }).fill(opts.amount);
  await dialog.getByRole('textbox', { name: 'Transaction Date' }).fill(opts.date);

  if (opts.fullExit) {
    const exitSwitch = dialog.locator('#full-exit');
    await exitSwitch.waitFor({ state: 'visible', timeout: 5000 });
    await exitSwitch.click();
    // Re-fill amount with spec value after toggle auto-fills with JS float-rounded balance.
    // Prevents IEEE 754 rounding from exceeding DB numeric(38,18) → 400 error.
    await dialog.getByRole('textbox', { name: 'Amount' }).fill(opts.amount);
  }

  await dialog.getByRole('button', { name: 'Add Transaction' }).click();
  await waitForToast(page);
  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10000 });
  await page.waitForTimeout(500);
}

async function recordYield(page: Page, opts: { date: string; closingAum: string; purpose?: 'transaction' | 'reporting' }) {
  await page.locator('p:has-text("TEST XRP Yield Fund")').scrollIntoViewIfNeeded();
  const txrpIndex = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent?.includes('Record Yield'));
    for (let i = 0; i < btns.length; i++) {
      let el: Element | null = btns[i];
      for (let j = 0; j < 10; j++) {
        el = el?.parentElement ?? null;
        if (!el) break;
        if (el.querySelector('h3')?.textContent?.includes('TXRP')) return i;
      }
    }
    return -1;
  });
  if (txrpIndex === -1) throw new Error('TXRP Record Yield button not found');
  await page.getByRole('button', { name: 'Record Yield' }).nth(txrpIndex).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.waitForTimeout(1000);
  const purposeTestId = opts.purpose === 'reporting' ? 'purpose-reporting' : 'purpose-transaction';
  await page.locator(`[data-testid="${purposeTestId}"]`).waitFor({ state: 'visible', timeout: 10000 });
  await page.locator(`[data-testid="${purposeTestId}"]`).click();

  if (opts.purpose === 'reporting') {
    // Reporting dialog uses a month combobox, not a date input
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const [year, month] = opts.date.split('-');
    const monthLabel = `${MONTHS[parseInt(month) - 1]} ${year}`;
    await page.locator('text=Reporting Month').locator('..').getByRole('combobox').click();
    await page.getByRole('option', { name: monthLabel }).click();
  } else {
    await page.locator('input[type="date"]').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('input[type="date"]').first().fill(opts.date);
    await page.waitForTimeout(1000);
  }

  await page.locator('[data-testid="aum-input"]').fill(opts.closingAum);
  await page.getByRole('button', { name: 'Preview Yield Distribution' }).click();
  await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: /Distribute Yield to/i }).click();
  await page.locator('#confirm-distribution').check();
  await page.getByRole('button', { name: 'Confirm Distribution' }).click();
  await Promise.race([
    page.locator('[data-sonner-toast][data-type="success"]').first().waitFor({ state: 'visible', timeout: 20000 }),
    page.locator('p:has-text("Distribution complete")').first().waitFor({ state: 'visible', timeout: 20000 }),
  ]);
  await page.waitForTimeout(500);
  const doneBtn = page.getByRole('button', { name: 'Done' });
  if (await doneBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await doneBtn.click();
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

// ---------------------------------------------------------------------------
// Epoch definitions — from Excel "XRP Yield Fund" sheet + real IND-XRP reference fund
//
// FLOW PER EPOCH:
//   1. recordYield() FIRST if closingAum !== null (yield distributes IB/FEE credits automatically)
//   2. addTransaction() AFTER for any deposits/withdrawals
//
// PURPOSE RULES (from real IND-XRP reference):
//   - 'reporting'   = month-end snapshot yield with no prior capital event that period
//   - 'transaction' = yield triggered by an incoming deposit (capital event happened this period)
//
// CLOSING AUM:
//   - reporting:    AUM_Before × (1 + GP)  [opening AUM before any deposit]
//   - transaction:  (AUM_Before + deposit) × (1 + GP)  [AUM after deposit has been added]
//
// DATE NOTE: Enter dates exactly as shown — the UI/DB normalises month-boundary dates.
// ---------------------------------------------------------------------------

const EPOCHS = [
  {
    // Excel col 0: 2025-11-17. Sam first investment. No yield (GP=0, no prior investors).
    date: '2025-11-17', closingAum: null, purpose: undefined,
    transactions: [
      { type: 'First Investment' as const, investor: 'TEST Sam', amount: '135003' },
    ],
    description: 'Sam Johnson first investment 135,003 XRP',
  },
  {
    // Excel col 1: 2025-11-25. Sam top-up. No yield between these two deposits.
    date: '2025-11-25', closingAum: null, purpose: undefined,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Sam', amount: '49000' },
    ],
    description: 'No yield — Sam Johnson top-up 49,000 XRP',
  },
  {
    // Excel col 2a: 2025-11-30. Reporting yield on opening AUM 184,358.
    // IB/Fees auto-distributed (Ryan +14.20, Fees +56.80). No deposit yet.
    date: '2025-11-30', closingAum: '184358', purpose: 'reporting' as const,
    transactions: [],
    description: 'Reporting yield 184,358 XRP',
  },
  {
    // Excel col 2b: 2025-11-30. Sam deposits 45,000 AFTER the reporting yield.
    // THEN transaction yield recorded on new AUM 229,731.
    // yieldAfterTx=true: deposit runs first, then recordYield.
    date: '2025-11-30', closingAum: '229731', purpose: 'transaction' as const, yieldAfterTx: true,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Sam', amount: '45000' },
    ],
    description: 'Sam top-up 45,000 XRP → transaction yield 229,731 XRP',
  },
  {
    // Excel col 3: 2025-12-08. Sam deposits 49,500. No yield recorded this date.
    date: '2025-12-08', closingAum: null, purpose: undefined,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Sam', amount: '49500' },
    ],
    description: 'No yield — Sam top-up 49,500 XRP',
  },
  {
    // Excel col 4: 2025-12-15. Sam deposits 50,100, then transaction yield on AUM 279,719.
    // yieldAfterTx=true: deposit runs first, then recordYield.
    date: '2025-12-15', closingAum: '279719', purpose: 'transaction' as const, yieldAfterTx: true,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Sam', amount: '50100' },
    ],
    description: 'Sam top-up 50,100 XRP → transaction yield 279,719 XRP',
  },
  {
    // Excel col 4: 2025-12-31 (Excel shows 2026-01-01). Pure reporting yield on AUM 330,976.
    // No capital events this period.
    date: '2025-12-31', closingAum: '330976', purpose: 'reporting' as const,
    transactions: [],
    description: 'Reporting yield 330,976 XRP — pure yield, no capital event',
  },
  {
    // Excel col 5: 2026-01-02. Sam full exit. No yield.
    date: '2026-01-02', closingAum: null, purpose: undefined,
    transactions: [
      { type: 'Withdrawal' as const, investor: 'TEST Sam', amount: '330500.42', fullExit: true },
    ],
    description: 'No yield — Sam Johnson full exit 330,500.42 XRP',
  },
  {
    // Excel col 6: 2026-01-05. Two deposits:
    //   Indigo Fees: 253.136 XRP (top-up of fees account)
    //   Ryan Van Der Wall: 63.284 XRP (top-up — Ryan already has IB balance from prior yields)
    // No yield this epoch.
    date: '2026-01-05', closingAum: null, purpose: undefined,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Indigo Fees', amount: '253.136' },
      { type: 'Deposit / Top-up' as const, investor: 'TEST Ryan', amount: '63.284' },
    ],
    description: 'No yield — Indigo Fees top-up 253.136 + Ryan top-up 63.284 XRP',
  },
  {
    // Excel col 7: 2026-01-31 (Excel shows 2026-02-01). Reporting yield on AUM 795 XRP.
    // No capital events.
    date: '2026-01-31', closingAum: '795', purpose: 'reporting' as const,
    transactions: [],
    description: 'Reporting yield 795 XRP — pure yield, no capital event',
  },
  {
    // Excel col 8: 2026-02-28. No yield (GP=0). End of period verify.
    date: '2026-02-28', closingAum: null, purpose: undefined,
    transactions: [],
    description: 'No yield — end of period verification',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe.serial('XRP Yield Fund Historical Replay (TEST)', () => {
  test.beforeAll(async () => { await cleanupFundData(); });

  test('Login and verify TEST XRP fund visible', async ({ page }) => {
    await login(page);
    await expect(page.locator('h3:has-text("TXRP Fund")')).toBeVisible({ timeout: 30000 });
  });

  for (let i = 0; i < EPOCHS.length; i++) {
    const epoch = EPOCHS[i];

    test(`Epoch ${i + 1}: ${epoch.date} — ${epoch.description}`, async ({ page }) => {
      await login(page);

      // For reporting yields: record yield first, then process transactions
      // For transaction yields (yieldAfterTx=true): process deposit first, then record yield
      if (epoch.closingAum !== null && !epoch.yieldAfterTx) {
        await recordYield(page, { date: epoch.date, closingAum: epoch.closingAum, purpose: epoch.purpose });
      }

      for (const tx of epoch.transactions) {
        await addTransaction(page, {
          type: tx.type,
          investorSearch: tx.investor,
          amount: tx.amount,
          date: epoch.date,
          fullExit: tx.fullExit,
        });
      }

      if (epoch.closingAum !== null && epoch.yieldAfterTx) {
        await recordYield(page, { date: epoch.date, closingAum: epoch.closingAum, purpose: epoch.purpose });
      }

      await page.goto('/admin');
      await page.waitForSelector('h3:has-text("TXRP Fund")', { timeout: 30000 });
    });
  }
});
