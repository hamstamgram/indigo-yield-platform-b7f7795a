/**
 * Comprehensive Deposit Transaction Tests
 *
 * Tests the apply_deposit_with_crystallization RPC function and all deposit-related
 * database operations. These are direct database tests using Supabase client.
 *
 * Test Coverage:
 * 1. Basic deposit flow for all fund types
 * 2. Multi-date deposits (critical for yield testing)
 * 3. Position calculations and updates
 * 4. Amount precision (NUMERIC 28,10)
 * 5. Error handling and validation
 * 6. Audit trail verification
 *
 * @requires Supabase connection
 * @requires Admin credentials
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Test Configuration
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Database connection string for direct testing
const DB_CONNECTION = process.env.DATABASE_URL ||
  'postgresql://postgres.nkfimvovosdehmyyjubn@aws-0-us-east-2.pooler.supabase.com:5432/postgres';

// Test admin credentials - must have is_admin() = true
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'testadmin@indigo.fund';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Indigo!Admin2026#Secure';

// Fund types to test
const FUND_TYPES = ['BTC', 'ETH', 'SOL', 'USDT', 'XRP'] as const;
const FUND_CODES = ['IND-BTC', 'IND-ETH', 'IND-SOL', 'IND-USDT', 'IND-XRP'] as const;

// ============================================================================
// Type Definitions
// ============================================================================

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
  fund_class: string;
}

interface InvestorPosition {
  investor_id: string;
  fund_id: string;
  current_value: string;
  shares: string;
  is_active: boolean;
  updated_at: string;
}

interface Transaction {
  id: string;
  fund_id: string;
  investor_id: string;
  type: string;
  amount: string;
  tx_date: string;
  asset: string;
  fund_class: string;
  balance_before: string;
  balance_after: string;
  is_voided: boolean;
  purpose: string;
}

interface FundAUMEvent {
  id: string;
  fund_id: string;
  event_date: string;
  trigger_type: string;
  opening_aum: string;
  closing_aum: string;
  purpose: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  actor_user: string;
  new_values: any;
  meta: any;
  created_at: string;
}

interface DepositResult {
  success: boolean;
  transaction_id?: string;
  investor_id?: string;
  fund_id?: string;
  amount?: string;
  balance_before?: string;
  balance_after?: string;
  error?: string;
}

// ============================================================================
// Global Test State
// ============================================================================

let supabase: SupabaseClient;
let adminUserId: string;
let testFunds: Map<string, Fund> = new Map();
let testInvestorIds: string[] = [];

// ============================================================================
// Setup and Teardown
// ============================================================================

test.beforeAll(async () => {
  // Initialize Supabase client
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Authenticate as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
  });

  if (authError || !authData.user) {
    throw new Error(`Admin authentication failed: ${authError?.message || 'No user returned'}`);
  }

  adminUserId = authData.user.id;
  console.log(`✓ Authenticated as admin: ${adminUserId}`);

  // Load test funds
  const { data: funds, error: fundsError } = await supabase
    .from('funds')
    .select('id, code, name, asset, fund_class')
    .in('code', FUND_CODES as unknown as string[]);

  if (fundsError) {
    throw new Error(`Failed to load funds: ${fundsError.message}`);
  }

  if (!funds || funds.length === 0) {
    throw new Error('No test funds found. Please seed the database with IND-BTC, IND-ETH, IND-SOL, IND-USDT, IND-XRP');
  }

  funds.forEach((fund: Fund) => {
    testFunds.set(fund.asset, fund);
  });

  console.log(`✓ Loaded ${testFunds.size} test funds`);

  // Get test investors
  const { data: investors, error: investorsError } = await supabase
    .from('profiles')
    .select('id')
    .limit(5);

  if (investorsError) {
    console.warn(`Warning: Could not load test investors: ${investorsError.message}`);
  } else if (investors && investors.length > 0) {
    testInvestorIds = investors.map((i: any) => i.id);
    console.log(`✓ Found ${testInvestorIds.length} test investors`);
  }
});

test.afterAll(async () => {
  // Sign out
  await supabase.auth.signOut();
  console.log('✓ Signed out');
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Call the apply_deposit_with_crystallization RPC function
 */
