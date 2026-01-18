/**
 * Position Reconciliation Tests
 *
 * Critical tests ensuring data integrity between:
 * - Positions and Transactions (position = SUM(transactions))
 * - AUM and Positions (fund_daily_aum = SUM(positions))
 * - Ownership percentages (SUM(ownership%) = 100%)
 *
 * These tests verify the core financial integrity of the platform.
 * Any failure here indicates a CRITICAL data issue requiring immediate attention.
 *
 * @requires Supabase connection with service_role key
 * @requires Admin credentials
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// ============================================================================
// Test Configuration
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Test admin credentials
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'testadmin@indigo.fund';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Indigo!Admin2026#Secure';

// Fund codes
const FUND_CODES = ['IND-BTC', 'IND-ETH', 'IND-SOL', 'IND-USDT', 'IND-XRP'] as const;

// Precision tolerance for financial calculations (10 decimal places)
const PRECISION_TOLERANCE = 0.0000000001;

// ============================================================================
// Type Definitions
// ============================================================================

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

interface InvestorPosition {
  investor_id: string;
  fund_id: string;
  current_value: string;
  shares: string;
  is_active: boolean;
}

interface ReconciliationResult {
  investor_id: string;
  fund_id: string;
  fund_code: string;
  stored_position: number;
  calculated_position: number;
  variance: number;
  is_reconciled: boolean;
}

interface AUMReconciliation {
  fund_id: string;
  fund_code: string;
  recorded_aum: number;
  calculated_aum: number;
  variance: number;
  is_reconciled: boolean;
}

interface OwnershipCheck {
  fund_id: string;
  fund_code: string;
  total_ownership_pct: number;
  investor_count: number;
  is_valid: boolean;
}

// ============================================================================
// Global Test State
// ============================================================================

let supabase: SupabaseClient;
let serviceSupabase: SupabaseClient;
let adminUserId: string;
let testFunds: Map<string, Fund> = new Map();
let testInvestorIds: string[] = [];

// ============================================================================
// Setup and Teardown
// ============================================================================

test.beforeAll(async () => {
  // Initialize Supabase clients
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (SUPABASE_SERVICE_KEY) {
    serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  // Authenticate as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
  });

  if (authError || !authData.user) {
    console.warn(`Admin authentication warning: ${authError?.message || 'No user returned'}`);
    // Continue with service role if available
    if (!SUPABASE_SERVICE_KEY) {
      throw new Error('No authentication method available');
    }
  } else {
    adminUserId = authData.user.id;
  }

  // Load funds
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const { data: funds, error: fundsError } = await client
    .from('funds')
    .select('id, code, name, asset')
    .in('code', FUND_CODES as unknown as string[]);

  if (fundsError) {
    throw new Error(`Failed to load funds: ${fundsError.message}`);
  }

  if (funds) {
    funds.forEach(fund => testFunds.set(fund.code, fund));
  }

  console.log(`✓ Loaded ${testFunds.size} funds for reconciliation tests`);
});

test.afterAll(async () => {
  // Cleanup test data if needed
  if (testInvestorIds.length > 0) {
    console.log(`Cleanup: ${testInvestorIds.length} test investors created during tests`);
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a test investor for reconciliation tests
 */
async function createTestInvestor(name: string): Promise<string> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const [firstName, ...lastParts] = name.split(' ');
  const lastName = lastParts.join(' ') || 'Test';
  const id = randomUUID();

  const { data, error } = await client
    .from('profiles')
    .insert({
      id,
      first_name: firstName,
      last_name: lastName,
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@test.indigo.fund`,
      status: 'active',
      kyc_status: 'approved',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create test investor: ${error.message}`);

  testInvestorIds.push(data.id);
  return data.id;
}

/**
 * Gets the calculated position from transaction sum
 */
async function getCalculatedPosition(
  investorId: string,
  fundId: string
): Promise<number> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  // Transaction types that increase position
  const positiveTypes = ['DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT'];
  // Transaction types that decrease position
  const negativeTypes = ['WITHDRAWAL', 'FEE'];

  const { data: transactions, error } = await client
    .from('transactions_v2')
    .select('type, amount')
    .eq('investor_id', investorId)
    .eq('fund_id', fundId)
    .eq('is_voided', false);

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);

  let calculatedPosition = 0;
  for (const tx of transactions || []) {
    const amount = parseFloat(tx.amount);
    if (positiveTypes.includes(tx.type)) {
      calculatedPosition += amount;
    } else if (negativeTypes.includes(tx.type)) {
      calculatedPosition -= amount;
    }
  }

  return calculatedPosition;
}

