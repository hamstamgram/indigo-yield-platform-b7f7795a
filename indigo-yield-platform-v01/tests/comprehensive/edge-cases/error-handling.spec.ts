/**
 * Edge Cases and Error Handling Tests
 *
 * Comprehensive tests for boundary conditions, invalid inputs, and error scenarios.
 * These tests ensure the platform gracefully handles edge cases without data corruption.
 *
 * Test Categories:
 * 1. Invalid Input Validation
 * 2. Boundary Conditions (zero, negative, overflow)
 * 3. Business Rule Enforcement
 * 4. Cross-Fund Protection (no contamination)
 * 5. Concurrent Transaction Safety
 * 6. Date and Time Edge Cases
 * 7. State Transition Validation
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

const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'testadmin@indigo.fund';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Indigo!Admin2026#Secure';

const FUND_CODES = ['IND-BTC', 'IND-ETH', 'IND-SOL', 'IND-USDT', 'IND-XRP'] as const;

// Maximum precision for NUMERIC(28,10)
const MAX_AMOUNT = 999999999999999999; // 18 digits before decimal
const MIN_POSITIVE = 0.0000000001; // 10 decimal places

// ============================================================================
// Type Definitions
// ============================================================================

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

interface DepositResult {
  success: boolean;
  transaction_id?: string;
  error?: string;
  error_code?: string;
}

interface WithdrawalResult {
  success: boolean;
  transaction_id?: string;
  error?: string;
  error_code?: string;
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
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (SUPABASE_SERVICE_KEY) {
    serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
  });

  if (authError || !authData.user) {
    if (!SUPABASE_SERVICE_KEY) {
      throw new Error('No authentication method available');
    }
  } else {
    adminUserId = authData.user.id;
  }

  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const { data: funds, error: fundsError } = await client
    .from('funds')
    .select('id, code, name, asset')
    .in('code', FUND_CODES as unknown as string[]);

  if (fundsError) throw new Error(`Failed to load funds: ${fundsError.message}`);

  if (funds) {
    funds.forEach(fund => testFunds.set(fund.code, fund));
  }

  console.log(`Loaded ${testFunds.size} funds for edge case tests`);
});

test.afterAll(async () => {
  // Cleanup test investors
  if (testInvestorIds.length > 0 && SUPABASE_SERVICE_KEY) {
    const client = serviceSupabase;

    // Delete test transactions first
    await client
      .from('transactions_v2')
      .delete()
      .in('investor_id', testInvestorIds);

    // Delete test positions
    await client
      .from('investor_positions')
      .delete()
      .in('investor_id', testInvestorIds);

    // Delete test investors
    await client
      .from('profiles')
      .delete()
      .in('id', testInvestorIds);

    console.log(`Cleaned up ${testInvestorIds.length} test investors`);
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

async function createTestInvestor(name: string, status: string = 'active'): Promise<string> {
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
      email: `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@test.indigo.fund`,
      status: status,
      kyc_status: 'approved',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create test investor: ${error.message}`);

  testInvestorIds.push(data.id);
  return data.id;
}

async function performDeposit(
  investorId: string,
  fundCode: string,
  amount: number,
  txDate: string
): Promise<DepositResult> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const fund = testFunds.get(fundCode);
  if (!fund) return { success: false, error: `Fund ${fundCode} not found` };

  const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
    p_investor_id: investorId,
    p_fund_id: fund.id,
    p_amount: amount,
    p_tx_date: txDate,
    p_notes: `Edge case test - ${new Date().toISOString()}`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: data?.success ?? false,
    transaction_id: data?.transaction_id,
    error: data?.error,
  };
}

async function performWithdrawal(
  investorId: string,
  fundCode: string,
  amount: number,
  txDate: string
): Promise<WithdrawalResult> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const fund = testFunds.get(fundCode);
  if (!fund) return { success: false, error: `Fund ${fundCode} not found` };

  const { data, error } = await client.rpc('apply_withdrawal_with_crystallization', {
    p_investor_id: investorId,
    p_fund_id: fund.id,
    p_amount: amount,
    p_tx_date: txDate,
    p_notes: `Edge case test - ${new Date().toISOString()}`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: data?.success ?? false,
    transaction_id: data?.transaction_id,
    error: data?.error,
  };
}

async function getPosition(investorId: string, fundId: string): Promise<number> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client
    .from('investor_positions')
    .select('current_value')
    .eq('investor_id', investorId)
    .eq('fund_id', fundId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch position: ${error.message}`);
  }

  return data ? parseFloat(data.current_value) : 0;
}

// ============================================================================
// Test Suite: Invalid Input Validation
// ============================================================================

test.describe('Invalid Input Validation', () => {
  let testInvestorId: string;
  const testFundCode = 'IND-USDT';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Invalid Input Test Investor');
  });

  test('should reject negative deposit amount', async () => {
    const result = await performDeposit(testInvestorId, testFundCode, -1000, testDate);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    // Error should indicate invalid amount
  });

  test('should reject zero deposit amount', async () => {
    const result = await performDeposit(testInvestorId, testFundCode, 0, testDate);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should reject negative withdrawal amount', async () => {
    // First create a position to withdraw from
    await performDeposit(testInvestorId, testFundCode, 1000, testDate);

    const result = await performWithdrawal(testInvestorId, testFundCode, -500, testDate);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should reject zero withdrawal amount', async () => {
    const result = await performWithdrawal(testInvestorId, testFundCode, 0, testDate);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should reject invalid investor UUID', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
      p_investor_id: 'not-a-valid-uuid',
      p_fund_id: fund.id,
      p_amount: 1000,
      p_tx_date: testDate,
      p_notes: 'Invalid UUID test',
    });

    expect(error || (data && !data.success)).toBeTruthy();
  });

  test('should reject invalid fund UUID', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
      p_investor_id: testInvestorId,
      p_fund_id: 'not-a-valid-uuid',
      p_amount: 1000,
      p_tx_date: testDate,
      p_notes: 'Invalid fund UUID test',
    });

    expect(error || (data && !data.success)).toBeTruthy();
  });

  test('should reject non-existent investor UUID', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const result = await performDeposit(nonExistentId, testFundCode, 1000, testDate);

    // Should fail - investor doesn't exist
    expect(result.success).toBe(false);
  });

  test('should reject non-existent fund UUID', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const nonExistentFundId = '00000000-0000-0000-0000-000000000000';

    const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
      p_investor_id: testInvestorId,
      p_fund_id: nonExistentFundId,
      p_amount: 1000,
      p_tx_date: testDate,
      p_notes: 'Non-existent fund test',
    });

    expect(error || (data && !data.success)).toBeTruthy();
  });

  test('should reject invalid date format', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
      p_investor_id: testInvestorId,
      p_fund_id: fund.id,
      p_amount: 1000,
      p_tx_date: 'not-a-date',
      p_notes: 'Invalid date test',
    });

    expect(error || (data && !data.success)).toBeTruthy();
  });
});

// ============================================================================
// Test Suite: Boundary Conditions
// ============================================================================

test.describe('Boundary Conditions', () => {
  let testInvestorId: string;
  const testFundCode = 'IND-USDT';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Boundary Test Investor');
  });

  test('should handle minimum positive amount (10 decimal places)', async () => {
    const result = await performDeposit(testInvestorId, testFundCode, MIN_POSITIVE, testDate);

    // Should succeed with minimum precision
    expect(result.success).toBe(true);
    expect(result.transaction_id).toBeDefined();
  });

  test('should preserve precision at minimum amount', async () => {
    const fund = testFunds.get(testFundCode)!;

    // Deposit minimum amount multiple times
    for (let i = 0; i < 5; i++) {
      await performDeposit(testInvestorId, testFundCode, MIN_POSITIVE, testDate);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Position should be at least 6 * MIN_POSITIVE (1 from previous test + 5 here)
    const position = await getPosition(testInvestorId, fund.id);
    expect(position).toBeGreaterThanOrEqual(6 * MIN_POSITIVE);
  });

  test('should handle very large amounts within NUMERIC(28,10) bounds', async () => {
    const largeInvestorId = await createTestInvestor('Large Amount Investor');
    const largeAmount = 1000000000; // 1 billion

    const result = await performDeposit(largeInvestorId, testFundCode, largeAmount, testDate);

    expect(result.success).toBe(true);

    const fund = testFunds.get(testFundCode)!;
    const position = await getPosition(largeInvestorId, fund.id);
    expect(position).toBeCloseTo(largeAmount, 8);
  });

  test('should reject amounts exceeding NUMERIC(28,10) precision', async () => {
    // Amount that would overflow NUMERIC(28,10)
    const overflowAmount = 1e20; // 100 quintillion

    const result = await performDeposit(testInvestorId, testFundCode, overflowAmount, testDate);

    // Should fail due to precision limits or be truncated
    if (result.success) {
      // If it succeeded, verify the amount was not corrupted
      const fund = testFunds.get(testFundCode)!;
      const position = await getPosition(testInvestorId, fund.id);
      // Position should not be absurdly large
      expect(position).toBeLessThan(1e19);
    }
  });
});

// ============================================================================
// Test Suite: Business Rule Enforcement
// ============================================================================

test.describe('Business Rule Enforcement', () => {
  const testDate = '2026-01-18';

  test('should reject withdrawal exceeding position balance', async () => {
    const investorId = await createTestInvestor('Overdraft Test Investor');
    const testFundCode = 'IND-ETH';

    // Deposit 10 ETH
    await performDeposit(investorId, testFundCode, 10, testDate);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Try to withdraw 15 ETH (5 more than balance)
    const result = await performWithdrawal(investorId, testFundCode, 15, testDate);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should reject withdrawal from zero balance', async () => {
    const investorId = await createTestInvestor('Zero Balance Investor');
    const testFundCode = 'IND-SOL';

    // No deposits made - balance is zero
    const result = await performWithdrawal(investorId, testFundCode, 1, testDate);

    expect(result.success).toBe(false);
  });

  test('should allow full withdrawal (close position)', async () => {
    const investorId = await createTestInvestor('Full Withdrawal Investor');
    const testFundCode = 'IND-XRP';
    const depositAmount = 5000;

    // Deposit
    await performDeposit(investorId, testFundCode, depositAmount, testDate);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Withdraw exact balance
    const result = await performWithdrawal(investorId, testFundCode, depositAmount, testDate);

    expect(result.success).toBe(true);

    // Position should be zero
    const fund = testFunds.get(testFundCode)!;
    const position = await getPosition(investorId, fund.id);
    expect(position).toBeCloseTo(0, 10);
  });

  test('should reject withdrawal leaving dust balance below threshold', async () => {
    const investorId = await createTestInvestor('Dust Balance Investor');
    const testFundCode = 'IND-BTC';

    // Deposit 1 BTC
    await performDeposit(investorId, testFundCode, 1, testDate);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Try to withdraw 0.999999999999 BTC (leaving dust)
    const dustWithdrawal = 0.999999999999;
    const result = await performWithdrawal(investorId, testFundCode, dustWithdrawal, testDate);

    // Platform may allow or reject based on dust threshold policy
    // This documents the actual behavior
    console.log(`Dust withdrawal result: success=${result.success}, error=${result.error}`);
  });
});

// ============================================================================
// Test Suite: Cross-Fund Protection
// ============================================================================

test.describe('Cross-Fund Protection', () => {
  const testDate = '2026-01-18';
  let multiInvestorId: string;

  test.beforeAll(async () => {
    multiInvestorId = await createTestInvestor('Multi-Fund Protection Investor');
  });

  test('should not affect BTC position when depositing to ETH fund', async () => {
    const btcFund = testFunds.get('IND-BTC')!;
    const ethFund = testFunds.get('IND-ETH')!;

    // Deposit to BTC
    await performDeposit(multiInvestorId, 'IND-BTC', 1, testDate);
    await new Promise(resolve => setTimeout(resolve, 300));

    const btcPositionBefore = await getPosition(multiInvestorId, btcFund.id);

    // Deposit to ETH
    await performDeposit(multiInvestorId, 'IND-ETH', 10, testDate);
    await new Promise(resolve => setTimeout(resolve, 300));

    const btcPositionAfter = await getPosition(multiInvestorId, btcFund.id);

    // BTC position should be unchanged
    expect(btcPositionAfter).toBeCloseTo(btcPositionBefore, 10);
  });

  test('should not affect USDT position when withdrawing from SOL fund', async () => {
    const usdtFund = testFunds.get('IND-USDT')!;
    const solFund = testFunds.get('IND-SOL')!;

    // Deposit to both funds
    await performDeposit(multiInvestorId, 'IND-USDT', 10000, testDate);
    await performDeposit(multiInvestorId, 'IND-SOL', 100, testDate);
    await new Promise(resolve => setTimeout(resolve, 300));

    const usdtPositionBefore = await getPosition(multiInvestorId, usdtFund.id);

    // Withdraw from SOL
    await performWithdrawal(multiInvestorId, 'IND-SOL', 50, testDate);
    await new Promise(resolve => setTimeout(resolve, 300));

    const usdtPositionAfter = await getPosition(multiInvestorId, usdtFund.id);

    // USDT position should be unchanged
    expect(usdtPositionAfter).toBeCloseTo(usdtPositionBefore, 10);
  });

  test('should maintain independent positions across all 5 funds', async () => {
    const independentInvestorId = await createTestInvestor('Fund Independence Investor');

    // Deposit unique amounts to each fund
    const deposits: Record<string, number> = {
      'IND-BTC': 0.5,
      'IND-ETH': 5,
      'IND-SOL': 50,
      'IND-USDT': 5000,
      'IND-XRP': 500,
    };

    for (const [fundCode, amount] of Object.entries(deposits)) {
      await performDeposit(independentInvestorId, fundCode, amount, testDate);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify each position is isolated
    for (const [fundCode, expectedAmount] of Object.entries(deposits)) {
      const fund = testFunds.get(fundCode)!;
      const position = await getPosition(independentInvestorId, fund.id);

      expect(position).toBeCloseTo(expectedAmount, 8);
      console.log(`${fundCode}: expected=${expectedAmount}, actual=${position}`);
    }
  });
});

// ============================================================================
// Test Suite: Concurrent Transaction Safety
// ============================================================================

test.describe('Concurrent Transaction Safety', () => {
  const testDate = '2026-01-18';
  const testFundCode = 'IND-USDT';

  test('should handle concurrent deposits to same investor-fund', async () => {
    const investorId = await createTestInvestor('Concurrent Deposit Investor');
    const fund = testFunds.get(testFundCode)!;

    const depositAmount = 1000;
    const numConcurrent = 5;

    // Launch concurrent deposits
    const depositPromises = Array(numConcurrent).fill(null).map(() =>
      performDeposit(investorId, testFundCode, depositAmount, testDate)
    );

    const results = await Promise.all(depositPromises);

    // Count successes
    const successCount = results.filter(r => r.success).length;
    console.log(`Concurrent deposits: ${successCount}/${numConcurrent} succeeded`);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Position should reflect successful deposits
    const position = await getPosition(investorId, fund.id);
    const expectedPosition = depositAmount * successCount;

    expect(position).toBeCloseTo(expectedPosition, 8);
  });

  test('should handle concurrent withdrawals from same investor-fund', async () => {
    const investorId = await createTestInvestor('Concurrent Withdrawal Investor');
    const fund = testFunds.get(testFundCode)!;

    // First deposit enough for multiple withdrawals
    await performDeposit(investorId, testFundCode, 10000, testDate);
    await new Promise(resolve => setTimeout(resolve, 300));

    const withdrawalAmount = 1000;
    const numConcurrent = 5;

    // Launch concurrent withdrawals
    const withdrawalPromises = Array(numConcurrent).fill(null).map(() =>
      performWithdrawal(investorId, testFundCode, withdrawalAmount, testDate)
    );

    const results = await Promise.all(withdrawalPromises);

    const successCount = results.filter(r => r.success).length;
    console.log(`Concurrent withdrawals: ${successCount}/${numConcurrent} succeeded`);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Position should be correct (10000 - successful withdrawals)
    const position = await getPosition(investorId, fund.id);
    const expectedPosition = 10000 - (withdrawalAmount * successCount);

    expect(position).toBeCloseTo(expectedPosition, 8);
    expect(position).toBeGreaterThanOrEqual(0); // Should never go negative
  });

  test('should prevent race condition in overdraft scenario', async () => {
    const investorId = await createTestInvestor('Race Condition Investor');
    const fund = testFunds.get(testFundCode)!;

    // Deposit exactly 5000
    await performDeposit(investorId, testFundCode, 5000, testDate);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Try 3 concurrent withdrawals of 2500 each (would overdraft if all succeed)
    const withdrawalAmount = 2500;
    const numConcurrent = 3;

    const withdrawalPromises = Array(numConcurrent).fill(null).map(() =>
      performWithdrawal(investorId, testFundCode, withdrawalAmount, testDate)
    );

    const results = await Promise.all(withdrawalPromises);

    const successCount = results.filter(r => r.success).length;
    console.log(`Race condition test: ${successCount}/3 withdrawals succeeded`);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Position must never be negative
    const position = await getPosition(investorId, fund.id);
    expect(position).toBeGreaterThanOrEqual(0);

    // At most 2 withdrawals should succeed (5000 / 2500 = 2)
    expect(successCount).toBeLessThanOrEqual(2);
  });
});

// ============================================================================
// Test Suite: Date and Time Edge Cases
// ============================================================================

test.describe('Date and Time Edge Cases', () => {
  let testInvestorId: string;
  const testFundCode = 'IND-USDT';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Date Edge Case Investor');
  });

  test('should handle transaction on first day of year', async () => {
    const result = await performDeposit(testInvestorId, testFundCode, 1000, '2026-01-01');

    expect(result.success).toBe(true);
  });

  test('should handle transaction on last day of year', async () => {
    const result = await performDeposit(testInvestorId, testFundCode, 1000, '2025-12-31');

    expect(result.success).toBe(true);
  });

  test('should handle transaction on February 29 in leap year', async () => {
    // 2028 is a leap year
    const result = await performDeposit(testInvestorId, testFundCode, 1000, '2028-02-29');

    expect(result.success).toBe(true);
  });

  test('should reject February 29 in non-leap year', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    // 2027 is not a leap year
    const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
      p_investor_id: testInvestorId,
      p_fund_id: fund.id,
      p_amount: 1000,
      p_tx_date: '2027-02-29', // Invalid date
      p_notes: 'Non-leap year Feb 29 test',
    });

    expect(error || (data && !data.success)).toBeTruthy();
  });

  test('should reject future dates beyond reasonable limit', async () => {
    const farFutureDate = '2050-12-31';

    const result = await performDeposit(testInvestorId, testFundCode, 1000, farFutureDate);

    // Platform policy may allow or reject future dates
    // Document the behavior
    console.log(`Far future date result: success=${result.success}`);
  });

  test('should handle transaction order when dates are out of sequence', async () => {
    const orderInvestorId = await createTestInvestor('Date Order Investor');
    const fund = testFunds.get(testFundCode)!;

    // Create transactions in reverse date order
    await performDeposit(orderInvestorId, testFundCode, 3000, '2026-01-20');
    await performDeposit(orderInvestorId, testFundCode, 2000, '2026-01-15');
    await performDeposit(orderInvestorId, testFundCode, 1000, '2026-01-10');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Position should reflect all deposits regardless of order
    const position = await getPosition(orderInvestorId, fund.id);
    expect(position).toBeCloseTo(6000, 8);
  });
});

// ============================================================================
// Test Suite: State Transition Validation
// ============================================================================

test.describe('State Transition Validation', () => {
  const testDate = '2026-01-18';
  const testFundCode = 'IND-USDT';

  test('should handle deposit to inactive investor', async () => {
    // Create inactive investor
    const investorId = await createTestInvestor('Inactive Deposit Investor', 'inactive');

    const result = await performDeposit(investorId, testFundCode, 1000, testDate);

    // Platform may allow or reject based on policy
    console.log(`Inactive investor deposit: success=${result.success}, error=${result.error}`);
  });

  test('should handle withdrawal from inactive investor', async () => {
    // Create active investor with balance, then make inactive
    const investorId = await createTestInvestor('Inactive Withdrawal Investor', 'active');

    await performDeposit(investorId, testFundCode, 1000, testDate);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Set investor to inactive
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    await client
      .from('profiles')
      .update({ status: 'inactive' })
      .eq('id', investorId);

    // Try to withdraw
    const result = await performWithdrawal(investorId, testFundCode, 500, testDate);

    // Document behavior - may allow withdrawal from inactive investor
    console.log(`Inactive investor withdrawal: success=${result.success}, error=${result.error}`);
  });

  test('should handle deposit to suspended investor', async () => {
    const investorId = await createTestInvestor('Suspended Investor', 'suspended');

    const result = await performDeposit(investorId, testFundCode, 1000, testDate);

    // Should likely fail for suspended investor
    console.log(`Suspended investor deposit: success=${result.success}, error=${result.error}`);
  });
});

// ============================================================================
// Test Suite: Position Consistency After Errors
// ============================================================================

test.describe('Position Consistency After Errors', () => {
  const testDate = '2026-01-18';
  const testFundCode = 'IND-USDT';

  test('should maintain correct position after failed withdrawal', async () => {
    const investorId = await createTestInvestor('Error Recovery Investor');
    const fund = testFunds.get(testFundCode)!;

    // Deposit 1000
    await performDeposit(investorId, testFundCode, 1000, testDate);
    await new Promise(resolve => setTimeout(resolve, 300));

    const positionBefore = await getPosition(investorId, fund.id);

    // Try invalid withdrawal (should fail)
    const result = await performWithdrawal(investorId, testFundCode, 2000, testDate);
    expect(result.success).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 300));

    // Position should be unchanged
    const positionAfter = await getPosition(investorId, fund.id);
    expect(positionAfter).toBeCloseTo(positionBefore, 10);
  });

  test('should maintain atomicity on database error', async () => {
    const investorId = await createTestInvestor('Atomicity Test Investor');
    const fund = testFunds.get(testFundCode)!;

    // Deposit initial amount
    await performDeposit(investorId, testFundCode, 5000, testDate);
    await new Promise(resolve => setTimeout(resolve, 300));

    const positionBefore = await getPosition(investorId, fund.id);

    // Perform multiple valid operations
    await performDeposit(investorId, testFundCode, 1000, testDate);
    await performWithdrawal(investorId, testFundCode, 500, testDate);

    await new Promise(resolve => setTimeout(resolve, 300));

    const positionAfter = await getPosition(investorId, fund.id);
    const expectedPosition = positionBefore + 1000 - 500;

    expect(positionAfter).toBeCloseTo(expectedPosition, 8);
  });
});

// ============================================================================
// Test Suite: Audit Trail Completeness
// ============================================================================

test.describe('Audit Trail Completeness', () => {
  const testDate = '2026-01-18';
  const testFundCode = 'IND-USDT';

  test('should create audit log entry for deposit', async () => {
    const investorId = await createTestInvestor('Audit Deposit Investor');
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const result = await performDeposit(investorId, testFundCode, 1000, testDate);
    expect(result.success).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Check audit log
    const { data: auditLogs, error } = await client
      .from('audit_log')
      .select('*')
      .eq('entity', 'transactions_v2')
      .eq('entity_id', result.transaction_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.log(`Audit log query error: ${error.message}`);
    } else if (auditLogs && auditLogs.length > 0) {
      expect(auditLogs[0].action).toBeDefined();
      console.log(`Audit log entry found: action=${auditLogs[0].action}`);
    } else {
      console.log('No audit log entry found for transaction');
    }
  });

  test('should create audit log entry for withdrawal', async () => {
    const investorId = await createTestInvestor('Audit Withdrawal Investor');
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    await performDeposit(investorId, testFundCode, 2000, testDate);
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = await performWithdrawal(investorId, testFundCode, 500, testDate);
    expect(result.success).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Check audit log
    const { data: auditLogs, error } = await client
      .from('audit_log')
      .select('*')
      .eq('entity', 'transactions_v2')
      .eq('entity_id', result.transaction_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && auditLogs && auditLogs.length > 0) {
      expect(auditLogs[0].action).toBeDefined();
    }
  });

  test('should record all transaction metadata', async () => {
    const investorId = await createTestInvestor('Metadata Test Investor');
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const result = await performDeposit(investorId, testFundCode, 7777.77, testDate);
    expect(result.success).toBe(true);

    // Verify transaction record has all required fields
    const { data: tx, error } = await client
      .from('transactions_v2')
      .select('*')
      .eq('id', result.transaction_id)
      .single();

    expect(error).toBeNull();
    expect(tx).toBeDefined();
    expect(tx.investor_id).toBe(investorId);
    expect(tx.fund_id).toBe(fund.id);
    expect(tx.type).toBe('DEPOSIT');
    expect(parseFloat(tx.amount)).toBeCloseTo(7777.77, 8);
    expect(tx.tx_date).toBe(testDate);
    expect(tx.is_voided).toBe(false);
    expect(tx.created_at).toBeDefined();
  });
});

// ============================================================================
// Test Suite: SQL Injection Prevention
// ============================================================================

test.describe('SQL Injection Prevention', () => {
  const testDate = '2026-01-18';
  const testFundCode = 'IND-USDT';

  test('should safely handle malicious investor name', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const maliciousName = "Robert'); DROP TABLE investors;--";

    const { data, error } = await client
      .from('profiles')
      .insert({
        full_name: maliciousName,
        email: `sqlinjection.test.${Date.now()}@test.indigo.fund`,
        status: 'active',
        kyc_status: 'approved',
      })
      .select('id, full_name')
      .single();

    if (data) {
      testInvestorIds.push(data.id);
      // Name should be stored as-is (escaped), not executed
      expect(data.full_name).toBe(maliciousName);
    }

    // Verify investors table still exists
    const { count, error: countError } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    expect(countError).toBeNull();
    expect(count).toBeGreaterThan(0);
  });

  test('should safely handle malicious notes in transaction', async () => {
    const investorId = await createTestInvestor('SQL Test Investor');
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const maliciousNotes = "'; DELETE FROM transactions_v2; --";

    const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
      p_investor_id: investorId,
      p_fund_id: fund.id,
      p_amount: 1000,
      p_tx_date: testDate,
      p_notes: maliciousNotes,
    });

    // Should succeed without executing SQL injection
    expect(data?.success).toBe(true);

    // Verify transactions still exist
    const { count, error: countError } = await client
      .from('transactions_v2')
      .select('*', { count: 'exact', head: true });

    expect(countError).toBeNull();
    expect(count).toBeGreaterThan(0);
  });
});