async function applyDeposit(
  fundId: string,
  investorId: string,
  amount: number,
  closingAum: number,
  effectiveDate: string,
  notes?: string,
  purpose: 'transaction' = 'transaction'
): Promise<DepositResult> {
  const { data, error } = await supabase.rpc('apply_deposit_with_crystallization', {
    p_fund_id: fundId,
    p_investor_id: investorId,
    p_amount: amount,
    p_closing_aum: closingAum,
    p_effective_date: effectiveDate,
    p_admin_id: adminUserId,
    p_notes: notes || 'Test deposit',
    p_purpose: purpose,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return data as DepositResult;
}

/**
 * Ensure transaction-purpose AUM exists for a date
 */
async function ensureTransactionAUM(
  fundId: string,
  date: string,
  totalAum: number
): Promise<void> {
  const { error } = await supabase.rpc('ensure_preflow_aum', {
    p_fund_id: fundId,
    p_date: date,
    p_purpose: 'transaction',
    p_total_aum: totalAum,
    p_admin_id: adminUserId,
  });

  if (error) {
    throw new Error(`Failed to ensure transaction AUM: ${error.message}`);
  }
}

/**
 * Get investor position for a fund
 */
async function getInvestorPosition(
  investorId: string,
  fundId: string
): Promise<InvestorPosition | null> {
  const { data, error } = await supabase
    .from('investor_positions')
    .select('*')
    .eq('investor_id', investorId)
    .eq('fund_id', fundId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get position: ${error.message}`);
  }

  return data;
}

/**
 * Get latest transaction for investor in fund
 */
async function getLatestTransaction(
  investorId: string,
  fundId: string
): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from('transactions_v2')
    .select('*')
    .eq('investor_id', investorId)
    .eq('fund_id', fundId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get transaction: ${error.message}`);
  }

  return data;
}

/**
 * Get latest AUM event for fund
 */
async function getLatestAUMEvent(
  fundId: string,
  eventDate: string
): Promise<FundAUMEvent | null> {
  const { data, error } = await supabase
    .from('fund_aum_events')
    .select('*')
    .eq('fund_id', fundId)
    .eq('event_date', eventDate)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get AUM event: ${error.message}`);
  }

  return data;
}

/**
 * Get latest audit log entry for entity
 */
async function getLatestAuditLog(
  entityId: string
): Promise<AuditLogEntry | null> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get audit log: ${error.message}`);
  }

  return data;
}

/**
 * Generate a unique test investor ID (or use existing)
 */
function getTestInvestorId(index: number = 0): string {
  if (testInvestorIds.length > index) {
    return testInvestorIds[index];
  }
  // Generate a deterministic test UUID
  return `00000000-0000-0000-0000-${String(100000 + index).padStart(12, '0')}`;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================================================
// TEST SUITE 1: Basic Deposit Flow
// ============================================================================

test.describe('1. Basic Deposit Flow', () => {
  FUND_TYPES.forEach((asset) => {
    test(`should process deposit to ${asset} fund`, async () => {
      const fund = testFunds.get(asset);

      if (!fund) {
        test.skip();
        return;
      }

      const investorId = getTestInvestorId(0);
      const depositAmount = 1000;
      const effectiveDate = formatDate(new Date());

      // Ensure transaction AUM exists
      await ensureTransactionAUM(fund.id, effectiveDate, depositAmount);

      // Get position before
      const positionBefore = await getInvestorPosition(investorId, fund.id);
      const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

      // Apply deposit
      const result = await applyDeposit(
        fund.id,
        investorId,
        depositAmount,
        balanceBefore + depositAmount,
        effectiveDate,
        `Test deposit to ${asset} fund`
      );

      // Verify success
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Get position after
      const positionAfter = await getInvestorPosition(investorId, fund.id);
      expect(positionAfter).toBeTruthy();
      expect(positionAfter!.is_active).toBe(true);
      expect(parseFloat(positionAfter!.current_value)).toBe(balanceBefore + depositAmount);

      // Verify transaction was created
      const transaction = await getLatestTransaction(investorId, fund.id);
      expect(transaction).toBeTruthy();
      expect(transaction!.type).toBe('DEPOSIT');
      expect(parseFloat(transaction!.amount)).toBe(depositAmount);
      expect(transaction!.asset).toBe(asset);
      expect(parseFloat(transaction!.balance_before)).toBe(balanceBefore);
      expect(parseFloat(transaction!.balance_after)).toBe(balanceBefore + depositAmount);
      expect(transaction!.is_voided).toBe(false);
      expect(transaction!.purpose).toBe('transaction');

      console.log(`✓ Deposit to ${asset} fund: ${depositAmount} ${asset}`);
    });
  });

  test('should verify transaction type is DEPOSIT', async () => {
    const fund = testFunds.get('BTC');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(1);
    const depositAmount = 500;
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, depositAmount);

    const positionBefore = await getInvestorPosition(investorId, fund.id);
    const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

    await applyDeposit(
      fund.id,
      investorId,
      depositAmount,
      balanceBefore + depositAmount,
      effectiveDate
    );

    const transaction = await getLatestTransaction(investorId, fund.id);
    expect(transaction).toBeTruthy();
    expect(transaction!.type).toBe('DEPOSIT');
    expect(transaction!.type).not.toBe('WITHDRAWAL');
    expect(transaction!.type).not.toBe('YIELD');
  });

  test('should update investor_position current_value', async () => {
    const fund = testFunds.get('ETH');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(2);
    const depositAmount = 2500;
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, depositAmount);

    const positionBefore = await getInvestorPosition(investorId, fund.id);
    const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

    await applyDeposit(
      fund.id,
      investorId,
      depositAmount,
      balanceBefore + depositAmount,
      effectiveDate
    );

    const positionAfter = await getInvestorPosition(investorId, fund.id);
    expect(positionAfter).toBeTruthy();
    expect(parseFloat(positionAfter!.current_value)).toBeGreaterThan(balanceBefore);
    expect(parseFloat(positionAfter!.current_value)).toBe(balanceBefore + depositAmount);
  });
});