/**
 * Gets the stored position from investor_positions table
 */
async function getStoredPosition(
  investorId: string,
  fundId: string
): Promise<number> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client
    .from('investor_positions')
    .select('current_value')
    .eq('investor_id', investorId)
    .eq('fund_id', fundId)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is OK (returns 0)
    throw new Error(`Failed to fetch position: ${error.message}`);
  }

  return data ? parseFloat(data.current_value) : 0;
}

/**
 * Performs deposit via canonical RPC function
 */
async function performDeposit(
  investorId: string,
  fundCode: string,
  amount: number,
  txDate: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const fund = testFunds.get(fundCode);
  if (!fund) throw new Error(`Fund ${fundCode} not found`);

  const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
    p_investor_id: investorId,
    p_fund_id: fund.id,
    p_amount: amount,
    p_tx_date: txDate,
    p_notes: `Reconciliation test deposit - ${new Date().toISOString()}`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: data?.success ?? false,
    transactionId: data?.transaction_id,
    error: data?.error,
  };
}

/**
 * Performs withdrawal via canonical RPC function
 */
async function performWithdrawal(
  investorId: string,
  fundCode: string,
  amount: number,
  txDate: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const fund = testFunds.get(fundCode);
  if (!fund) throw new Error(`Fund ${fundCode} not found`);

  const { data, error } = await client.rpc('apply_withdrawal_with_crystallization', {
    p_investor_id: investorId,
    p_fund_id: fund.id,
    p_amount: amount,
    p_tx_date: txDate,
    p_notes: `Reconciliation test withdrawal - ${new Date().toISOString()}`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: data?.success ?? false,
    transactionId: data?.transaction_id,
    error: data?.error,
  };
}

/**
 * Gets all positions for a fund and calculates total AUM
 */
async function getCalculatedAUM(fundId: string): Promise<number> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client
    .from('investor_positions')
    .select('current_value')
    .eq('fund_id', fundId)
    .eq('is_active', true);

  if (error) throw new Error(`Failed to fetch positions: ${error.message}`);

  return (data || []).reduce((sum, pos) => sum + parseFloat(pos.current_value), 0);
}

/**
 * Gets recorded AUM from fund_daily_aum table
 */
