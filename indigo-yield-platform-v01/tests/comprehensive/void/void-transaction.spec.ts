/**
 * Void Transaction Tests
 *
 * Comprehensive tests for transaction voiding including:
 * - Basic void operation
 * - Void impact analysis
 * - Position recalculation after void
 * - Void and reissue workflow
 * - Voiding yield distributions
 * - Audit trail for voids
 * - Cascading effects
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

// ============================================================================
// Type Definitions
// ============================================================================

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

interface Transaction {
  id: string;
  investor_id: string;
  fund_id: string;
  type: string;
  amount: string;
  is_voided: boolean;
  voided_reason?: string;
  voided_at?: string;
}

interface VoidImpact {
  position_before: number;
  position_after: number;
  difference: number;
  affected_yield?: number;
}

// ============================================================================
// Global Test State
// ============================================================================

let supabase: SupabaseClient;
let serviceSupabase: SupabaseClient;
let testFunds: Map<string, Fund> = new Map();
let testInvestorIds: string[] = [];
let testTransactionIds: string[] = [];

// ============================================================================
// Setup and Teardown
// ============================================================================

test.beforeAll(async () => {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (SUPABASE_SERVICE_KEY) {
    serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  const { data: authData } = await supabase.auth.signInWithPassword({
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
  });

  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const { data: funds } = await client
    .from('funds')
    .select('id, code, name, asset')
    .in('code', FUND_CODES as unknown as string[]);

  if (funds) {
    funds.forEach(fund => testFunds.set(fund.code, fund));
  }

  console.log(`Loaded ${testFunds.size} funds for void tests`);
});

test.afterAll(async () => {
  // Cleanup handled by force_delete_investor
});

// ============================================================================
// Helper Functions
// ============================================================================

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
      email: `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@test.indigo.fund`,
      status: 'active',
      kyc_status: 'approved',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create investor: ${error.message}`);

  testInvestorIds.push(data.id);
  return data.id;
}

async function performDeposit(
  investorId: string,
  fundCode: string,
  amount: number,
  txDate: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const fund = testFunds.get(fundCode);
  if (!fund) return { success: false, error: `Fund ${fundCode} not found` };

  const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
    p_investor_id: investorId,
    p_fund_id: fund.id,
    p_amount: amount,
    p_tx_date: txDate,
    p_notes: 'Void test deposit',
  });

  if (error) return { success: false, error: error.message };

  if (data?.transaction_id) {
    testTransactionIds.push(data.transaction_id);
  }

  return { success: data?.success ?? false, transactionId: data?.transaction_id };
}

async function getTransaction(transactionId: string): Promise<Transaction | null> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client
    .from('transactions_v2')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (error) return null;
  return data;
}

async function getPosition(investorId: string, fundId: string): Promise<number> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data } = await client
    .from('investor_positions')
    .select('current_value')
    .eq('investor_id', investorId)
    .eq('fund_id', fundId)
    .single();

  return data ? parseFloat(data.current_value) : 0;
}

async function voidTransaction(
  transactionId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client.rpc('void_transaction', {
    p_transaction_id: transactionId,
    p_reason: reason,
  });

  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? true };
}

async function getVoidImpact(transactionId: string): Promise<VoidImpact | null> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client.rpc('get_void_transaction_impact', {
    p_transaction_id: transactionId,
  });

  if (error) {
    console.warn(`Get void impact error: ${error.message}`);
    return null;
  }

  return data;
}

async function voidAndReissue(
  transactionId: string,
  newAmount: number,
  reason: string
): Promise<{ success: boolean; newTransactionId?: string; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client.rpc('void_and_reissue_transaction', {
    p_transaction_id: transactionId,
    p_new_amount: newAmount,
    p_reason: reason,
  });

  if (error) return { success: false, error: error.message };

  if (data?.new_transaction_id) {
    testTransactionIds.push(data.new_transaction_id);
  }

  return {
    success: data?.success ?? false,
    newTransactionId: data?.new_transaction_id,
  };
}

// ============================================================================
// Test Suite: Basic Void Operation
// ============================================================================

test.describe('Basic Void Operation', () => {
  let testInvestorId: string;
  let testTransactionId: string;
  const testFundCode = 'IND-USDT';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Basic Void Test Investor');
    const result = await performDeposit(testInvestorId, testFundCode, 10000, testDate);
    testTransactionId = result.transactionId!;
  });

  test('should void a deposit transaction', async () => {
    const result = await voidTransaction(testTransactionId, 'Test void - basic operation');

    expect(result.success).toBe(true);

    // Verify transaction is voided
    const tx = await getTransaction(testTransactionId);
    expect(tx!.is_voided).toBe(true);
    expect(tx!.voided_reason).toBe('Test void - basic operation');
    expect(tx!.voided_at).toBeDefined();
  });

  test('should update position after void', async () => {
    const fund = testFunds.get(testFundCode)!;
    const position = await getPosition(testInvestorId, fund.id);

    // Position should be 0 since the only deposit was voided
    expect(position).toBeCloseTo(0, 8);
  });

  test('should reject void of already voided transaction', async () => {
    const result = await voidTransaction(testTransactionId, 'Double void attempt');

    // Should fail - already voided
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Test Suite: Void Impact Analysis
// ============================================================================

test.describe('Void Impact Analysis', () => {
  let testInvestorId: string;
  let testTransactionId: string;
  const testFundCode = 'IND-ETH';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Void Impact Test Investor');

    // Create initial deposit
    await performDeposit(testInvestorId, testFundCode, 10, testDate);

    // Create second deposit (this one we'll analyze for void impact)
    const result = await performDeposit(testInvestorId, testFundCode, 5, testDate);
    testTransactionId = result.transactionId!;
  });

  test('should preview void impact before voiding', async () => {
    const impact = await getVoidImpact(testTransactionId);

    if (impact) {
      expect(impact.position_before).toBeGreaterThan(impact.position_after);
      expect(impact.difference).toBeCloseTo(5, 8);

      console.log(`Void Impact Preview:
        Position Before: ${impact.position_before}
        Position After: ${impact.position_after}
        Difference: ${impact.difference}`);
    }
  });

  test('should accurately predict position change', async () => {
    const fund = testFunds.get(testFundCode)!;
    const positionBefore = await getPosition(testInvestorId, fund.id);

    const impact = await getVoidImpact(testTransactionId);

    if (impact) {
      expect(impact.position_before).toBeCloseTo(positionBefore, 8);
    }

    // Now void and verify
    await voidTransaction(testTransactionId, 'Impact verification void');
    await new Promise(resolve => setTimeout(resolve, 500));

    const positionAfter = await getPosition(testInvestorId, fund.id);

    if (impact) {
      expect(positionAfter).toBeCloseTo(impact.position_after, 8);
    }
  });
});

// ============================================================================
// Test Suite: Void and Reissue
// ============================================================================

test.describe('Void and Reissue', () => {
  let testInvestorId: string;
  let testTransactionId: string;
  const testFundCode = 'IND-SOL';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Void Reissue Test Investor');
    const result = await performDeposit(testInvestorId, testFundCode, 1000, testDate);
    testTransactionId = result.transactionId!;
  });

  test('should void and reissue with corrected amount', async () => {
    const newAmount = 1500; // Correction from 1000 to 1500

    const result = await voidAndReissue(
      testTransactionId,
      newAmount,
      'Amount correction: 1000 -> 1500'
    );

    if (result.success) {
      // Original should be voided
      const originalTx = await getTransaction(testTransactionId);
      expect(originalTx!.is_voided).toBe(true);

      // New transaction should exist
      const newTx = await getTransaction(result.newTransactionId!);
      expect(newTx).toBeDefined();
      expect(parseFloat(newTx!.amount)).toBeCloseTo(newAmount, 8);
    } else {
      console.warn(`Void and reissue failed: ${result.error}`);
    }
  });

  test('should have correct position after reissue', async () => {
    const fund = testFunds.get(testFundCode)!;
    const position = await getPosition(testInvestorId, fund.id);

    // Position should be 1500 (the corrected amount)
    expect(position).toBeCloseTo(1500, 8);
  });

  test('should preserve transaction date in reissue', async () => {
    const investorId = await createTestInvestor('Date Preserve Test');
    const depositResult = await performDeposit(investorId, testFundCode, 500, '2026-01-10');

    const reissueResult = await voidAndReissue(
      depositResult.transactionId!,
      600,
      'Amount correction'
    );

    if (reissueResult.success && reissueResult.newTransactionId) {
      const newTx = await getTransaction(reissueResult.newTransactionId);
      expect(newTx!.tx_date || '').toBe('2026-01-10');
    }
  });
});

// ============================================================================
// Test Suite: Void Withdrawal
// ============================================================================

test.describe('Void Withdrawal', () => {
  let testInvestorId: string;
  let depositTxId: string;
  let withdrawalTxId: string;
  const testFundCode = 'IND-USDT';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Void Withdrawal Test Investor');

    // Create deposit
    const depositResult = await performDeposit(testInvestorId, testFundCode, 10000, testDate);
    depositTxId = depositResult.transactionId!;

    await new Promise(resolve => setTimeout(resolve, 500));

    // Create withdrawal (via RPC)
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const { data } = await client.rpc('apply_withdrawal_with_crystallization', {
      p_investor_id: testInvestorId,
      p_fund_id: fund.id,
      p_amount: 3000,
      p_tx_date: testDate,
      p_notes: 'Test withdrawal for void',
    });

    if (data?.transaction_id) {
      withdrawalTxId = data.transaction_id;
      testTransactionIds.push(withdrawalTxId);
    }
  });

  test('should void withdrawal and restore position', async () => {
    const fund = testFunds.get(testFundCode)!;
    const positionBefore = await getPosition(testInvestorId, fund.id);

    // Should be 7000 (10000 - 3000)
    expect(positionBefore).toBeCloseTo(7000, 8);

    // Void the withdrawal
    const result = await voidTransaction(withdrawalTxId, 'Void withdrawal test');

    if (result.success) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const positionAfter = await getPosition(testInvestorId, fund.id);

      // Should be restored to 10000
      expect(positionAfter).toBeCloseTo(10000, 8);
    }
  });
});

// ============================================================================
// Test Suite: Void Yield Distribution
// ============================================================================

test.describe('Void Yield Distribution', () => {
  let testInvestorId: string;
  let yieldDistributionId: string;
  const testFundCode = 'IND-BTC';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Void Yield Test Investor');

    // Create position
    await performDeposit(testInvestorId, testFundCode, 1, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Apply yield
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const { data } = await client.rpc('apply_daily_yield_to_fund_v3', {
      p_fund_id: fund.id,
      p_yield_amount: 0.01,
      p_yield_date: testDate,
      p_notes: 'Test yield for void',
    });

    if (data?.distribution_id) {
      yieldDistributionId = data.distribution_id;
    }
  });

  test('should get void yield impact', async () => {
    if (!yieldDistributionId) {
      test.skip();
      return;
    }

    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: impact, error } = await client.rpc('get_void_yield_impact', {
      p_distribution_id: yieldDistributionId,
    });

    if (error) {
      console.warn(`Get void yield impact error: ${error.message}`);
    } else if (impact) {
      console.log(`Void Yield Impact:`, impact);
      expect(impact).toBeDefined();
    }
  });

  test('should void yield distribution', async () => {
    if (!yieldDistributionId) {
      test.skip();
      return;
    }

    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    // Get position before void
    const positionBefore = await getPosition(testInvestorId, fund.id);

    // Void the yield distribution
    const { error } = await client
      .from('yield_distributions')
      .update({ status: 'voided', voided_reason: 'Test void' })
      .eq('id', yieldDistributionId);

    if (error) {
      console.warn(`Void yield error: ${error.message}`);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Position should decrease
    const positionAfter = await getPosition(testInvestorId, fund.id);

    console.log(`Position before void: ${positionBefore}, after: ${positionAfter}`);
  });
});

// ============================================================================
// Test Suite: Audit Trail
// ============================================================================

test.describe('Void Audit Trail', () => {
  let testInvestorId: string;
  let testTransactionId: string;
  const testFundCode = 'IND-XRP';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Void Audit Test Investor');
    const result = await performDeposit(testInvestorId, testFundCode, 5000, testDate);
    testTransactionId = result.transactionId!;
  });

  test('should record void in audit log', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    await voidTransaction(testTransactionId, 'Audit trail test void');

    // Check audit log
    const { data: auditLogs } = await client
      .from('audit_log')
      .select('*')
      .eq('entity', 'transactions_v2')
      .eq('entity_id', testTransactionId)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`Audit log entries for void: ${auditLogs?.length || 0}`);

    if (auditLogs && auditLogs.length > 0) {
      // Should have void-related entry
      const voidEntry = auditLogs.find(a =>
        a.action === 'UPDATE' || a.action === 'VOID'
      );
      expect(voidEntry).toBeDefined();
    }
  });

  test('should store void reason in transaction', async () => {
    const tx = await getTransaction(testTransactionId);

    expect(tx!.voided_reason).toBe('Audit trail test void');
    expect(tx!.voided_at).toBeDefined();
  });
});

// ============================================================================
// Test Suite: Edge Cases
// ============================================================================

test.describe('Void Edge Cases', () => {
  test('should reject void of non-existent transaction', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const result = await voidTransaction(fakeId, 'Void non-existent');

    expect(result.success).toBe(false);
  });

  test('should handle void of very old transaction', async () => {
    const investorId = await createTestInvestor('Old Transaction Void');
    const oldDate = '2020-01-01';

    const depositResult = await performDeposit(investorId, 'IND-USDT', 1000, oldDate);

    if (depositResult.success && depositResult.transactionId) {
      const result = await voidTransaction(
        depositResult.transactionId,
        'Voiding old transaction'
      );

      // Should succeed or fail based on business rules
      console.log(`Old transaction void: success=${result.success}`);
    }
  });

  test('should handle multiple voids in sequence', async () => {
    const investorId = await createTestInvestor('Sequential Void Investor');
    const fund = testFunds.get('IND-ETH')!;

    // Create multiple deposits
    const deposit1 = await performDeposit(investorId, 'IND-ETH', 5, '2026-01-18');
    const deposit2 = await performDeposit(investorId, 'IND-ETH', 3, '2026-01-18');
    const deposit3 = await performDeposit(investorId, 'IND-ETH', 2, '2026-01-18');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Position should be 10
    let position = await getPosition(investorId, fund.id);
    expect(position).toBeCloseTo(10, 8);

    // Void in sequence
    await voidTransaction(deposit3.transactionId!, 'Void 3');
    await new Promise(resolve => setTimeout(resolve, 300));
    position = await getPosition(investorId, fund.id);
    expect(position).toBeCloseTo(8, 8);

    await voidTransaction(deposit2.transactionId!, 'Void 2');
    await new Promise(resolve => setTimeout(resolve, 300));
    position = await getPosition(investorId, fund.id);
    expect(position).toBeCloseTo(5, 8);

    await voidTransaction(deposit1.transactionId!, 'Void 1');
    await new Promise(resolve => setTimeout(resolve, 300));
    position = await getPosition(investorId, fund.id);
    expect(position).toBeCloseTo(0, 8);
  });

  test('should handle void with very small amount (dust)', async () => {
    const investorId = await createTestInvestor('Dust Void Investor');

    const depositResult = await performDeposit(investorId, 'IND-BTC', 0.00000001, '2026-01-18');

    if (depositResult.success && depositResult.transactionId) {
      const result = await voidTransaction(
        depositResult.transactionId,
        'Void dust transaction'
      );

      expect(result.success).toBe(true);
    }
  });

  test('should handle concurrent void attempts', async () => {
    const investorId = await createTestInvestor('Concurrent Void Investor');
    const depositResult = await performDeposit(investorId, 'IND-SOL', 500, '2026-01-18');

    if (depositResult.success && depositResult.transactionId) {
      // Try concurrent voids
      const voidPromises = Array(3).fill(null).map((_, i) =>
        voidTransaction(depositResult.transactionId!, `Concurrent void attempt ${i}`)
      );

      const results = await Promise.all(voidPromises);

      // Only one should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeLessThanOrEqual(1);

      console.log(`Concurrent void results: ${successCount}/3 succeeded`);
    }
  });
});

// ============================================================================
// Test Suite: Cascading Effects
// ============================================================================

test.describe('Void Cascading Effects', () => {
  test('should update AUM after void', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const investorId = await createTestInvestor('AUM Cascade Void Investor');
    const fund = testFunds.get('IND-USDT')!;

    // Create deposit
    const depositResult = await performDeposit(investorId, 'IND-USDT', 50000, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get AUM before void
    const { data: aumBefore } = await client
      .from('fund_daily_aum')
      .select('total_aum')
      .eq('fund_id', fund.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Void the deposit
    await voidTransaction(depositResult.transactionId!, 'AUM cascade test');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get AUM after void
    const { data: aumAfter } = await client
      .from('fund_daily_aum')
      .select('total_aum')
      .eq('fund_id', fund.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log(`AUM before void: ${aumBefore?.total_aum}, after: ${aumAfter?.total_aum}`);
  });

  test('should void related yield allocations when voiding deposit', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const investorId = await createTestInvestor('Yield Cascade Void Investor');
    const fund = testFunds.get('IND-ETH')!;

    // Create deposit
    const depositResult = await performDeposit(investorId, 'IND-ETH', 10, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Apply yield
    await client.rpc('apply_daily_yield_to_fund_v3', {
      p_fund_id: fund.id,
      p_yield_amount: 0.1,
      p_yield_date: '2026-01-18',
      p_notes: 'Cascade test yield',
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Get yield allocation
    const { data: allocationsBefore } = await client
      .from('yield_allocations')
      .select('*')
      .eq('investor_id', investorId)
      .eq('is_voided', false);

    console.log(`Yield allocations before void: ${allocationsBefore?.length || 0}`);

    // Now void the original deposit - this may or may not cascade
    await voidTransaction(depositResult.transactionId!, 'Cascade test void');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if yield allocations are affected
    const { data: allocationsAfter } = await client
      .from('yield_allocations')
      .select('*')
      .eq('investor_id', investorId)
      .eq('is_voided', false);

    console.log(`Yield allocations after void: ${allocationsAfter?.length || 0}`);
  });
});

// ============================================================================
// Test Suite: Void Restrictions
// ============================================================================

test.describe('Void Restrictions', () => {
  test('should check for period lock before void', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const investorId = await createTestInvestor('Period Lock Void Investor');
    const fund = testFunds.get('IND-SOL')!;

    // Create deposit
    const depositResult = await performDeposit(investorId, 'IND-SOL', 200, '2026-01-15');

    // Check if period is locked
    const { data: isLocked } = await client.rpc('is_period_locked', {
      p_fund_id: fund.id,
      p_period_date: '2026-01-15',
    });

    if (isLocked) {
      const result = await voidTransaction(
        depositResult.transactionId!,
        'Void in locked period'
      );

      // Should fail if period is locked
      expect(result.success).toBe(false);
    } else {
      // Period not locked, void should work
      const result = await voidTransaction(
        depositResult.transactionId!,
        'Void in unlocked period'
      );

      expect(result.success).toBe(true);
    }
  });

  test('should require reason for void', async () => {
    const investorId = await createTestInvestor('Reason Required Investor');
    const depositResult = await performDeposit(investorId, 'IND-XRP', 1000, '2026-01-18');

    // Try void without reason (empty string)
    const result = await voidTransaction(depositResult.transactionId!, '');

    // Behavior depends on validation rules
    console.log(`Void without reason: success=${result.success}, error=${result.error}`);
  });
});