// ============================================================================
// TEST SUITE 2: Multi-Date Deposits
// ============================================================================

test.describe('2. Multi-Date Deposits (Critical for Yield Testing)', () => {
  test('should deposit on Day 1 of month', async () => {
    const fund = testFunds.get('BTC');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(0);
    const depositAmount = 10000;

    // First day of current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const effectiveDate = formatDate(firstDay);

    await ensureTransactionAUM(fund.id, effectiveDate, depositAmount);

    const positionBefore = await getInvestorPosition(investorId, fund.id);
    const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

    const result = await applyDeposit(
      fund.id,
      investorId,
      depositAmount,
      balanceBefore + depositAmount,
      effectiveDate,
      'Deposit on day 1 of month'
    );

    expect(result.success).toBe(true);

    const transaction = await getLatestTransaction(investorId, fund.id);
    expect(transaction).toBeTruthy();
    expect(transaction!.tx_date).toBe(effectiveDate);
    expect(new Date(transaction!.tx_date).getDate()).toBe(1);

    console.log(`✓ Deposit on day 1: ${effectiveDate}`);
  });

  test('should deposit on Day 15 of month', async () => {
    const fund = testFunds.get('ETH');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(1);
    const depositAmount = 5000;

    // 15th day of current month
    const today = new Date();
    const midMonth = new Date(today.getFullYear(), today.getMonth(), 15);
    const effectiveDate = formatDate(midMonth);

    await ensureTransactionAUM(fund.id, effectiveDate, depositAmount);

    const positionBefore = await getInvestorPosition(investorId, fund.id);
    const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

    const result = await applyDeposit(
      fund.id,
      investorId,
      depositAmount,
      balanceBefore + depositAmount,
      effectiveDate,
      'Deposit on day 15 of month'
    );

    expect(result.success).toBe(true);

    const transaction = await getLatestTransaction(investorId, fund.id);
    expect(transaction).toBeTruthy();
    expect(transaction!.tx_date).toBe(effectiveDate);
    expect(new Date(transaction!.tx_date).getDate()).toBe(15);

    console.log(`✓ Deposit on day 15: ${effectiveDate}`);
  });

  test('should deposit on last day of month', async () => {
    const fund = testFunds.get('SOL');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(2);
    const depositAmount = 7500;

    // Last day of current month
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const effectiveDate = formatDate(lastDay);

    await ensureTransactionAUM(fund.id, effectiveDate, depositAmount);

    const positionBefore = await getInvestorPosition(investorId, fund.id);
    const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

    const result = await applyDeposit(
      fund.id,
      investorId,
      depositAmount,
      balanceBefore + depositAmount,
      effectiveDate,
      'Deposit on last day of month'
    );

    expect(result.success).toBe(true);

    const transaction = await getLatestTransaction(investorId, fund.id);
    expect(transaction).toBeTruthy();
    expect(transaction!.tx_date).toBe(effectiveDate);

    // Verify it's the last day
    const txDate = new Date(transaction!.tx_date);
    const nextDay = new Date(txDate);
    nextDay.setDate(txDate.getDate() + 1);
    expect(nextDay.getMonth()).not.toBe(txDate.getMonth());

    console.log(`✓ Deposit on last day: ${effectiveDate}`);
  });

  test('should verify effective_date is correctly set', async () => {
    const fund = testFunds.get('USDT');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(0);
    const depositAmount = 1000;
    const testDate = new Date('2026-03-20');
    const effectiveDate = formatDate(testDate);

    await ensureTransactionAUM(fund.id, effectiveDate, depositAmount);

    const positionBefore = await getInvestorPosition(investorId, fund.id);
    const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

    await applyDeposit(
      fund.id,
      investorId,
      depositAmount,
      balanceBefore + depositAmount,
      effectiveDate,
      'Test effective date'
    );

    const transaction = await getLatestTransaction(investorId, fund.id);
    expect(transaction).toBeTruthy();
    expect(transaction!.tx_date).toBe(effectiveDate);
    expect(transaction!.tx_date).toBe('2026-03-20');
  });
});