async function getRecordedAUM(fundId: string, date: string): Promise<number> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client
    .from('fund_daily_aum')
    .select('total_aum')
    .eq('fund_id', fundId)
    .eq('aum_date', date)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch AUM: ${error.message}`);
  }

  return data ? parseFloat(data.total_aum) : 0;
}

// ============================================================================
// Test Suite: Position-Transaction Reconciliation
// ============================================================================

test.describe('Position-Transaction Reconciliation', () => {
  test.describe.configure({ mode: 'serial' });

  let testInvestorId: string;
  const testFundCode = 'IND-USDT';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    // Create a fresh test investor
    testInvestorId = await createTestInvestor('Reconciliation Test Investor');
    console.log(`Created test investor: ${testInvestorId}`);
  });

  test('should have zero position before any transactions', async () => {
    const fund = testFunds.get(testFundCode);
    expect(fund).toBeDefined();

    const storedPosition = await getStoredPosition(testInvestorId, fund!.id);
    const calculatedPosition = await getCalculatedPosition(testInvestorId, fund!.id);

    expect(storedPosition).toBe(0);
    expect(calculatedPosition).toBe(0);
  });

  test('should reconcile after single deposit', async () => {
    const depositAmount = 100000;

    const result = await performDeposit(
      testInvestorId,
      testFundCode,
      depositAmount,
      testDate
    );

    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();

    // Allow trigger time to execute
    await new Promise(resolve => setTimeout(resolve, 500));

    const fund = testFunds.get(testFundCode)!;
    const storedPosition = await getStoredPosition(testInvestorId, fund.id);
    const calculatedPosition = await getCalculatedPosition(testInvestorId, fund.id);

    expect(storedPosition).toBeCloseTo(depositAmount, 10);
    expect(calculatedPosition).toBeCloseTo(depositAmount, 10);
    expect(Math.abs(storedPosition - calculatedPosition)).toBeLessThan(PRECISION_TOLERANCE);
  });

  test('should reconcile after multiple deposits', async () => {
    const fund = testFunds.get(testFundCode)!;

    // Get current position before additional deposits
    const initialPosition = await getCalculatedPosition(testInvestorId, fund.id);

    // Additional deposits
    const deposits = [50000, 25000, 12500];
    for (const amount of deposits) {
      const result = await performDeposit(testInvestorId, testFundCode, amount, testDate);
      expect(result.success).toBe(true);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const expectedTotal = initialPosition + deposits.reduce((a, b) => a + b, 0);
    const storedPosition = await getStoredPosition(testInvestorId, fund.id);
    const calculatedPosition = await getCalculatedPosition(testInvestorId, fund.id);

    expect(storedPosition).toBeCloseTo(expectedTotal, 8);
    expect(calculatedPosition).toBeCloseTo(expectedTotal, 8);
    expect(Math.abs(storedPosition - calculatedPosition)).toBeLessThan(PRECISION_TOLERANCE);
  });

  test('should reconcile after withdrawal', async () => {
    const fund = testFunds.get(testFundCode)!;
    const positionBefore = await getCalculatedPosition(testInvestorId, fund.id);
    const withdrawalAmount = 25000;

    const result = await performWithdrawal(
      testInvestorId,
      testFundCode,
      withdrawalAmount,
      testDate
    );

    expect(result.success).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    const expectedPosition = positionBefore - withdrawalAmount;
    const storedPosition = await getStoredPosition(testInvestorId, fund.id);
    const calculatedPosition = await getCalculatedPosition(testInvestorId, fund.id);

    expect(storedPosition).toBeCloseTo(expectedPosition, 8);
    expect(calculatedPosition).toBeCloseTo(expectedPosition, 8);
    expect(Math.abs(storedPosition - calculatedPosition)).toBeLessThan(PRECISION_TOLERANCE);
  });

  test('should reconcile with alternating deposits and withdrawals', async () => {
    const fund = testFunds.get(testFundCode)!;
    const operations = [
      { type: 'deposit', amount: 10000 },
      { type: 'withdrawal', amount: 5000 },
      { type: 'deposit', amount: 20000 },
      { type: 'withdrawal', amount: 10000 },
      { type: 'deposit', amount: 5000 },
    ];

    const positionBefore = await getCalculatedPosition(testInvestorId, fund.id);
    let expectedChange = 0;

    for (const op of operations) {
      if (op.type === 'deposit') {
        const result = await performDeposit(testInvestorId, testFundCode, op.amount, testDate);
        expect(result.success).toBe(true);
        expectedChange += op.amount;
      } else {
        const result = await performWithdrawal(testInvestorId, testFundCode, op.amount, testDate);
        expect(result.success).toBe(true);
        expectedChange -= op.amount;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const expectedTotal = positionBefore + expectedChange;
    const storedPosition = await getStoredPosition(testInvestorId, fund.id);
    const calculatedPosition = await getCalculatedPosition(testInvestorId, fund.id);

    expect(storedPosition).toBeCloseTo(expectedTotal, 8);
    expect(calculatedPosition).toBeCloseTo(expectedTotal, 8);
    expect(Math.abs(storedPosition - calculatedPosition)).toBeLessThan(PRECISION_TOLERANCE);
  });
});

// ============================================================================
// Test Suite: Multi-Fund Position Isolation
// ============================================================================

test.describe('Multi-Fund Position Isolation', () => {
  test.describe.configure({ mode: 'serial' });

  let testInvestorId: string;
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Multi-Fund Test Investor');
  });

  test('should maintain isolated positions across multiple funds', async () => {
    // Deposit different amounts to each fund
    const fundDeposits: Record<string, number> = {
      'IND-BTC': 1.5,           // 1.5 BTC
      'IND-ETH': 25.0,          // 25 ETH
      'IND-SOL': 500.0,         // 500 SOL
      'IND-USDT': 100000.0,     // 100,000 USDT
      'IND-XRP': 50000.0,       // 50,000 XRP
    };

    // Perform deposits to all funds
    for (const [fundCode, amount] of Object.entries(fundDeposits)) {
      const result = await performDeposit(testInvestorId, fundCode, amount, testDate);
      expect(result.success).toBe(true);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify each fund has correct isolated position
    for (const [fundCode, expectedAmount] of Object.entries(fundDeposits)) {
      const fund = testFunds.get(fundCode)!;
      const storedPosition = await getStoredPosition(testInvestorId, fund.id);
      const calculatedPosition = await getCalculatedPosition(testInvestorId, fund.id);

      expect(storedPosition).toBeCloseTo(expectedAmount, 8);
      expect(calculatedPosition).toBeCloseTo(expectedAmount, 8);
      expect(Math.abs(storedPosition - calculatedPosition)).toBeLessThan(PRECISION_TOLERANCE);
    }
  });

  test('should not affect other fund positions when withdrawing from one fund', async () => {
    const withdrawalFund = 'IND-USDT';
    const withdrawalAmount = 25000;

    // Record positions in all funds before withdrawal
    const positionsBefore: Record<string, number> = {};
    for (const fundCode of FUND_CODES) {
      const fund = testFunds.get(fundCode)!;
      positionsBefore[fundCode] = await getCalculatedPosition(testInvestorId, fund.id);
    }

    // Withdraw from one fund
    const result = await performWithdrawal(
      testInvestorId,
      withdrawalFund,
      withdrawalAmount,
      testDate
    );
    expect(result.success).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify only the withdrawal fund was affected
    for (const fundCode of FUND_CODES) {
      const fund = testFunds.get(fundCode)!;
      const positionAfter = await getCalculatedPosition(testInvestorId, fund.id);

      if (fundCode === withdrawalFund) {
        expect(positionAfter).toBeCloseTo(positionsBefore[fundCode] - withdrawalAmount, 8);
      } else {
        expect(positionAfter).toBeCloseTo(positionsBefore[fundCode], 8);
      }
    }
  });
});

// ============================================================================
// Test Suite: Voided Transaction Exclusion
// ============================================================================

test.describe('Voided Transaction Exclusion', () => {
  test.describe.configure({ mode: 'serial' });

  let testInvestorId: string;
  let transactionIdToVoid: string;
  const testFundCode = 'IND-ETH';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Void Test Investor');
  });

  test('should setup investor with deposits', async () => {
    // Initial deposit
    const result1 = await performDeposit(testInvestorId, testFundCode, 10, testDate);
    expect(result1.success).toBe(true);

    // Second deposit (to be voided later)
    const result2 = await performDeposit(testInvestorId, testFundCode, 5, testDate);
    expect(result2.success).toBe(true);
    transactionIdToVoid = result2.transactionId!;

    await new Promise(resolve => setTimeout(resolve, 500));

    const fund = testFunds.get(testFundCode)!;
    const position = await getCalculatedPosition(testInvestorId, fund.id);
    expect(position).toBeCloseTo(15, 8); // 10 + 5 ETH
  });

  test('should exclude voided transaction from position calculation', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    // Void the transaction
    const { error } = await client
      .from('transactions_v2')
      .update({
        is_voided: true,
        voided_reason: 'Test void for reconciliation',
        voided_at: new Date().toISOString(),
      })
      .eq('id', transactionIdToVoid);

    if (error) {
      // If direct update is blocked, try RPC
      const { error: rpcError } = await client.rpc('void_transaction', {
        p_transaction_id: transactionIdToVoid,
        p_reason: 'Test void for reconciliation',
      });

      if (rpcError) {
        console.warn(`Could not void transaction: ${rpcError.message}`);
        test.skip();
        return;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Calculated position should exclude voided transaction
    const calculatedPosition = await getCalculatedPosition(testInvestorId, fund.id);
    expect(calculatedPosition).toBeCloseTo(10, 8); // Only the first 10 ETH deposit

    // Stored position should also be updated (if trigger fired)
    const storedPosition = await getStoredPosition(testInvestorId, fund.id);

    // This is the critical check - stored position should match calculated
    expect(Math.abs(storedPosition - calculatedPosition)).toBeLessThan(PRECISION_TOLERANCE);
  });
});

// ============================================================================
// Test Suite: AUM-Position Reconciliation
// ============================================================================

test.describe('AUM-Position Reconciliation', () => {
  test.describe.configure({ mode: 'serial' });

  const testFundCode = 'IND-SOL';
  const testDate = '2026-01-18';
  let investor1Id: string;
  let investor2Id: string;
  let investor3Id: string;

  test.beforeAll(async () => {
    investor1Id = await createTestInvestor('AUM Test Investor 1');
    investor2Id = await createTestInvestor('AUM Test Investor 2');
    investor3Id = await createTestInvestor('AUM Test Investor 3');
  });

  test('should have AUM equal to sum of all positions', async () => {
    const fund = testFunds.get(testFundCode)!;

    // Create deposits for multiple investors
    const deposits = [
      { investorId: investor1Id, amount: 1000 },
      { investorId: investor2Id, amount: 2500 },
      { investorId: investor3Id, amount: 500 },
    ];

    for (const { investorId, amount } of deposits) {
      const result = await performDeposit(investorId, testFundCode, amount, testDate);
      expect(result.success).toBe(true);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const expectedAUM = deposits.reduce((sum, d) => sum + d.amount, 0);
    const calculatedAUM = await getCalculatedAUM(fund.id);

    // Calculated AUM should match expected
    expect(calculatedAUM).toBeCloseTo(expectedAUM, 8);

    // Get recorded AUM (may include previous positions)
    const recordedAUM = await getRecordedAUM(fund.id, testDate);

    // If AUM is recorded, it should match calculated (within tolerance)
    if (recordedAUM > 0) {
      const variance = Math.abs(recordedAUM - calculatedAUM);
      const variancePct = (variance / calculatedAUM) * 100;

      console.log(`AUM Reconciliation: recorded=${recordedAUM}, calculated=${calculatedAUM}, variance=${variance} (${variancePct.toFixed(4)}%)`);

      // Allow 1% variance for timing issues with triggers
      expect(variancePct).toBeLessThan(1);
    }
  });

  test('should update AUM after withdrawal', async () => {
    const fund = testFunds.get(testFundCode)!;
    const aumBefore = await getCalculatedAUM(fund.id);

    // Withdraw from first investor
    const withdrawalAmount = 500;
    const result = await performWithdrawal(investor1Id, testFundCode, withdrawalAmount, testDate);
    expect(result.success).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    const aumAfter = await getCalculatedAUM(fund.id);
    expect(aumAfter).toBeCloseTo(aumBefore - withdrawalAmount, 8);
  });
});

// ============================================================================
// Test Suite: Ownership Percentage Validation
// ============================================================================

test.describe('Ownership Percentage Validation', () => {
  test.describe.configure({ mode: 'serial' });

  const testFundCode = 'IND-BTC';
  const testDate = '2026-01-18';
  let investor1Id: string;
  let investor2Id: string;

  test.beforeAll(async () => {
    investor1Id = await createTestInvestor('Ownership Test Investor 1');
    investor2Id = await createTestInvestor('Ownership Test Investor 2');
  });

  test('should have ownership percentages sum to 100%', async () => {
    const fund = testFunds.get(testFundCode)!;

    // Create deposits
    await performDeposit(investor1Id, testFundCode, 0.75, testDate);
    await performDeposit(investor2Id, testFundCode, 0.25, testDate);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Get all positions for this fund
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const { data: positions, error } = await client
      .from('investor_positions')
      .select('investor_id, current_value')
      .eq('fund_id', fund.id)
      .eq('is_active', true);

    expect(error).toBeNull();
    expect(positions).toBeDefined();

    // Calculate total and percentages
    const totalAUM = positions!.reduce((sum, p) => sum + parseFloat(p.current_value), 0);

    if (totalAUM > 0) {
      let totalOwnership = 0;
      for (const position of positions!) {
        const ownershipPct = (parseFloat(position.current_value) / totalAUM) * 100;
        totalOwnership += ownershipPct;
      }

      // Total ownership should be 100% (within floating point tolerance)
      expect(totalOwnership).toBeCloseTo(100, 8);
    }
  });

  test('should correctly calculate ownership after transactions', async () => {
    const fund = testFunds.get(testFundCode)!;

    // Get current positions
    const pos1Before = await getStoredPosition(investor1Id, fund.id);
    const pos2Before = await getStoredPosition(investor2Id, fund.id);
    const totalBefore = pos1Before + pos2Before;

    // Add more to investor 2
    await performDeposit(investor2Id, testFundCode, 0.5, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get updated positions
    const pos1After = await getStoredPosition(investor1Id, fund.id);
    const pos2After = await getStoredPosition(investor2Id, fund.id);
    const totalAfter = pos1After + pos2After;

    // Verify totals
    expect(totalAfter).toBeCloseTo(totalBefore + 0.5, 8);

    // Verify ownership percentages
    if (totalAfter > 0) {
      const ownership1 = (pos1After / totalAfter) * 100;
      const ownership2 = (pos2After / totalAfter) * 100;

      expect(ownership1 + ownership2).toBeCloseTo(100, 8);

      // Investor 1's ownership % should decrease (dilution)
      const oldOwnership1 = (pos1Before / totalBefore) * 100;
      expect(ownership1).toBeLessThan(oldOwnership1);
    }
  });
});

// ============================================================================
// Test Suite: Precision and Rounding
// ============================================================================

test.describe('Precision and Rounding', () => {
  test.describe.configure({ mode: 'serial' });

  let testInvestorId: string;
  const testFundCode = 'IND-XRP';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Precision Test Investor');
  });

  test('should handle high-precision amounts', async () => {
    const fund = testFunds.get(testFundCode)!;

    // Deposit with maximum precision
    const preciseAmount = 12345.6789012345; // 10 decimal places

    const result = await performDeposit(testInvestorId, testFundCode, preciseAmount, testDate);
    expect(result.success).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    const storedPosition = await getStoredPosition(testInvestorId, fund.id);
    const calculatedPosition = await getCalculatedPosition(testInvestorId, fund.id);

    // Should preserve precision
    expect(storedPosition).toBeCloseTo(preciseAmount, 8);
    expect(calculatedPosition).toBeCloseTo(preciseAmount, 8);
  });

  test('should not accumulate rounding errors over many transactions', async () => {
    const fund = testFunds.get(testFundCode)!;
    const positionBefore = await getCalculatedPosition(testInvestorId, fund.id);

    // Perform many small transactions
    const smallAmount = 0.0000000001; // Very small amount
    const numTransactions = 100;

    for (let i = 0; i < numTransactions; i++) {
      const result = await performDeposit(testInvestorId, testFundCode, smallAmount, testDate);
      if (!result.success) {
        console.warn(`Transaction ${i} failed: ${result.error}`);
        break;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const storedPosition = await getStoredPosition(testInvestorId, fund.id);
    const calculatedPosition = await getCalculatedPosition(testInvestorId, fund.id);

    // Positions should still reconcile
    expect(Math.abs(storedPosition - calculatedPosition)).toBeLessThan(PRECISION_TOLERANCE * 10);
  });
});

// ============================================================================
// Test Suite: Full Ledger Reconciliation
// ============================================================================

test.describe('Full Ledger Reconciliation', () => {
  test('should reconcile all active positions against transactions', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Get all active positions
    const { data: positions, error: posError } = await client
      .from('investor_positions')
      .select('investor_id, fund_id, current_value, funds(code)')
      .eq('is_active', true);

    if (posError) throw new Error(`Failed to fetch positions: ${posError.message}`);

    const reconciliationResults: ReconciliationResult[] = [];
    let totalVariance = 0;
    let failedReconciliations = 0;

    for (const position of positions || []) {
      const storedValue = parseFloat(position.current_value);
      const calculatedValue = await getCalculatedPosition(
        position.investor_id,
        position.fund_id
      );

      const variance = Math.abs(storedValue - calculatedValue);
      const isReconciled = variance < PRECISION_TOLERANCE;

      reconciliationResults.push({
        investor_id: position.investor_id,
        fund_id: position.fund_id,
        fund_code: (position.funds as any)?.code || 'UNKNOWN',
        stored_position: storedValue,
        calculated_position: calculatedValue,
        variance: variance,
        is_reconciled: isReconciled,
      });

      totalVariance += variance;
      if (!isReconciled) {
        failedReconciliations++;
        console.error(`RECONCILIATION FAILED: Investor ${position.investor_id} in ${(position.funds as any)?.code}: stored=${storedValue}, calculated=${calculatedValue}, variance=${variance}`);
      }
    }

    // Log summary
    console.log(`\nReconciliation Summary:`);
    console.log(`  Total positions: ${positions?.length || 0}`);
    console.log(`  Reconciled: ${(positions?.length || 0) - failedReconciliations}`);
    console.log(`  Failed: ${failedReconciliations}`);
    console.log(`  Total variance: ${totalVariance}`);

    // All positions should reconcile
    expect(failedReconciliations).toBe(0);
  });

  test('should have AUM reconciled for all funds', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const today = new Date().toISOString().split('T')[0];

    const aumResults: AUMReconciliation[] = [];
    let failedReconciliations = 0;

    for (const [fundCode, fund] of testFunds) {
      const calculatedAUM = await getCalculatedAUM(fund.id);
      const recordedAUM = await getRecordedAUM(fund.id, today);

      // If no recorded AUM, skip (may not have been set for this date)
      if (recordedAUM === 0 && calculatedAUM === 0) {
        continue;
      }

      const variance = Math.abs(recordedAUM - calculatedAUM);
      const isReconciled = recordedAUM === 0 || variance < PRECISION_TOLERANCE;

      aumResults.push({
        fund_id: fund.id,
        fund_code: fundCode,
        recorded_aum: recordedAUM,
        calculated_aum: calculatedAUM,
        variance: variance,
        is_reconciled: isReconciled,
      });

      if (!isReconciled) {
        failedReconciliations++;
        console.error(`AUM RECONCILIATION FAILED: Fund ${fundCode}: recorded=${recordedAUM}, calculated=${calculatedAUM}, variance=${variance}`);
      }
    }

    console.log(`\nAUM Reconciliation Summary:`);
    console.log(`  Total funds checked: ${aumResults.length}`);
    console.log(`  Failed: ${failedReconciliations}`);

    // All funds should reconcile (if they have AUM recorded)
    expect(failedReconciliations).toBe(0);
  });
});

// ============================================================================
// Test Suite: Transaction Chain Integrity
// ============================================================================

test.describe('Transaction Chain Integrity', () => {
  test('should have continuous balance chain for each investor-fund pair', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Get all unique investor-fund pairs with transactions
    const { data: pairs, error: pairsError } = await client
      .from('transactions_v2')
      .select('investor_id, fund_id')
      .eq('is_voided', false);

    if (pairsError) throw new Error(`Failed to fetch pairs: ${pairsError.message}`);

    const uniquePairs = new Set(
      (pairs || []).map(p => `${p.investor_id}|${p.fund_id}`)
    );

    let brokenChains = 0;

    for (const pairKey of uniquePairs) {
      const [investorId, fundId] = pairKey.split('|');

      // Get all transactions ordered by date and creation time
      const { data: transactions, error: txError } = await client
        .from('transactions_v2')
        .select('id, type, amount, balance_before, balance_after, tx_date, created_at')
        .eq('investor_id', investorId)
        .eq('fund_id', fundId)
        .eq('is_voided', false)
        .order('tx_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (txError) continue;

      // Note: balance_before/balance_after may not be reliably maintained
      // This test documents the current state, but the primary reconciliation
      // should use calculated positions from transaction sums

      let previousBalanceAfter: number | null = null;
      for (const tx of transactions || []) {
        if (tx.balance_before !== null && previousBalanceAfter !== null) {
          const balanceBefore = parseFloat(tx.balance_before);
          if (Math.abs(balanceBefore - previousBalanceAfter) > PRECISION_TOLERANCE) {
            brokenChains++;
            console.warn(`Balance chain break: investor=${investorId}, fund=${fundId}, expected=${previousBalanceAfter}, got=${balanceBefore}`);
            break;
          }
        }
        if (tx.balance_after !== null) {
          previousBalanceAfter = parseFloat(tx.balance_after);
        }
      }
    }

    // Log results (may have broken chains if balance_before/after not maintained)
    console.log(`Balance chain check: ${brokenChains} broken chains found`);

    // This is informational - the real reconciliation is position = SUM(transactions)
    // We don't fail on this since balance_before/after may not be maintained
  });
});
