/**
 * XRP Yield Fund — Full Lifecycle E2E Test
 *
 * Replays the production XRP fund lifecycle against local Supabase.
 * Validates: fund creation, investor onboarding, deposits, yield distributions,
 * fee/IB conservation, withdrawals, and final reconciliation.
 *
 * Source of truth: docs/source-of-truth/Accounting Yield Funds (6).xlsx → "XRP Yield Fund" sheet
 * Production reference: IND-XRP fund (2c123c4f-76b4-4504-867e-059649855417)
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LOCAL_URL = 'http://127.0.0.1:54321';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const ADMIN_EMAIL = 'admin@test.local';
const ADMIN_PASSWORD = 'TestAdmin2026!';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SqlResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

async function sql(query: string): Promise<SqlResult[]> {
  const res = await fetch(`${LOCAL_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  // Use raw pg for complex queries
  const pgRes = await fetch(
    `${LOCAL_URL}/rest/v1/rpc/`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  // Actually use psql-style via the pg endpoint
  return [];
}

async function execSql(query: string): Promise<SqlResult[]> {
  // Use the Supabase management API to run raw SQL
  const res = await fetch(`http://127.0.0.1:54322`, { method: 'POST' }).catch(() => null);
  // For local testing, use direct pg connection via node-postgres
  // Since we're in Playwright, we'll use the REST API with RPC calls instead
  return [];
}

// Direct RPC call helper
async function rpc(fnName: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(`${LOCAL_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC ${fnName} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// REST API query helper
async function query(table: string, params: string = ''): Promise<SqlResult[]> {
  const res = await fetch(`${LOCAL_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  return res.json() as Promise<SqlResult[]>;
}

// REST API insert helper
async function insert(table: string, data: Record<string, unknown>): Promise<SqlResult[]> {
  const res = await fetch(`${LOCAL_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`INSERT ${table} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<SqlResult[]>;
}

// Create auth user helper
async function createAuthUser(email: string, password: string): Promise<string> {
  const res = await fetch(`${LOCAL_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Failed to create user ${email}: ${JSON.stringify(data)}`);
  return data.id;
}

// Login helper
async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /access portal/i }).click();
  // Wait for redirect to admin dashboard
  await page.waitForURL(/\/admin/, { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let fundId: string;
let samId: string;
let ryanId: string;
let feesId: string;
const adminId = 'cd60cf98-8ae8-436d-b53c-d1b3cbca3c47';

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe.serial('XRP Yield Fund Lifecycle', () => {

  // =========================================================================
  // BLOCK A: SEED — Create fund + investors via API
  // =========================================================================

  test('A1: Create XRP Yield Fund', async () => {
    const funds = await insert('funds', {
      code: 'IND-XRP',
      name: 'Ripple Yield Fund',
      asset: 'XRP',
      status: 'active',
      inception_date: '2025-11-01',
      fund_class: 'yield',
    });
    fundId = funds[0].id;
    expect(fundId).toBeTruthy();
    console.log(`Fund created: ${fundId}`);
  });

  test('A2: Create investors — Sam Johnson (16% fee, 4% IB → Ryan)', async () => {
    // Create auth users
    samId = await createAuthUser('sam.johnson@test.local', 'Test1234!');
    ryanId = await createAuthUser('ryan.vanderwall@test.local', 'Test1234!');
    feesId = await createAuthUser('fees@test.local', 'Test1234!');

    // Create profiles
    await insert('profiles', {
      id: samId, email: 'sam.johnson@test.local',
      first_name: 'Sam', last_name: 'Johnson',
      account_type: 'investor', status: 'active', is_admin: false, role: 'investor',
    });
    await insert('profiles', {
      id: ryanId, email: 'ryan.vanderwall@test.local',
      first_name: 'Ryan', last_name: 'Van Der Wall',
      account_type: 'ib', status: 'active', is_admin: false, role: 'investor',
    });
    await insert('profiles', {
      id: feesId, email: 'fees@test.local',
      first_name: 'Indigo', last_name: 'Fees',
      account_type: 'fees_account', status: 'active', is_admin: false, role: 'investor',
    });

    // Create positions (empty starting positions)
    await insert('investor_positions', { investor_id: samId, fund_id: fundId, current_value: 0, cost_basis: 0, shares: 0, is_active: true });
    await insert('investor_positions', { investor_id: ryanId, fund_id: fundId, current_value: 0, cost_basis: 0, shares: 0, is_active: true });
    await insert('investor_positions', { investor_id: feesId, fund_id: fundId, current_value: 0, cost_basis: 0, shares: 0, is_active: true });

    // Set fee schedule: Sam 16%, Ryan 20%, Fees 0%
    await insert('investor_fee_schedule', { investor_id: samId, fund_id: fundId, fee_pct: 16, effective_date: '2024-01-01' });
    await insert('investor_fee_schedule', { investor_id: ryanId, fund_id: fundId, fee_pct: 20, effective_date: '2024-01-01' });
    await insert('investor_fee_schedule', { investor_id: feesId, fund_id: fundId, fee_pct: 0, effective_date: '2024-01-01' });

    // Set IB schedule: Sam → Ryan at 4%
    await insert('ib_commission_schedule', { investor_id: samId, fund_id: fundId, ib_percentage: 4, effective_date: '2024-01-01' });

    // Set IB allocation: Sam's IB is Ryan
    await insert('ib_allocations', { ib_investor_id: ryanId, source_investor_id: samId, fund_id: fundId, ib_percentage: 4, effective_date: '2024-01-01' });

    console.log(`Sam: ${samId}, Ryan: ${ryanId}, Fees: ${feesId}`);
  });

  // =========================================================================
  // BLOCK B: DEPOSITS — Replay from Excel
  // =========================================================================

  test('B1: Sam deposits 135,003 XRP (2025-11-17)', async () => {
    await rpc('apply_investor_transaction', {
      p_fund_id: fundId,
      p_investor_id: samId,
      p_tx_type: 'DEPOSIT',
      p_amount: 135003,
      p_tx_date: '2025-11-17',
      p_reference_id: 'test-xrp-sam-deposit-1',
      p_admin_id: adminId,
    });

    const positions = await query('investor_positions', `investor_id=eq.${samId}&fund_id=eq.${fundId}`);
    expect(Number(positions[0].current_value)).toBeCloseTo(135003, 0);
  });

  test('B2: Sam deposits 49,000 XRP (2025-11-25)', async () => {
    await rpc('apply_investor_transaction', {
      p_fund_id: fundId,
      p_investor_id: samId,
      p_tx_type: 'DEPOSIT',
      p_amount: 49000,
      p_tx_date: '2025-11-25',
      p_reference_id: 'test-xrp-sam-deposit-2',
      p_admin_id: adminId,
    });

    const positions = await query('investor_positions', `investor_id=eq.${samId}&fund_id=eq.${fundId}`);
    expect(Number(positions[0].current_value)).toBeCloseTo(184003, 0);
  });

  // =========================================================================
  // BLOCK C: YIELD DISTRIBUTION — Nov month_end
  // =========================================================================

  test('C1: November yield distribution — 355 XRP gross', async () => {
    // From production: gross=355, fees=56.8, ib=14.2, net=284
    // AUM at distribution: 184,003 (Sam only) + recording 184,358 after yield
    // Using canonical RPC: apply_segmented_yield_distribution_v5
    const result = await rpc('apply_segmented_yield_distribution_v5', {
      p_fund_id: fundId,
      p_period_end: '2025-11-30',
      p_recorded_aum: 184003,
      p_purpose: 'reporting',
      p_admin_id: adminId,
    });

    console.log('Nov yield result:', JSON.stringify(result));

    // Verify Sam's yield (net after 16% fee)
    const samPos = await query('investor_positions', `investor_id=eq.${samId}&fund_id=eq.${fundId}`);
    const samValue = Number(samPos[0].current_value);
    // Sam should have: 184003 + net_yield
    // Gross 355, fee 16% = 56.8, IB 4% = 14.2, net = 284
    expect(samValue).toBeCloseTo(184003 + 284, 0);
    console.log(`Sam after Nov yield: ${samValue}`);

    // Verify fee conservation: gross = sum of all allocations
    const feesPos = await query('investor_positions', `investor_id=eq.${feesId}&fund_id=eq.${fundId}`);
    const ryanPos = await query('investor_positions', `investor_id=eq.${ryanId}&fund_id=eq.${fundId}`);
    const totalFeeCredits = Number(feesPos[0].current_value);
    const totalIbCredits = Number(ryanPos[0].current_value);
    console.log(`Fees account: ${totalFeeCredits}, Ryan IB: ${totalIbCredits}`);

    // Fee conservation: gross ≈ sam_net + fees + ib
    const conservation = 284 + totalFeeCredits + totalIbCredits;
    expect(conservation).toBeCloseTo(355, 0);
  });

  // =========================================================================
  // BLOCK D: MORE DEPOSITS + CRYSTALLIZATION
  // =========================================================================

  test('D1: Sam deposits 45,000 XRP (2025-11-30 — same day as yield)', async () => {
    await rpc('apply_investor_transaction', {
      p_fund_id: fundId,
      p_investor_id: samId,
      p_tx_type: 'DEPOSIT',
      p_amount: 45000,
      p_tx_date: '2025-11-30',
      p_reference_id: 'test-xrp-sam-deposit-3',
      p_admin_id: adminId,
    });

    const samPos = await query('investor_positions', `investor_id=eq.${samId}&fund_id=eq.${fundId}`);
    // 184003 + 284 (yield) + 45000 = 229287
    expect(Number(samPos[0].current_value)).toBeCloseTo(229287, 0);
  });

  test('D2: Sam deposits 49,500 XRP (2025-12-08)', async () => {
    await rpc('apply_investor_transaction', {
      p_fund_id: fundId,
      p_investor_id: samId,
      p_tx_type: 'DEPOSIT',
      p_amount: 49500,
      p_tx_date: '2025-12-08',
      p_reference_id: 'test-xrp-sam-deposit-4',
      p_admin_id: adminId,
    });

    const samPos = await query('investor_positions', `investor_id=eq.${samId}&fund_id=eq.${fundId}`);
    expect(Number(samPos[0].current_value)).toBeCloseTo(229287 + 49500, 0);
  });

  test('D3: Sam deposits 50,100 XRP (2025-12-15) — triggers crystallization', async () => {
    // Before this deposit, the Dec transaction yield of 487.8 gross was distributed
    // in production. Let's apply the transaction yield first.
    // Using canonical RPC: apply_segmented_yield_distribution_v5
    const txResult = await rpc('apply_segmented_yield_distribution_v5', {
      p_fund_id: fundId,
      p_period_end: '2025-12-15',
      p_recorded_aum: 278787, // AUM before this deposit
      p_purpose: 'transaction',
      p_admin_id: adminId,
    });
    console.log('Dec transaction yield result:', JSON.stringify(txResult));

    // Now the deposit
    await rpc('apply_investor_transaction', {
      p_fund_id: fundId,
      p_investor_id: samId,
      p_tx_type: 'DEPOSIT',
      p_amount: 50100,
      p_tx_date: '2025-12-15',
      p_reference_id: 'test-xrp-sam-deposit-5',
      p_admin_id: adminId,
    });
  });

  // =========================================================================
  // BLOCK E: DEC MONTH-END YIELD
  // =========================================================================

  test('E1: December month-end yield — 1,156.32 XRP gross', async () => {
    // Using canonical RPC: apply_segmented_yield_distribution_v5
    const result = await rpc('apply_segmented_yield_distribution_v5', {
      p_fund_id: fundId,
      p_period_end: '2025-12-31',
      p_recorded_aum: 329387, // AUM at end of Dec
      p_purpose: 'reporting',
      p_admin_id: adminId,
    });

    console.log('Dec month-end yield result:', JSON.stringify(result));

    // Verify distributions exist and are not voided
    const dists = await query('yield_distributions', `fund_id=eq.${fundId}&is_voided=eq.false&order=period_start`);
    expect(dists.length).toBeGreaterThanOrEqual(3); // Nov month_end, Dec transaction, Dec month_end
  });

  // =========================================================================
  // BLOCK F: WITHDRAWAL — Sam full exit
  // =========================================================================

  test('F1: Sam Johnson full withdrawal 330,500.42 XRP (2026-01-02)', async () => {
    // Get Sam's current balance first
    const samBefore = await query('investor_positions', `investor_id=eq.${samId}&fund_id=eq.${fundId}`);
    const balanceBefore = Number(samBefore[0].current_value);
    console.log(`Sam balance before withdrawal: ${balanceBefore}`);

    await rpc('apply_investor_transaction', {
      p_fund_id: fundId,
      p_investor_id: samId,
      p_tx_type: 'WITHDRAWAL',
      p_amount: -330500.42,
      p_tx_date: '2026-01-02',
      p_reference_id: 'test-xrp-sam-withdrawal-full',
      p_admin_id: adminId,
    });

    const samAfter = await query('investor_positions', `investor_id=eq.${samId}&fund_id=eq.${fundId}`);
    const balanceAfter = Number(samAfter[0].current_value);
    console.log(`Sam balance after withdrawal: ${balanceAfter}`);
    // Should be significantly reduced
    expect(balanceAfter).toBeLessThan(balanceBefore);
  });

  // =========================================================================
  // BLOCK G: POST-WITHDRAWAL DEPOSITS
  // =========================================================================

  test('G1: Indigo Fees deposits 253.136 XRP + Ryan deposits 63.284 XRP (2026-01-05)', async () => {
    await rpc('apply_investor_transaction', {
      p_fund_id: fundId,
      p_investor_id: feesId,
      p_tx_type: 'DEPOSIT',
      p_amount: 253.136,
      p_tx_date: '2026-01-05',
      p_reference_id: 'test-xrp-fees-deposit-1',
      p_admin_id: adminId,
    });

    await rpc('apply_investor_transaction', {
      p_fund_id: fundId,
      p_investor_id: ryanId,
      p_tx_type: 'DEPOSIT',
      p_amount: 63.284,
      p_tx_date: '2026-01-05',
      p_reference_id: 'test-xrp-ryan-deposit-1',
      p_admin_id: adminId,
    });

    const feesPos = await query('investor_positions', `investor_id=eq.${feesId}&fund_id=eq.${fundId}`);
    const ryanPos = await query('investor_positions', `investor_id=eq.${ryanId}&fund_id=eq.${fundId}`);
    console.log(`Fees after deposit: ${feesPos[0].current_value}`);
    console.log(`Ryan after deposit: ${ryanPos[0].current_value}`);
  });

  // =========================================================================
  // BLOCK H: JAN MONTH-END YIELD
  // =========================================================================

  test('H1: January month-end yield — 0.6 XRP gross', async () => {
    // Using canonical RPC: apply_segmented_yield_distribution_v5
    const result = await rpc('apply_segmented_yield_distribution_v5', {
      p_fund_id: fundId,
      p_period_end: '2026-01-31',
      p_recorded_aum: 795, // Post-withdrawal AUM
      p_purpose: 'reporting',
      p_admin_id: adminId,
    });

    console.log('Jan yield result:', JSON.stringify(result));
  });

  // =========================================================================
  // BLOCK I: RECONCILIATION — Verify final state
  // =========================================================================

  test('I1: Final reconciliation — all integrity checks pass', async () => {
    // 1. Check leakage report
    const leakage = await rpc('audit_leakage_report');
    console.log('Leakage report:', JSON.stringify(leakage));
    expect((leakage as { overall_status: string }).overall_status).toBe('pass');

    // 2. Cost basis mismatch = 0
    const mismatches = await query('v_cost_basis_mismatch', `fund_id=eq.${fundId}`);
    expect(mismatches.length).toBe(0);

    // 3. Ledger reconciliation = 0 drift
    const drift = await query('v_ledger_reconciliation');
    expect(drift.length).toBe(0);

    // 4. No orphaned transactions
    const orphans = await query('v_orphaned_transactions');
    expect(orphans.length).toBe(0);

    // 5. No negative positions
    const positions = await query('investor_positions', `fund_id=eq.${fundId}&is_active=eq.true`);
    for (const pos of positions) {
      expect(Number(pos.current_value)).toBeGreaterThanOrEqual(0);
      expect(Number(pos.cost_basis)).toBeGreaterThanOrEqual(0);
      expect(Number(pos.shares)).toBeGreaterThanOrEqual(0);
    }

    console.log('=== FINAL POSITIONS ===');
    for (const pos of positions) {
      const profile = await query('profiles', `id=eq.${pos.investor_id}&select=email`);
      console.log(`${profile[0]?.email}: value=${pos.current_value}, cost_basis=${pos.cost_basis}, shares=${pos.shares}`);
    }
  });

  test('I2: Fee conservation across all distributions', async () => {
    const distributions = await query('yield_distributions', `fund_id=eq.${fundId}&is_voided=eq.false`);

    for (const dist of distributions) {
      const gross = Number(dist.gross_yield_amount);
      const net = Number(dist.total_net_amount);
      const fees = Number(dist.total_fee_amount);
      const ib = Number(dist.total_ib_amount);

      // Conservation: gross = net + fees + ib (within rounding tolerance)
      const sum = net + fees + ib;
      const diff = Math.abs(gross - sum);
      console.log(`Dist ${dist.period_end} (${dist.distribution_type}): gross=${gross}, net=${net}, fees=${fees}, ib=${ib}, diff=${diff}`);
      expect(diff).toBeLessThan(0.01);
    }
  });

  // =========================================================================
  // BLOCK J: UI SMOKE TEST — Login and verify admin dashboard
  // =========================================================================

  test('J1: Login as admin and verify dashboard loads', async ({ page }) => {
    await login(page);
    // Should be on admin dashboard
    await expect(page).toHaveURL(/\/admin/);
    // Page should not have console errors (check for JS errors)
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Verify no critical JS errors (filter out known benign ones)
    const criticalErrors = errors.filter(e => !e.includes('ResizeObserver') && !e.includes('Non-Error'));
    if (criticalErrors.length > 0) {
      console.log('Page errors:', criticalErrors);
    }
    expect(criticalErrors.length).toBe(0);
  });

  test('J2: Navigate to yield distributions page', async ({ page }) => {
    await login(page);
    await page.goto('/admin/yield-distributions');
    await page.waitForTimeout(2000);

    // Page should load without errors
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e => !e.includes('ResizeObserver') && !e.includes('Non-Error'));
    expect(criticalErrors.length).toBe(0);
  });

  test('J3: Navigate to investors page', async ({ page }) => {
    await login(page);
    await page.goto('/admin/investors');
    await page.waitForTimeout(2000);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e => !e.includes('ResizeObserver') && !e.includes('Non-Error'));
    expect(criticalErrors.length).toBe(0);
  });

  test('J4: Navigate to transactions page', async ({ page }) => {
    await login(page);
    await page.goto('/admin/transactions');
    await page.waitForTimeout(2000);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e => !e.includes('ResizeObserver') && !e.includes('Non-Error'));
    expect(criticalErrors.length).toBe(0);
  });
});