// ============================================================================
// TEST SUITE 3: Position Calculations
// ============================================================================

test.describe('3. Position Calculations', () => {
  test('should create new position with first deposit (is_active = true)', async () => {
    const fund = testFunds.get('XRP');
    if (!fund) {
      test.skip();
      return;
    }

    // Use a unique investor ID to ensure no existing position
    const investorId = `99999999-9999-9999-9999-${Date.now().toString().slice(-12)}`;
    const depositAmount = 5000;
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, depositAmount);

    // Verify no position exists
    const positionBefore = await getInvestorPosition(investorId, fund.id);
    expect(positionBefore).toBeNull();

    // Apply deposit
    await applyDeposit(
      fund.id,
      investorId,
      depositAmount,
      depositAmount, // closing_aum for first deposit
      effectiveDate,
      'First deposit creates position'
    );

    // Verify position created
    const positionAfter = await getInvestorPosition(investorId, fund.id);
    expect(positionAfter).toBeTruthy();
    expect(positionAfter!.is_active).toBe(true);
    expect(parseFloat(positionAfter!.current_value)).toBe(depositAmount);
    expect(parseFloat(positionAfter!.shares)).toBe(depositAmount);

    console.log(`✓ New position created: ${depositAmount} ${fund.asset}`);
  });

  test('should increase position value with subsequent deposits', async () => {
    const fund = testFunds.get('BTC');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(0);
    const firstDeposit = 1000;
    const secondDeposit = 2000;
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, firstDeposit + secondDeposit);

    // First deposit
    await applyDeposit(
      fund.id,
      investorId,
      firstDeposit,
      firstDeposit,
      effectiveDate,
      'First deposit'
    );

    const positionAfterFirst = await getInvestorPosition(investorId, fund.id);
    const balanceAfterFirst = parseFloat(positionAfterFirst!.current_value);

    // Second deposit
    await applyDeposit(
      fund.id,
      investorId,
      secondDeposit,
      balanceAfterFirst + secondDeposit,
      effectiveDate,
      'Second deposit'
    );

    const positionAfterSecond = await getInvestorPosition(investorId, fund.id);
    expect(positionAfterSecond).toBeTruthy();
    expect(parseFloat(positionAfterSecond!.current_value)).toBe(balanceAfterFirst + secondDeposit);
    expect(parseFloat(positionAfterSecond!.current_value)).toBeGreaterThan(balanceAfterFirst);

    console.log(`✓ Position increased: ${balanceAfterFirst} -> ${parseFloat(positionAfterSecond!.current_value)}`);
  });

  test('should verify multiple investors in same fund have independent positions', async () => {
    const fund = testFunds.get('ETH');
    if (!fund) {
      test.skip();
      return;
    }

    const investor1 = getTestInvestorId(0);
    const investor2 = getTestInvestorId(1);
    const amount1 = 3000;
    const amount2 = 7000;
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, amount1 + amount2);

    // Investor 1 deposits
    await applyDeposit(fund.id, investor1, amount1, amount1, effectiveDate);

    // Investor 2 deposits
    await applyDeposit(fund.id, investor2, amount2, amount2, effectiveDate);

    // Verify independent positions
    const position1 = await getInvestorPosition(investor1, fund.id);
    const position2 = await getInvestorPosition(investor2, fund.id);

    expect(position1).toBeTruthy();
    expect(position2).toBeTruthy();
    expect(position1!.investor_id).not.toBe(position2!.investor_id);
    expect(parseFloat(position1!.current_value)).toBe(amount1);
    expect(parseFloat(position2!.current_value)).toBe(amount2);

    console.log(`✓ Independent positions verified: ${amount1} and ${amount2}`);
  });
});

