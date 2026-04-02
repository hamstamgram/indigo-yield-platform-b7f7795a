import { test, expect, type Page } from '@playwright/test';

const QA_EMAIL = process.env.QA_EMAIL ?? 'qa.admin@indigo.fund';
const QA_PASSWORD = process.env.QA_PASSWORD ?? 'QaTest2026!';

// ---------------------------------------------------------------------------
// Persistent cleanup before test suite
// ---------------------------------------------------------------------------

const FUND_ID = '00746a0e-6054-4474-981c-0853d5d4f9b7';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://nkfimvovosdehmyyjubn.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg';

/**
 * Wipe all TEST BTC fund data so each run starts from a clean slate.
 * Voids all transactions then calls purge_fund_data_for_testing for a hard delete.
 * No service_role key needed — authenticates as qa.admin and calls the RPCs.
 */
async function cleanupFundData() {
  // Login to get JWT
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`DB cleanup: login failed (${loginRes.status})`);
  const { access_token: jwt } = await loginRes.json();
  if (!jwt) throw new Error('DB cleanup: could not get JWT');

  // Hard-purge all fund data — purge RPC handles FK-safe deletion in correct order
  const purgeRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/purge_fund_data_for_testing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY, 'Authorization': `Bearer ${jwt}` },
    body: JSON.stringify({ p_fund_id: FUND_ID, p_confirm: FUND_ID }),
  });
  const purgeBody = await purgeRes.json();
  if (!purgeRes.ok || !purgeBody?.success) {
    throw new Error(`DB cleanup: purge failed (${purgeRes.status}): ${JSON.stringify(purgeBody)}`);
  }
  console.log(`DB cleanup: purged fund data for ${purgeBody?.fund ?? FUND_ID}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function login(page: Page) {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email Address' }).fill(QA_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(QA_PASSWORD);
  await page.getByRole('button', { name: /Access Portal/ }).click();
  await page.waitForURL('**/admin**', { timeout: 30000 }).catch(() => {});
  await page.goto('/admin');
  await page.waitForSelector('text=Command Center', { timeout: 30000 });
}

async function waitForToast(page: Page, label: string, timeout = 45000) {
  const start = Date.now();
  const confirmed = await Promise.race([
    page.locator('[data-sonner-toast][data-type="success"]').first()
      .waitFor({ state: 'visible', timeout }).then(() => true),
    page.getByRole('dialog', { name: 'Add Transaction' })
      .waitFor({ state: 'hidden', timeout }).then(() => true),
  ]).catch(() => false);

  if (!confirmed) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    // Collect diagnostics before throwing
    const errToast = await page.locator('[data-sonner-toast][data-type="error"]').first()
      .textContent().catch(() => null);
    const dialogOpen = await page.getByRole('dialog', { name: 'Add Transaction' })
      .isVisible().catch(() => false);
    const validationMsgs = await page.locator('[role="dialog"] .text-sm.text-destructive')
      .allTextContents().catch(() => [] as string[]);
    await page.screenshot({ path: `test-results/hang-${Date.now()}.png` });
    throw new Error(
      `[waitForToast] Timeout after ${elapsed}s for: ${label}\n` +
      `  dialog still open: ${dialogOpen}\n` +
      `  error toast: ${errToast ?? '(none)'}\n` +
      `  validation errors: ${validationMsgs.length ? validationMsgs.join(' | ') : '(none)'}\n` +
      `  screenshot saved to test-results/hang-*.png`
    );
  }

  // Error toast check
  const errToast = page.locator('[data-sonner-toast][data-type="error"]').first();
  if (await errToast.isVisible({ timeout: 500 }).catch(() => false)) {
    const msg = await errToast.textContent().catch(() => 'unknown error');
    throw new Error(`[waitForToast] Transaction failed: ${msg} — for: ${label}`);
  }
}

/** Add a single transaction via the New Transaction dialog */
async function addTransaction(
  page: Page,
  opts: {
    type: 'First Investment' | 'Deposit / Top-up' | 'Withdrawal';
    investorSearch: string;
    amount: string;
    date: string;
    fullExit?: boolean;
  },
) {
  const label = `${opts.type} | ${opts.investorSearch} | ${opts.amount} | ${opts.date}${opts.fullExit ? ' [full-exit]' : ''}`;
  console.log(`[tx:start] ${label}`);

  // Ensure no dialog is open and page is stable before opening a new one
  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'New Transaction' }).click();
  await page.getByRole('dialog', { name: 'Add Transaction' }).waitFor({ state: 'visible', timeout: 15000 });

  const dialog = page.getByRole('dialog', { name: 'Add Transaction' });
  const comboboxes = dialog.getByRole('combobox');

  // Fund select FIRST — triggers fund-change effect that clears txnType
  await comboboxes.nth(1).click();
  await page.getByRole('option', { name: 'TEST BTC Yield Fund' }).click();

  // Investor select
  await comboboxes.nth(2).click();
  await page.getByPlaceholder('Search').first().fill(opts.investorSearch);
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: new RegExp(opts.investorSearch, 'i') }).first().click();

  // Wait for balance query to resolve before opening the type dropdown.
  // 1500ms covers the typical Supabase round-trip on the hosted Lovable app.
  // For Withdrawal, we additionally poll until the option is enabled (up to 10s extra).
  await page.waitForTimeout(1500);

  // Transaction type LAST — can't be overridden by effects now.
  // For Withdrawal: open dropdown, check if enabled, close via dialog heading if not, retry.
  for (let attempt = 0; attempt < 10; attempt++) {
    await comboboxes.nth(0).click();
    await page.waitForTimeout(300);
    const option = page.getByRole('option', { name: opts.type }).first();
    const isDisabled = await option.getAttribute('data-disabled').catch(() => 'true');
    if (isDisabled === null) {
      await option.click();
      // Wait for Radix portal listbox to leave DOM — throws if still open after 4s
      const closed = await page.locator('[role="listbox"]')
        .waitFor({ state: 'hidden', timeout: 4000 })
        .then(() => true)
        .catch(() => false);
      if (!closed) {
        // Force-close via Escape (closes Select overlay, not the dialog)
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        const stillOpen = await page.locator('[role="listbox"]').isVisible().catch(() => false);
        if (stillOpen) {
          throw new Error(
            `[addTransaction] Type dropdown did not close after selecting "${opts.type}". ` +
            `Listbox still visible — form is blocked. Failing fast.`
          );
        }
      }
      break;
    }
    // Close dropdown — Escape closes innermost overlay first (Select dropdown, not the dialog)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.waitForTimeout(1000);
    if (attempt === 9) {
      await comboboxes.nth(0).click();
      await page.getByRole('option', { name: opts.type }).first().click({ force: true });
    }
  }

  // Final guard: confirm no listbox is overlaying the form
  const listboxGone = await page.locator('[role="listbox"]')
    .waitFor({ state: 'hidden', timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (!listboxGone) {
    throw new Error(
      `[addTransaction] Listbox still visible before filling Amount for "${opts.type}" / "${opts.investorSearch}". ` +
      `This blocks field interaction. Failing fast.`
    );
  }
  await page.waitForTimeout(300);

  // Amount — always fill for non-full-exit; for full-exit this is overridden below
  if (!opts.fullExit) {
    await dialog.getByRole('textbox', { name: 'Amount' }).fill(opts.amount);
  }

  // Date
  await dialog.getByRole('textbox', { name: 'Transaction Date' }).fill(opts.date);

  // Full exit toggle — sets p_is_full_exit flag on the backend.
  // The UI auto-fills the amount with the DB balance. We keep this DB value so
  // the platform accepts the full exit. The p_is_full_exit flag handles the rest.
  if (opts.fullExit) {
    const exitSwitch = dialog.locator('#full-exit');
    await exitSwitch.waitFor({ state: 'visible', timeout: 5000 });
    await exitSwitch.click();
    await page.waitForTimeout(1200); // let UI populate auto-filled amount from DB
  }

  // Wait for React to settle after all field interactions before resolving submit button
  await page.waitForTimeout(800);

  // Re-resolve submit button fresh at click time to avoid stale references after re-renders
  const submitBtn = page.getByRole('dialog').getByRole('button', { name: 'Add Transaction' });
  await submitBtn.waitFor({ state: 'visible', timeout: 15000 });
  await submitBtn.scrollIntoViewIfNeeded();
  console.log(`[tx:submit] ${label}`);
  await submitBtn.click({ timeout: 15000 });
  // Full exits call approve_and_complete_withdrawal which crystallizes yield first —
  // can take 60-90s on Supabase hosted. Use 150s to accommodate multi-investor yield crystallization.
  await waitForToast(page, label, opts.fullExit ? 150000 : 45000);
  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10000 });
  await page.waitForTimeout(500);
  console.log(`[tx:done] ${label}`);
}

/** Record yield via the Record Yield dialog on the TBTC fund card */
async function recordYield(
  page: Page,
  opts: {
    date: string;
    closingAum: string;
    purpose?: 'transaction' | 'reporting';
  },
) {
  // Wait for fund cards to fully load before searching for Record Yield
  await page.waitForSelector('h3:has-text("TBTC Fund")', { timeout: 30000 });
  await page.locator('p:has-text("TEST BTC Yield Fund")').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500); // let scroll settle
  const tbtcIndex = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => b.textContent?.includes('Record Yield'));
    for (let i = 0; i < btns.length; i++) {
      let el: Element | null = btns[i];
      for (let j = 0; j < 10; j++) {
        el = el?.parentElement ?? null;
        if (!el) break;
        if (el.querySelector('h3')?.textContent?.includes('TBTC')) return i;
      }
    }
    return -1;
  });
  if (tbtcIndex === -1) throw new Error('TBTC Record Yield button not found');
  await page.getByRole('button', { name: 'Record Yield' }).nth(tbtcIndex).click();

  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1000);

  const purposeTestId = String(opts.purpose).trim().toLowerCase() === 'reporting' ? 'purpose-reporting' : 'purpose-transaction';
  await page.locator(`[data-testid="${purposeTestId}"]`).waitFor({ state: 'visible', timeout: 15000 });
  await page.locator(`[data-testid="${purposeTestId}"]`).click();

  if (String(opts.purpose).trim().toLowerCase() === 'reporting') {
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
  await page.waitForTimeout(1000); // let preview query fire
  await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.getByRole('button', { name: /Distribute Yield to/i }).click();
  await page.locator('#confirm-distribution').check();
  await page.getByRole('button', { name: 'Confirm Distribution' }).click();
  // Wait for toast OR the "Distribution complete" modal — platform shows one or the other
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
// Epoch definitions — from Excel "BTC Yield Fund" sheet
// closingAum = AUM_Before × (1 + Gross_Performance); null = no yield this epoch
// Transactions = explicit investor deposits/withdrawals only (not yield accruals)
// ---------------------------------------------------------------------------

const EPOCHS = [
  // Epoch 1: 2024-07-01
  {
    date: '2024-07-01', closingAum: null, purpose: undefined,
    transactions: [
      { type: 'First Investment' as const, investor: 'TEST Jose', amount: '3.468' },
    ],
    description: 'Fund creation — Jose Molla first investment',
  },
  // Epoch 2: 2024-07-31
  {
    date: '2024-07-31', closingAum: '3.490000', purpose: 'reporting' as const,
    transactions: [],
    description: 'Pure yield',
  },
  // Epoch 3: 2024-08-21
  {
    date: '2024-08-21', closingAum: '3.500000', purpose: 'transaction' as const,
    transactions: [
      { type: 'First Investment' as const, investor: 'TEST Kyle', amount: '2' },
    ],
    description: 'Kyle first investment 2 BTC + yield',
  },
  // Epoch 4: 2024-08-31
  {
    date: '2024-08-31', closingAum: '5.510000', purpose: 'reporting' as const,
    transactions: [],
    description: 'Pure yield',
  },
  // Epoch 5: 2024-09-30
  // closingAum = old-investors close (5.540) + new deposits (4.62+6.5193+5.2 = 16.3393) = 21.8793
  {
    date: '2024-09-30', closingAum: '21.879300', purpose: 'reporting' as const,
    transactions: [
      { type: 'First Investment' as const, investor: 'TEST Matthias', amount: '4.62' },
      { type: 'First Investment' as const, investor: 'TEST Thomas', amount: '6.5193' },
      { type: 'First Investment' as const, investor: 'TEST Danielle', amount: '5.2' },
    ],
    yieldAfterTx: true,
    description: 'Matthias/Thomas/Danielle first investments → reporting yield',
  },
  // Epoch 6: 2024-10-31
  {
    date: '2024-10-31', closingAum: '21.990000', purpose: 'reporting' as const,
    transactions: [],
    description: 'Pure yield',
  },
  // Epoch 7: 2024-11-09
  {
    date: '2024-11-09', closingAum: '22.020000', purpose: 'transaction' as const,
    transactions: [
      { type: 'Withdrawal' as const, investor: 'TEST Danielle', amount: '0.27' },
    ],
    description: 'Danielle withdrawal 0.27 BTC + yield',
  },
  // Epoch 8: 2024-11-30
  {
    date: '2024-11-30', closingAum: '21.840000', purpose: 'reporting' as const,
    transactions: [],
    description: 'Pure yield',
  },
  // Epoch 9: 2024-12-14
  {
    date: '2024-12-14', closingAum: '21.880000', purpose: 'transaction' as const,
    transactions: [
      { type: 'Withdrawal' as const, investor: 'TEST Danielle', amount: '0.124' },
    ],
    description: 'Danielle withdrawal 0.124 BTC + yield',
  },
  // Epoch 10: 2024-12-15
  {
    date: '2024-12-15', closingAum: null, purpose: undefined,
    transactions: [
      { type: 'Withdrawal' as const, investor: 'TEST Kyle', amount: '2.0336368', fullExit: true },
      { type: 'Withdrawal' as const, investor: 'TEST Matthias', amount: '4.6717292', fullExit: true },
      { type: 'Withdrawal' as const, investor: 'TEST Danielle', amount: '4.86277111', fullExit: true },
    ],
    description: 'No yield — Kyle/Matthias/Danielle exit to Boosted Program',
  },
  // Epoch 11: 2024-12-31
  {
    date: '2024-12-31', closingAum: '10.240000', purpose: 'reporting' as const,
    transactions: [],
    description: 'Pure yield',
  },
  // Epoch 12: 2025-01-31
  {
    date: '2025-01-31', closingAum: '10.300000', purpose: 'reporting' as const,
    transactions: [],
    description: 'Pure yield',
  },
  // Epoch 13: 2025-02-28
  {
    date: '2025-02-28', closingAum: '10.340000', purpose: 'reporting' as const,
    transactions: [],
    description: 'Pure yield',
  },
  // Epoch 14: 2025-03-31
  // closingAum = total close (10.420155) - Thomas withdrawal (6.7249) = 3.695255
  {
    date: '2025-03-31', closingAum: '3.695255', purpose: 'reporting' as const,
    transactions: [
      { type: 'Withdrawal' as const, investor: 'TEST Thomas', amount: '6.7249', fullExit: true },
    ],
    yieldAfterTx: true,
    description: 'Thomas exit to TAC Program → reporting yield',
  },
  // Epoch 15: 2025-04-16
  {
    date: '2025-04-16', closingAum: '3.705070', purpose: 'transaction' as const,
    transactions: [
      { type: 'First Investment' as const, investor: 'TEST Kyle', amount: '2.101' },
      { type: 'First Investment' as const, investor: 'TEST Matthias', amount: '4.8357' },
      { type: 'First Investment' as const, investor: 'TEST Danielle', amount: '5.0334' },
    ],
    description: 'Kyle/Matthias/Danielle re-enter from Boosted Program + yield',
  },
  // Epoch 16: 2025-04-30
  {
    date: '2025-04-30', closingAum: '15.820229', purpose: 'reporting' as const,
    transactions: [],
    description: 'Pure yield',
  },
  // Epoch 17: 2025-05-13
  {
    date: '2025-05-13', closingAum: '15.800025', purpose: 'transaction' as const,
    transactions: [
      { type: 'Withdrawal' as const, investor: 'TEST Kyle', amount: '2.1101', fullExit: true },
    ],
    description: 'Kyle full exit 2.1101 BTC + yield',
  },
  // Epoch 18: 2025-05-31
  // closingAum = total close (13.798401) - Danielle withdrawal (0.13) = 13.668401
  {
    date: '2025-05-31', closingAum: '13.668401', purpose: 'reporting' as const,
    transactions: [
      { type: 'Withdrawal' as const, investor: 'TEST Danielle', amount: '0.13' },
    ],
    yieldAfterTx: true,
    description: 'Danielle withdrawal 0.13 BTC → reporting yield',
  },
  // Epoch 19: 2025-06-11
  {
    date: '2025-06-11', closingAum: '13.685321', purpose: 'transaction' as const,
    transactions: [
      { type: 'First Investment' as const, investor: 'TEST Kabbaj', amount: '2' },
    ],
    description: 'Kabbaj first investment 2 BTC + yield',
  },
  // Epoch 20: 2025-06-30
  {
    date: '2025-06-30', closingAum: '15.670811', purpose: 'reporting' as const,
    transactions: [],
    description: 'Pure yield',
  },
  // Epoch 21: 2025-07-11
  {
    date: '2025-07-11', closingAum: '15.777930', purpose: 'transaction' as const,
    transactions: [
      { type: 'First Investment' as const, investor: 'TEST Thomas', amount: '6.69' },
      { type: 'Deposit / Top-up' as const, investor: 'TEST Kabbaj', amount: '0.9914' },
      { type: 'First Investment' as const, investor: 'TEST Victoria', amount: '0.1484' },
      { type: 'First Investment' as const, investor: 'TEST Nathanael', amount: '0.446' },
      { type: 'First Investment' as const, investor: 'TEST Blondish', amount: '4.0996' },
    ],
    description: 'Thomas re-enters + Kabbaj top-up + Victoria/Nathanael/Blondish first investments + yield',
  },
  // Epoch 22: 2025-07-24
  {
    date: '2025-07-24', closingAum: '28.108302', purpose: 'transaction' as const,
    transactions: [
      { type: 'First Investment' as const, investor: 'TEST Oliver', amount: '2.115364' },
    ],
    description: 'Oliver first investment 2.115364 BTC + yield',
  },
  // Epoch 23: 2025-07-25
  {
    date: '2025-07-25', closingAum: '30.219336', purpose: 'transaction' as const,
    transactions: [
      { type: 'Withdrawal' as const, investor: 'TEST Danielle', amount: '0.26' },
    ],
    description: 'Danielle withdrawal 0.26 BTC + yield',
  },
  // Epoch 24: 2025-07-31
  // closingAum = old-investors close (29.997713) + Kabbaj deposit (0.6) = 30.597713
  {
    date: '2025-07-31', closingAum: '30.597713', purpose: 'reporting' as const,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Kabbaj', amount: '0.6' },
    ],
    yieldAfterTx: true,
    description: 'Kabbaj top-up 0.6 BTC → reporting yield',
  },
  // Epoch 25: 2025-08-20
  {
    date: '2025-08-20', closingAum: '30.742522', purpose: 'transaction' as const,
    transactions: [
      { type: 'Withdrawal' as const, investor: 'TEST Danielle', amount: '0.11' },
    ],
    description: 'Danielle withdrawal 0.11 BTC + yield',
  },
  // Epoch 26: 2025-08-25
  {
    date: '2025-08-25', closingAum: '30.580007', purpose: 'transaction' as const,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Kabbaj', amount: '0.9102' },
    ],
    description: 'Kabbaj top-up 0.9102 BTC + yield',
  },
  // Epoch 27: 2025-08-31
  {
    date: '2025-08-31', closingAum: '31.504807', purpose: 'reporting' as const,
    transactions: [],
    description: 'Pure yield',
  },
  // Epoch 28: 2025-09-30
  {
    date: '2025-09-30', closingAum: '31.710384', purpose: 'reporting' as const,
    transactions: [],
    description: 'Pure yield',
  },
  // Epoch 29: 2025-10-03
  {
    date: '2025-10-03', closingAum: '31.640013', purpose: 'transaction' as const,
    transactions: [
      { type: 'First Investment' as const, investor: 'TEST Paul', amount: '0.4395' },
    ],
    description: 'Paul first investment 0.4395 BTC + yield',
  },
  // Epoch 30: 2025-10-23
  {
    date: '2025-10-23', closingAum: '32.220702', purpose: 'transaction' as const,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Jose', amount: '0.062' },
    ],
    description: 'Jose top-up 0.062 BTC + yield',
  },
  // Epoch 31: 2025-10-31
  {
    date: '2025-10-31', closingAum: '32.218002', purpose: 'reporting' as const,
    transactions: [],
    description: 'Pure yield',
  },
  // Epoch 32: 2025-11-05
  {
    date: '2025-11-05', closingAum: '32.250012', purpose: 'transaction' as const,
    transactions: [
      { type: 'Withdrawal' as const, investor: 'TEST Danielle', amount: '0.283' },
      { type: 'Withdrawal' as const, investor: 'TEST Paul', amount: '0.4408', fullExit: true },
    ],
    description: 'Danielle withdrawal 0.283 + Paul full exit + yield',
  },
  // Epoch 33: 2025-11-08
  {
    date: '2025-11-08', closingAum: '31.593861', purpose: 'transaction' as const,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Jose', amount: '0.4867' },
    ],
    description: 'Jose top-up 0.4867 BTC + yield',
  },
  // Epoch 34: 2025-11-17
  {
    date: '2025-11-17', closingAum: '32.083317', purpose: 'transaction' as const,
    transactions: [
      { type: 'First Investment' as const, investor: 'TEST Sam', amount: '3.3' },
    ],
    description: 'Sam first investment 3.3 BTC + yield',
  },
  // Epoch 35: 2025-11-25
  {
    date: '2025-11-25', closingAum: null, purpose: undefined,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Jose', amount: '0.548' },
      { type: 'Deposit / Top-up' as const, investor: 'TEST Sam', amount: '1' },
    ],
    description: 'No yield — Jose 0.548 + Sam 1 BTC top-ups',
  },
  // Epoch 36: 2025-11-27
  {
    date: '2025-11-27', closingAum: '36.932004', purpose: 'transaction' as const,
    transactions: [
      { type: 'First Investment' as const, investor: 'TEST Nath', amount: '1' },
      { type: 'First Investment' as const, investor: 'TEST Vivie', amount: '3.411' },
    ],
    description: 'Nath&Thomas 1 BTC + Vivie&Liana 3.411 BTC first investments + yield',
  },
  // Epoch 37: 2025-11-30
  {
    date: '2025-11-30', closingAum: null, purpose: undefined,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Sam', amount: '1.2' },
    ],
    description: 'No yield — Sam top-up 1.2 BTC',
  },
  // Epoch 38: 2025-12-08
  {
    date: '2025-12-08', closingAum: '42.629056', purpose: 'transaction' as const,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Sam', amount: '1.1' },
    ],
    description: 'Sam top-up 1.1 BTC + yield',
  },
  // Epoch 39: 2025-12-09
  {
    date: '2025-12-09', closingAum: '43.780057', purpose: 'transaction' as const,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Thomas', amount: '0.657' },
    ],
    description: 'Thomas top-up 0.657 BTC + yield',
  },
  // Epoch 40: 2025-12-15
  {
    date: '2025-12-15', closingAum: '44.413004', purpose: 'transaction' as const,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Sam', amount: '1.17' },
    ],
    description: 'Sam top-up 1.17 BTC + yield',
  },
  // Epoch 41: 2025-12-23
  {
    date: '2025-12-23', closingAum: '45.590002', purpose: 'transaction' as const,
    transactions: [
      { type: 'Withdrawal' as const, investor: 'TEST Matthias', amount: '4.9896327', fullExit: true },
    ],
    description: 'Matthias full exit + yield',
  },
  // Epoch 42: 2025-12-31 (was 2026-01-01)
  {
    date: '2025-12-31', closingAum: null, purpose: undefined,
    transactions: [],
    description: 'No yield',
  },
  // Epoch 43: 2026-01-02
  {
    date: '2026-01-02', closingAum: null, purpose: undefined,
    transactions: [
      { type: 'Withdrawal' as const, investor: 'TEST Sam', amount: '7.7852', fullExit: true },
    ],
    description: 'No yield — Sam full exit 7.7852 BTC',
  },
  // Epoch 44: 2026-01-05
  {
    date: '2026-01-05', closingAum: '32.834707', purpose: 'transaction' as const,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Kabbaj', amount: '2.1577' },
      { type: 'Withdrawal' as const, investor: 'TEST Vivie', amount: '3.4221', fullExit: true },
    ],
    description: 'Kabbaj 2.1577 top-up + Vivie&Liana full exit + yield',
  },
  // Epoch 45: 2026-01-13
  {
    date: '2026-01-13', closingAum: '31.664494', purpose: 'transaction' as const,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Thomas', amount: '0.1135766' },
      { type: 'First Investment' as const, investor: 'TEST NSVO', amount: '0.622' },
    ],
    description: 'NSVO 0.622 + Thomas 0.1135766 + yield',
  },
  // Epoch 46: 2026-01-19
  {
    date: '2026-01-19', closingAum: '32.374430', purpose: 'transaction' as const,
    transactions: [
      { type: 'First Investment' as const, investor: 'TEST Kyle', amount: '3.9998' },
      { type: 'Withdrawal' as const, investor: 'TEST Danielle', amount: '0.12' },
    ],
    description: 'Kyle re-entry 3.9998 + Danielle -0.12 + yield',
  },
  // Epoch 47: 2026-01-23
  {
    date: '2026-01-23', closingAum: '36.240200', purpose: 'transaction' as const,
    transactions: [
      { type: 'Withdrawal' as const, investor: 'TEST Kyle', amount: '3.9998', fullExit: true },
    ],
    description: 'Kyle full exit 3.9998 BTC + yield',
  },
  // Epoch 48: 2026-01-30
  {
    date: '2026-01-30', closingAum: null, purpose: undefined,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Thomas', amount: '0.14207' },
    ],
    description: 'No yield — Thomas top-up 0.14207 BTC',
  },
  // Epoch 49: 2026-01-31
  {
    date: '2026-01-31', closingAum: '32.407932', purpose: 'reporting' as const,
    transactions: [],
    description: 'Pure yield',
  },
  // Epoch 50: 2026-02-03
  {
    date: '2026-02-03', closingAum: null, purpose: undefined,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Thomas', amount: '0.60672' },
    ],
    description: 'No yield — Thomas top-up 0.60672 BTC',
  },
  // Epoch 51: 2026-02-06
  {
    date: '2026-02-06', closingAum: '33.133401', purpose: 'transaction' as const,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST NSVO', amount: '0.1773' },
    ],
    description: 'NSVO top-up 0.1773 BTC + yield',
  },
  // Epoch 52: 2026-02-12
  {
    date: '2026-02-12', closingAum: '33.252700', purpose: 'transaction' as const,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Jose', amount: '2.766' },
      { type: 'First Investment' as const, investor: 'TEST ALOK', amount: '6' },
    ],
    description: 'Jose 2.766 + ALOK 6 BTC first investment + yield',
  },
  // Epoch 53: 2026-02-13
  {
    date: '2026-02-13', closingAum: null, purpose: undefined,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Thomas', amount: '0.656' },
      { type: 'Withdrawal' as const, investor: 'TEST Danielle', amount: '4.2999', fullExit: true },
    ],
    description: 'No yield — Thomas 0.656 + Danielle full exit',
  },
  // Epoch 54: 2026-02-24
  {
    date: '2026-02-24', closingAum: '38.408509', purpose: 'transaction' as const,
    transactions: [
      { type: 'Deposit / Top-up' as const, investor: 'TEST Thomas', amount: '0.15103283' },
    ],
    description: 'Thomas top-up 0.15103283 BTC + yield',
  },
  // Epoch 55: 2026-02-28
  {
    date: '2026-02-28', closingAum: null, purpose: undefined,
    transactions: [],
    description: 'No yield — end of period',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe.serial('BTC Yield Fund Historical Replay (TEST)', () => {
  test.beforeAll(async () => {
    await cleanupFundData();
  });

  test('Login and verify TEST fund visible', async ({ page }) => {
    await login(page);
    await page.waitForSelector('h3:has-text("TBTC Fund")', { timeout: 30000 });
    await expect(page.locator('h3:has-text("TBTC Fund")')).toBeVisible();
  });

  // E2E_EPOCH_RANGE: run a subset of epochs for fast iteration.
  // Formats: "6" (single), "6-10" (range), "6,10,15" (list). 1-indexed. Default: all.
  const epochFilter = (() => {
    const env = process.env.E2E_EPOCH_RANGE;
    if (!env) return null; // null = run all
    if (env.includes('-')) {
      const [s, e] = env.split('-').map(Number);
      return Array.from({ length: e - s + 1 }, (_, i) => s - 1 + i);
    }
    if (env.includes(',')) return env.split(',').map(n => Number(n.trim()) - 1);
    return [Number(env) - 1];
  })();
  if (epochFilter) {
    console.log(`[E2E] Epoch filter active: running epochs ${epochFilter.map(i => i + 1).join(', ')}`);
  }

  for (let i = 0; i < EPOCHS.length; i++) {
    const epoch = EPOCHS[i];
    if (epochFilter && !epochFilter.includes(i)) continue;

    test(`Epoch ${i + 1}: ${epoch.date} — ${epoch.description}`, async ({ page }) => {
      await login(page);

      if (epoch.closingAum !== null && !epoch.yieldAfterTx) {
        await recordYield(page, {
          date: epoch.date,
          closingAum: epoch.closingAum,
          purpose: epoch.purpose,
        });
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
        await recordYield(page, {
          date: epoch.date,
          closingAum: epoch.closingAum,
          purpose: epoch.purpose,
        });
      }

      await page.goto('/admin');
      await page.waitForSelector('h3:has-text("TBTC Fund")', { timeout: 30000 });
    });
  }
});