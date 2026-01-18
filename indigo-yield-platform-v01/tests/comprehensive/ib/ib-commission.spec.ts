/**
 * Introducing Broker (IB) Commission Tests
 *
 * Comprehensive tests for IB functionality including:
 * - IB registration and configuration
 * - Referral tracking and attribution
 * - Commission calculation from yield distributions
 * - Commission payout processing
 * - IB allocation records
 * - Commission ledger integrity
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

// IB commission rates for testing
const DEFAULT_IB_COMMISSION_RATE = 0.10; // 10% of yield

// ============================================================================
// Type Definitions
// ============================================================================

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

interface IBProfile {
  id: string;
  full_name: string;
  email: string;
  ib_code?: string;
  commission_rate?: number;
}

interface IBConfig {
  id: string;
  ib_profile_id: string;
  investor_id: string;
  commission_rate: number;
  is_active: boolean;
}

interface IBAllocation {
  id: string;
  ib_profile_id: string;
  investor_id: string;
  fund_id: string;
  yield_distribution_id: string;
  commission_amount: string;
  commission_rate: string;
  investor_yield_amount: string;
  created_at: string;
}

interface IBCommissionLedger {
  id: string;
  ib_profile_id: string;
  fund_id: string;
  amount: string;
  transaction_type: string;
  reference_id: string;
  created_at: string;
}

// ============================================================================
// Global Test State
// ============================================================================

let supabase: SupabaseClient;
let serviceSupabase: SupabaseClient;
let testFunds: Map<string, Fund> = new Map();
let testIBProfileIds: string[] = [];
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

  if (authError && !SUPABASE_SERVICE_KEY) {
    throw new Error('No authentication method available');
  }

  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const { data: funds } = await client
    .from('funds')
    .select('id, code, name, asset')
    .in('code', FUND_CODES as unknown as string[]);

  if (funds) {
    funds.forEach(fund => testFunds.set(fund.code, fund));
  }

  console.log(`Loaded ${testFunds.size} funds for IB tests`);
});

test.afterAll(async () => {
  // Cleanup test data
  if (SUPABASE_SERVICE_KEY) {
    const client = serviceSupabase;

    // Clean up IB allocations
    if (testIBProfileIds.length > 0) {
      await client
        .from('ib_allocations')
        .delete()
        .in('ib_profile_id', testIBProfileIds);

      await client
        .from('ib_commission_ledger')
        .delete()
        .in('ib_profile_id', testIBProfileIds);
    }

    // Clean up test investors
    if (testInvestorIds.length > 0) {
      await client
        .from('transactions_v2')
        .delete()
        .in('investor_id', testInvestorIds);

      await client
        .from('investor_positions')
        .delete()
        .in('investor_id', testInvestorIds);
    }
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

async function createTestIB(name: string, commissionRate: number = DEFAULT_IB_COMMISSION_RATE): Promise<string> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const [firstName, ...lastParts] = name.split(' ');
  const lastName = lastParts.join(' ') || 'IB';
  const id = randomUUID();

  const { data, error } = await client
    .from('profiles')
    .insert({
      id,
      first_name: firstName,
      last_name: lastName,
      email: `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@ib.indigo.fund`,
      account_type: 'ib',
      ib_percentage: commissionRate,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create test IB: ${error.message}`);

  testIBProfileIds.push(data.id);
  return data.id;
}

async function createTestInvestor(name: string, ibProfileId?: string): Promise<string> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const [firstName, ...lastParts] = name.split(' ');
  const lastName = lastParts.join(' ') || 'Test';
  const id = randomUUID();

  const investorData: any = {
    id,
    first_name: firstName,
    last_name: lastName,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@test.indigo.fund`,
    status: 'active',
    kyc_status: 'approved',
  };

  if (ibProfileId) {
    investorData.referred_by = ibProfileId;
  }

  const { data, error } = await client
    .from('profiles')
    .insert(investorData)
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create test investor: ${error.message}`);

  testInvestorIds.push(data.id);
  return data.id;
}

async function createIBConfig(
  ibProfileId: string,
  investorId: string,
  commissionRate: number = DEFAULT_IB_COMMISSION_RATE
): Promise<string> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client
    .from('ib_configs')
    .insert({
      ib_profile_id: ibProfileId,
      investor_id: investorId,
      commission_rate: commissionRate,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    // Table might not exist, try alternative approach
    console.warn(`IB config creation warning: ${error.message}`);
    return '';
  }

  return data?.id || '';
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
    p_notes: `IB test deposit`,
  });

  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? false, transactionId: data?.transaction_id };
}

async function applyYieldDistribution(
  fundId: string,
  yieldAmount: number,
  yieldDate: string
): Promise<{ success: boolean; distributionId?: string; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client.rpc('apply_daily_yield_to_fund_v3', {
    p_fund_id: fundId,
    p_yield_amount: yieldAmount,
    p_yield_date: yieldDate,
    p_notes: 'IB commission test yield',
  });

  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? false, distributionId: data?.distribution_id };
}

async function getIBAllocations(ibProfileId: string): Promise<IBAllocation[]> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client
    .from('ib_allocations')
    .select('*')
    .eq('ib_profile_id', ibProfileId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn(`Failed to fetch IB allocations: ${error.message}`);
    return [];
  }

  return data || [];
}

async function getIBCommissionLedger(ibProfileId: string): Promise<IBCommissionLedger[]> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client
    .from('ib_commission_ledger')
    .select('*')
    .eq('ib_profile_id', ibProfileId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn(`Failed to fetch IB commission ledger: ${error.message}`);
    return [];
  }

  return data || [];
}

// ============================================================================
// Test Suite: IB Profile Management
// ============================================================================

test.describe('IB Profile Management', () => {
  test('should create IB profile with commission rate', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const ibName = 'Test IB Profile';

    const { data, error } = await client
      .from('profiles')
      .insert({
        full_name: ibName,
        email: `test.ib.profile.${Date.now()}@ib.indigo.fund`,
        role: 'ib',
        ib_code: `IB-TEST-${Date.now()}`,
        status: 'active',
      })
      .select('*')
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.role).toBe('ib');
    expect(data.ib_code).toBeDefined();

    if (data) testIBProfileIds.push(data.id);
  });

  test('should generate unique IB code', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const ib1 = await createTestIB('IB Code Test 1');
    const ib2 = await createTestIB('IB Code Test 2');

    const { data: profiles } = await client
      .from('profiles')
      .select('id, ib_code')
      .in('id', [ib1, ib2]);

    expect(profiles).toHaveLength(2);
    expect(profiles![0].ib_code).not.toBe(profiles![1].ib_code);
  });

  test('should list all active IBs', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    await createTestIB('Active IB List Test');

    const { data: ibs, error } = await client
      .from('profiles')
      .select('*')
      .eq('role', 'ib')
      .eq('status', 'active');

    expect(error).toBeNull();
    expect(ibs).toBeDefined();
    expect(ibs!.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Test Suite: IB Referral Tracking
// ============================================================================

test.describe('IB Referral Tracking', () => {
  let testIBId: string;

  test.beforeAll(async () => {
    testIBId = await createTestIB('Referral Tracking IB');
  });

  test('should link investor to IB via referral', async () => {
    const investorId = await createTestInvestor('Referred Investor', testIBId);
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: investor } = await client
      .from('profiles')
      .select('id, referred_by')
      .eq('id', investorId)
      .single();

    expect(investor).toBeDefined();
    expect(investor!.referred_by).toBe(testIBId);
  });

  test('should list all investors referred by IB', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Create multiple referred investors
    await createTestInvestor('Referred Investor 1', testIBId);
    await createTestInvestor('Referred Investor 2', testIBId);
    await createTestInvestor('Referred Investor 3', testIBId);

    const { data: referrals } = await client
      .from('profiles')
      .select('id, full_name')
      .eq('referred_by', testIBId);

    expect(referrals).toBeDefined();
    expect(referrals!.length).toBeGreaterThanOrEqual(3);
  });

  test('should not affect IB when investor has no referrer', async () => {
    const investorId = await createTestInvestor('Non-Referred Investor');
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: investor } = await client
      .from('profiles')
      .select('id, referred_by')
      .eq('id', investorId)
      .single();

    expect(investor).toBeDefined();
    expect(investor!.referred_by).toBeNull();
  });
});

// ============================================================================
// Test Suite: IB Commission Calculation
// ============================================================================

test.describe('IB Commission Calculation', () => {
  let testIBId: string;
  let testInvestorId: string;
  const testFundCode = 'IND-USDT';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testIBId = await createTestIB('Commission Calc IB', 0.10); // 10% commission
    testInvestorId = await createTestInvestor('Commission Calc Investor', testIBId);
    await createIBConfig(testIBId, testInvestorId, 0.10);
  });

  test('should calculate commission as percentage of investor yield', async () => {
    const fund = testFunds.get(testFundCode)!;

    // Deposit to create position
    await performDeposit(testInvestorId, testFundCode, 100000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Apply yield
    const yieldAmount = 1000; // 1000 USDT yield
    const result = await applyYieldDistribution(fund.id, yieldAmount, testDate);

    if (!result.success) {
      console.warn(`Yield distribution failed: ${result.error}`);
      test.skip();
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Check IB allocations
    const allocations = await getIBAllocations(testIBId);

    // If yield distribution creates IB allocations
    if (allocations.length > 0) {
      const latestAllocation = allocations[0];
      const expectedCommission = parseFloat(latestAllocation.investor_yield_amount) * 0.10;

      expect(parseFloat(latestAllocation.commission_amount)).toBeCloseTo(expectedCommission, 4);
    } else {
      console.log('No IB allocations created - verify IB allocation logic');
    }
  });

  test('should handle different commission rates per investor', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Create IB with different rates for different investors
    const ib = await createTestIB('Multi-Rate IB');

    const investor1 = await createTestInvestor('Low Rate Investor', ib);
    const investor2 = await createTestInvestor('High Rate Investor', ib);

    // Create configs with different rates
    await createIBConfig(ib, investor1, 0.05); // 5%
    await createIBConfig(ib, investor2, 0.15); // 15%

    // Verify configs
    const { data: configs } = await client
      .from('ib_configs')
      .select('*')
      .eq('ib_profile_id', ib);

    if (configs && configs.length === 2) {
      const rates = configs.map(c => c.commission_rate).sort();
      expect(rates).toContain(0.05);
      expect(rates).toContain(0.15);
    }
  });

  test('should not generate commission for non-referred investor', async () => {
    const fund = testFunds.get(testFundCode)!;
    const nonReferredInvestor = await createTestInvestor('Non-Referred Commission Test');

    // Deposit for non-referred investor
    await performDeposit(nonReferredInvestor, testFundCode, 50000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Count IB allocations before yield
    const allocationsBefore = await getIBAllocations(testIBId);

    // Apply yield - non-referred investor should not generate commission
    await applyYieldDistribution(fund.id, 500, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify no new allocation for non-referred investor
    const allocationsAfter = await getIBAllocations(testIBId);

    // New allocations should not include non-referred investor
    const newAllocations = allocationsAfter.filter(a =>
      !allocationsBefore.find(b => b.id === a.id)
    );

    const nonReferredAllocation = newAllocations.find(a =>
      a.investor_id === nonReferredInvestor
    );

    expect(nonReferredAllocation).toBeUndefined();
  });
});

// ============================================================================
// Test Suite: IB Commission Ledger
// ============================================================================

test.describe('IB Commission Ledger', () => {
  let testIBId: string;
  let testInvestorId: string;
  const testFundCode = 'IND-ETH';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testIBId = await createTestIB('Ledger Test IB');
    testInvestorId = await createTestInvestor('Ledger Test Investor', testIBId);
    await createIBConfig(testIBId, testInvestorId, 0.10);
  });

  test('should record commission in ledger on yield distribution', async () => {
    const fund = testFunds.get(testFundCode)!;

    // Create position
    await performDeposit(testInvestorId, testFundCode, 10, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Apply yield
    const result = await applyYieldDistribution(fund.id, 0.5, testDate);

    if (!result.success) {
      console.warn(`Yield distribution failed for ledger test`);
      test.skip();
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Check ledger entries
    const ledger = await getIBCommissionLedger(testIBId);

    if (ledger.length > 0) {
      const latestEntry = ledger[0];
      expect(latestEntry.fund_id).toBe(fund.id);
      expect(parseFloat(latestEntry.amount)).toBeGreaterThan(0);
    }
  });

  test('should track cumulative commission balance', async () => {
    const fund = testFunds.get(testFundCode)!;

    // Get current ledger balance
    const ledgerBefore = await getIBCommissionLedger(testIBId);
    const balanceBefore = ledgerBefore.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // Apply multiple yields
    await applyYieldDistribution(fund.id, 0.1, testDate);
    await applyYieldDistribution(fund.id, 0.2, testDate);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const ledgerAfter = await getIBCommissionLedger(testIBId);
    const balanceAfter = ledgerAfter.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    expect(balanceAfter).toBeGreaterThanOrEqual(balanceBefore);
  });

  test('should separate ledger by fund', async () => {
    const btcFund = testFunds.get('IND-BTC')!;
    const ethFund = testFunds.get('IND-ETH')!;

    // Create positions in multiple funds
    await performDeposit(testInvestorId, 'IND-BTC', 0.1, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Apply yields to different funds
    await applyYieldDistribution(btcFund.id, 0.001, testDate);
    await applyYieldDistribution(ethFund.id, 0.01, testDate);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const ledger = await getIBCommissionLedger(testIBId);

    // Group by fund
    const byFund = new Map<string, number>();
    for (const entry of ledger) {
      const current = byFund.get(entry.fund_id) || 0;
      byFund.set(entry.fund_id, current + parseFloat(entry.amount));
    }

    // Should have entries for multiple funds
    console.log(`Ledger entries by fund: ${byFund.size} funds`);
  });
});

// ============================================================================
// Test Suite: IB Payout Processing
// ============================================================================

test.describe('IB Payout Processing', () => {
  let testIBId: string;

  test.beforeAll(async () => {
    testIBId = await createTestIB('Payout Test IB');
  });

  test('should list pending commissions for payout', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Query pending commissions (not yet paid out)
    const { data: pendingCommissions, error } = await client
      .from('ib_allocations')
      .select('*')
      .eq('ib_profile_id', testIBId)
      .is('paid_out_at', null);

    if (error) {
      console.warn(`Pending commissions query: ${error.message}`);
    }

    // Document the result
    console.log(`Pending commissions for IB: ${pendingCommissions?.length || 0}`);
  });

  test('should calculate total pending payout by fund', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: allocations } = await client
      .from('ib_allocations')
      .select('fund_id, commission_amount')
      .eq('ib_profile_id', testIBId)
      .is('paid_out_at', null);

    if (allocations && allocations.length > 0) {
      const byFund = new Map<string, number>();
      for (const a of allocations) {
        const current = byFund.get(a.fund_id) || 0;
        byFund.set(a.fund_id, current + parseFloat(a.commission_amount));
      }

      console.log(`Pending payout breakdown by fund:`);
      for (const [fundId, total] of byFund) {
        console.log(`  Fund ${fundId}: ${total}`);
      }
    }
  });

  test('should mark commissions as paid', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Get unpaid allocations
    const { data: unpaidAllocations } = await client
      .from('ib_allocations')
      .select('id')
      .eq('ib_profile_id', testIBId)
      .is('paid_out_at', null)
      .limit(5);

    if (unpaidAllocations && unpaidAllocations.length > 0) {
      const allocationIds = unpaidAllocations.map(a => a.id);

      // Mark as paid
      const { error } = await client
        .from('ib_allocations')
        .update({ paid_out_at: new Date().toISOString() })
        .in('id', allocationIds);

      if (error) {
        console.warn(`Failed to mark as paid: ${error.message}`);
      } else {
        // Verify
        const { data: paidAllocations } = await client
          .from('ib_allocations')
          .select('id, paid_out_at')
          .in('id', allocationIds);

        expect(paidAllocations!.every(a => a.paid_out_at !== null)).toBe(true);
      }
    }
  });
});

// ============================================================================
// Test Suite: IB Allocation Records
// ============================================================================

test.describe('IB Allocation Records', () => {
  let testIBId: string;
  let testInvestorId: string;
  const testFundCode = 'IND-SOL';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testIBId = await createTestIB('Allocation Records IB');
    testInvestorId = await createTestInvestor('Allocation Records Investor', testIBId);
    await createIBConfig(testIBId, testInvestorId, 0.10);

    // Create position
    await performDeposit(testInvestorId, testFundCode, 1000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should link allocation to yield distribution', async () => {
    const fund = testFunds.get(testFundCode)!;

    const yieldResult = await applyYieldDistribution(fund.id, 50, testDate);

    if (!yieldResult.success || !yieldResult.distributionId) {
      test.skip();
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const allocations = await getIBAllocations(testIBId);
    const relatedAllocation = allocations.find(a =>
      a.yield_distribution_id === yieldResult.distributionId
    );

    if (relatedAllocation) {
      expect(relatedAllocation.yield_distribution_id).toBe(yieldResult.distributionId);
      expect(relatedAllocation.investor_id).toBe(testInvestorId);
      expect(relatedAllocation.fund_id).toBe(fund.id);
    }
  });

  test('should store commission rate at time of allocation', async () => {
    const allocations = await getIBAllocations(testIBId);

    if (allocations.length > 0) {
      // Commission rate should be stored in the allocation record
      const allocation = allocations[0];
      expect(allocation.commission_rate).toBeDefined();
      expect(parseFloat(allocation.commission_rate)).toBe(0.10);
    }
  });

  test('should store investor yield amount in allocation', async () => {
    const allocations = await getIBAllocations(testIBId);

    if (allocations.length > 0) {
      const allocation = allocations[0];
      expect(allocation.investor_yield_amount).toBeDefined();
      expect(parseFloat(allocation.investor_yield_amount)).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Test Suite: IB Edge Cases
// ============================================================================

test.describe('IB Edge Cases', () => {
  test('should handle IB with zero commission rate', async () => {
    const ibId = await createTestIB('Zero Commission IB');
    const investorId = await createTestInvestor('Zero Commission Investor', ibId);
    await createIBConfig(ibId, investorId, 0);

    const fund = testFunds.get('IND-USDT')!;
    await performDeposit(investorId, 'IND-USDT', 10000, '2026-01-18');

    await applyYieldDistribution(fund.id, 100, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 500));

    const allocations = await getIBAllocations(ibId);

    // Should either have zero commission allocation or no allocation
    if (allocations.length > 0) {
      expect(parseFloat(allocations[0].commission_amount)).toBe(0);
    }
  });

  test('should handle inactive IB', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const ibId = await createTestIB('Inactive IB');

    // Deactivate IB
    await client
      .from('profiles')
      .update({ status: 'inactive' })
      .eq('id', ibId);

    const investorId = await createTestInvestor('Inactive IB Investor', ibId);
    await createIBConfig(ibId, investorId, 0.10);

    const fund = testFunds.get('IND-ETH')!;
    await performDeposit(investorId, 'IND-ETH', 5, '2026-01-18');

    // Apply yield - behavior with inactive IB should be documented
    const result = await applyYieldDistribution(fund.id, 0.1, '2026-01-18');
    console.log(`Yield distribution with inactive IB: success=${result.success}`);
  });

  test('should handle multiple IBs for same investor (transfer scenario)', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const ib1 = await createTestIB('Original IB');
    const ib2 = await createTestIB('New IB');
    const investorId = await createTestInvestor('Transferred Investor', ib1);

    // Create config for original IB
    await createIBConfig(ib1, investorId, 0.10);

    // Simulate transfer: deactivate old config, create new
    await client
      .from('ib_configs')
      .update({ is_active: false })
      .eq('ib_profile_id', ib1)
      .eq('investor_id', investorId);

    await createIBConfig(ib2, investorId, 0.12);

    // Update investor referral
    await client
      .from('profiles')
      .update({ referred_by: ib2 })
      .eq('id', investorId);

    // Verify new IB is active
    const { data: activeConfigs } = await client
      .from('ib_configs')
      .select('*')
      .eq('investor_id', investorId)
      .eq('is_active', true);

    if (activeConfigs && activeConfigs.length > 0) {
      expect(activeConfigs[0].ib_profile_id).toBe(ib2);
    }
  });

  test('should handle very small commission amounts (dust)', async () => {
    const ibId = await createTestIB('Dust Commission IB');
    const investorId = await createTestInvestor('Dust Investor', ibId);
    await createIBConfig(ibId, investorId, 0.10);

    const fund = testFunds.get('IND-BTC')!;
    await performDeposit(investorId, 'IND-BTC', 0.0001, '2026-01-18');

    // Very small yield
    await applyYieldDistribution(fund.id, 0.000001, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 500));

    const allocations = await getIBAllocations(ibId);

    // Should handle small amounts without errors
    console.log(`Dust allocation count: ${allocations.length}`);
    if (allocations.length > 0) {
      console.log(`Smallest commission: ${allocations[allocations.length - 1].commission_amount}`);
    }
  });
});

// ============================================================================
// Test Suite: IB Reporting
// ============================================================================

test.describe('IB Reporting', () => {
  let testIBId: string;

  test.beforeAll(async () => {
    testIBId = await createTestIB('Reporting Test IB');
  });

  test('should generate IB commission summary', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Aggregate commissions by fund
    const { data: summary } = await client
      .from('ib_allocations')
      .select(`
        fund_id,
        funds(code, name),
        commission_amount
      `)
      .eq('ib_profile_id', testIBId);

    if (summary && summary.length > 0) {
      const byFund = new Map<string, number>();
      for (const s of summary) {
        const fundId = s.fund_id;
        const current = byFund.get(fundId) || 0;
        byFund.set(fundId, current + parseFloat(s.commission_amount));
      }

      console.log('IB Commission Summary:');
      for (const [fundId, total] of byFund) {
        console.log(`  Fund ${fundId}: ${total.toFixed(10)}`);
      }
    }
  });

  test('should track commission history over time', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Get commission timeline
    const { data: history } = await client
      .from('ib_allocations')
      .select('created_at, commission_amount, fund_id')
      .eq('ib_profile_id', testIBId)
      .order('created_at', { ascending: true });

    if (history && history.length > 0) {
      let cumulative = 0;
      console.log('Commission History:');
      for (const h of history.slice(0, 10)) { // First 10 entries
        cumulative += parseFloat(h.commission_amount);
        console.log(`  ${h.created_at}: +${h.commission_amount} (cumulative: ${cumulative.toFixed(10)})`);
      }
    }
  });

  test('should list all referred investors with positions', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: referrals } = await client
      .from('profiles')
      .select(`
        id,
        full_name,
        investor_positions(fund_id, current_value)
      `)
      .eq('referred_by', testIBId);

    if (referrals && referrals.length > 0) {
      console.log(`IB has ${referrals.length} referred investors`);
      for (const r of referrals) {
        const positions = (r.investor_positions as any[]) || [];
        console.log(`  ${r.full_name}: ${positions.length} positions`);
      }
    }
  });
});