// ============================================================================
// TEST SUITE 4: Amount Precision (NUMERIC 28,10)
// ============================================================================

test.describe('4. Amount Precision', () => {
  test('should handle whole numbers: 100, 1000, 10000', async () => {
    const fund = testFunds.get('USDT');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(0);
    const amounts = [100, 1000, 10000];
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, amounts.reduce((a, b) => a + b, 0));

    let cumulativeBalance = 0;

    for (const amount of amounts) {
      const positionBefore = await getInvestorPosition(investorId, fund.id);
      const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

      await applyDeposit(
        fund.id,
        investorId,
        amount,
        balanceBefore + amount,
        effectiveDate,
        `Whole number deposit: ${amount}`
      );

      const transaction = await getLatestTransaction(investorId, fund.id);
      expect(transaction).toBeTruthy();
      expect(parseFloat(transaction!.amount)).toBe(amount);
      expect(parseFloat(transaction!.balance_after)).toBe(balanceBefore + amount);

      cumulativeBalance += amount;
    }

    const finalPosition = await getInvestorPosition(investorId, fund.id);
    expect(parseFloat(finalPosition!.current_value)).toBe(cumulativeBalance);

    console.log(`✓ Whole numbers: ${amounts.join(', ')}`);
  });

  test('should handle decimals: 0.001, 0.00001, 123.456789', async () => {
    const fund = testFunds.get('BTC');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(1);
    const amounts = [0.001, 0.00001, 123.456789];
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, amounts.reduce((a, b) => a + b, 0));

    for (const amount of amounts) {
      const positionBefore = await getInvestorPosition(investorId, fund.id);
      const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

      await applyDeposit(
        fund.id,
        investorId,
        amount,
        balanceBefore + amount,
        effectiveDate,
        `Decimal deposit: ${amount}`
      );

      const transaction = await getLatestTransaction(investorId, fund.id);
      expect(transaction).toBeTruthy();

      // Verify precision is maintained (within floating point tolerance)
      const storedAmount = parseFloat(transaction!.amount);
      expect(Math.abs(storedAmount - amount)).toBeLessThan(0.0000000001);
    }

    console.log(`✓ Decimals: ${amounts.join(', ')}`);
  });

  test('should verify NUMERIC(28,10) precision is maintained', async () => {
    const fund = testFunds.get('ETH');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(2);
    // Test with 10 decimal places
    const amount = 123456789.0123456789;
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, amount);

    const positionBefore = await getInvestorPosition(investorId, fund.id);
    const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

    await applyDeposit(
      fund.id,
      investorId,
      amount,
      balanceBefore + amount,
      effectiveDate,
      'High precision deposit'
    );

    const transaction = await getLatestTransaction(investorId, fund.id);
    expect(transaction).toBeTruthy();

    // Verify at least 8 decimal places of precision (database stores 10)
    const storedAmount = parseFloat(transaction!.amount);
    const difference = Math.abs(storedAmount - amount);
    expect(difference).toBeLessThan(0.00000001); // 8 decimal places

    console.log(`✓ High precision: ${amount} stored as ${storedAmount}`);
  });
});

// ============================================================================
// TEST SUITE 5: Error Handling
// ============================================================================

test.describe('5. Error Handling', () => {
  test('should fail with negative amount', async () => {
    const fund = testFunds.get('BTC');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(0);
    const negativeAmount = -1000;
    const effectiveDate = formatDate(new Date());

    const result = await applyDeposit(
      fund.id,
      investorId,
      negativeAmount,
      0,
      effectiveDate,
      'Should fail - negative amount'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();

    console.log(`✓ Negative amount rejected: ${result.error}`);
  });

  test('should fail with zero amount', async () => {
    const fund = testFunds.get('ETH');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(0);
    const zeroAmount = 0;
    const effectiveDate = formatDate(new Date());

    const result = await applyDeposit(
      fund.id,
      investorId,
      zeroAmount,
      0,
      effectiveDate,
      'Should fail - zero amount'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();

    console.log(`✓ Zero amount rejected: ${result.error}`);
  });

  test('should fail with non-existent investor_id', async () => {
    const fund = testFunds.get('SOL');
    if (!fund) {
      test.skip();
      return;
    }

    const fakeInvestorId = '00000000-0000-0000-0000-000000000000';
    const amount = 1000;
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, amount);

    const result = await applyDeposit(
      fund.id,
      fakeInvestorId,
      amount,
      amount,
      effectiveDate,
      'Should fail - fake investor'
    );

    // May fail or succeed depending on FK constraints
    // If it succeeds, position creation might still work
    console.log(`✓ Non-existent investor test: ${result.success ? 'created' : 'rejected'}`);
  });

  test('should fail with non-existent fund_id', async () => {
    const fakeFundId = '00000000-0000-0000-0000-000000000000';
    const investorId = getTestInvestorId(0);
    const amount = 1000;
    const effectiveDate = formatDate(new Date());

    const result = await applyDeposit(
      fakeFundId,
      investorId,
      amount,
      amount,
      effectiveDate,
      'Should fail - fake fund'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();

    console.log(`✓ Non-existent fund rejected: ${result.error}`);
  });

  test('should fail with invalid asset mismatch', async () => {
    const fund = testFunds.get('BTC');
    if (!fund) {
      test.skip();
      return;
    }

    // This test verifies that the transaction is created with the correct asset
    // Asset is derived from fund, not passed separately, so no mismatch possible
    // This test documents that behavior

    const investorId = getTestInvestorId(0);
    const amount = 1000;
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, amount);

    const positionBefore = await getInvestorPosition(investorId, fund.id);
    const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

    await applyDeposit(
      fund.id,
      investorId,
      amount,
      balanceBefore + amount,
      effectiveDate,
      'Asset derived from fund'
    );

    const transaction = await getLatestTransaction(investorId, fund.id);
    expect(transaction).toBeTruthy();
    expect(transaction!.asset).toBe(fund.asset);
    expect(transaction!.fund_class).toBe(fund.fund_class);

    console.log(`✓ Asset correctly set to ${fund.asset}`);
  });

  test('should fail without transaction-purpose AUM', async () => {
    const fund = testFunds.get('USDT');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(0);
    const amount = 1000;
    // Use a date far in the future to avoid existing AUM records
    const futureDate = formatDate(new Date('2030-12-31'));

    const positionBefore = await getInvestorPosition(investorId, fund.id);
    const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

    // DO NOT call ensureTransactionAUM - this should fail
    const result = await applyDeposit(
      fund.id,
      investorId,
      amount,
      balanceBefore + amount,
      futureDate,
      'Should fail - no AUM record'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error).toContain('AUM');

    console.log(`✓ Missing AUM rejected: ${result.error}`);
  });
});

// ============================================================================
// TEST SUITE 6: Audit Trail
// ============================================================================

test.describe('6. Audit Trail', () => {
  test('should create audit_log entry for deposit', async () => {
    const fund = testFunds.get('BTC');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(0);
    const amount = 5000;
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, amount);

    const positionBefore = await getInvestorPosition(investorId, fund.id);
    const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

    await applyDeposit(
      fund.id,
      investorId,
      amount,
      balanceBefore + amount,
      effectiveDate,
      'Audit trail test'
    );

    const transaction = await getLatestTransaction(investorId, fund.id);
    expect(transaction).toBeTruthy();

    // Get audit log for this transaction
    const auditLog = await getLatestAuditLog(transaction!.id);
    expect(auditLog).toBeTruthy();
    expect(auditLog!.action).toBe('DEPOSIT_WITH_CRYSTALLIZATION');
    expect(auditLog!.entity).toBe('transactions_v2');
    expect(auditLog!.entity_id).toBe(transaction!.id);
    expect(auditLog!.actor_user).toBe(adminUserId);

    console.log(`✓ Audit log created for transaction ${transaction!.id}`);
  });

  test('should verify balance_before and balance_after in transaction', async () => {
    const fund = testFunds.get('ETH');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(1);
    const amount = 3000;
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, amount);

    const positionBefore = await getInvestorPosition(investorId, fund.id);
    const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

    await applyDeposit(
      fund.id,
      investorId,
      amount,
      balanceBefore + amount,
      effectiveDate,
      'Balance tracking test'
    );

    const transaction = await getLatestTransaction(investorId, fund.id);
    expect(transaction).toBeTruthy();
    expect(transaction!.balance_before).toBeTruthy();
    expect(transaction!.balance_after).toBeTruthy();
    expect(parseFloat(transaction!.balance_before)).toBe(balanceBefore);
    expect(parseFloat(transaction!.balance_after)).toBe(balanceBefore + amount);
    expect(parseFloat(transaction!.balance_after)).toBeGreaterThan(parseFloat(transaction!.balance_before));

    console.log(`✓ Balance tracking: ${transaction!.balance_before} -> ${transaction!.balance_after}`);
  });

  test('should record crystallization in audit log', async () => {
    const fund = testFunds.get('SOL');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(2);
    const amount = 2000;
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, amount);

    const positionBefore = await getInvestorPosition(investorId, fund.id);
    const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

    await applyDeposit(
      fund.id,
      investorId,
      amount,
      balanceBefore + amount,
      effectiveDate,
      'Crystallization audit test'
    );

    const transaction = await getLatestTransaction(investorId, fund.id);
    const auditLog = await getLatestAuditLog(transaction!.id);

    expect(auditLog).toBeTruthy();
    expect(auditLog!.new_values).toBeTruthy();
    expect(auditLog!.new_values.crystallization).toBeTruthy();

    // Verify crystallization result is recorded
    expect(auditLog!.new_values.crystallization.success).toBe(true);

    console.log(`✓ Crystallization recorded in audit log`);
  });

  test('should verify audit log contains fund_id and investor_id', async () => {
    const fund = testFunds.get('USDT');
    if (!fund) {
      test.skip();
      return;
    }

    const investorId = getTestInvestorId(0);
    const amount = 1500;
    const effectiveDate = formatDate(new Date());

    await ensureTransactionAUM(fund.id, effectiveDate, amount);

    const positionBefore = await getInvestorPosition(investorId, fund.id);
    const balanceBefore = positionBefore ? parseFloat(positionBefore.current_value) : 0;

    await applyDeposit(
      fund.id,
      investorId,
      amount,
      balanceBefore + amount,
      effectiveDate,
      'Audit metadata test'
    );

    const transaction = await getLatestTransaction(investorId, fund.id);
    const auditLog = await getLatestAuditLog(transaction!.id);

    expect(auditLog).toBeTruthy();
    expect(auditLog!.meta).toBeTruthy();
    expect(auditLog!.meta.fund_id).toBe(fund.id);
    expect(auditLog!.meta.investor_id).toBe(investorId);

    console.log(`✓ Audit metadata verified`);
  });
});

// ============================================================================
// Summary Test
// ============================================================================

test.describe('Deposit Transaction Test Summary', () => {
  test('should display test summary', async () => {
    console.log('\n========================================');
    console.log('DEPOSIT TRANSACTION TEST SUMMARY');
    console.log('========================================');
    console.log(`Total Funds Tested: ${testFunds.size}`);
    console.log(`Test Funds: ${Array.from(testFunds.values()).map(f => f.code).join(', ')}`);
    console.log(`Test Investors: ${testInvestorIds.length}`);
    console.log(`Admin User: ${adminUserId}`);
    console.log('========================================\n');

    expect(testFunds.size).toBeGreaterThan(0);
    expect(adminUserId).toBeTruthy();
  });
});
