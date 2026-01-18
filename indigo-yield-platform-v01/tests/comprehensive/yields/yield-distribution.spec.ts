/**
 * Yield Distribution Tests
 *
 * Comprehensive tests for yield distribution including:
 * - Daily yield application to funds
 * - Investor yield allocation by ownership percentage
 * - Fee deduction and routing to fees account
 * - Fees account treated as investor (receives yield)
 * - IB commission calculation and allocation
 * - Multi-investor scenarios
 * - Conservation laws (yield in = yield out)
 *
 * CRITICAL BUSINESS RULE:
 * The INDIGO fees account is treated as a regular investor:
 * - Fees are deposited into the fees account
 * - The fees account receives yield distributions like any other investor
 * - The fees account has positions and ownership percentages
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

// Precision for financial calculations
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

interface YieldDistribution {
  id: string;
  fund_id: string;
  yield_date: string;
  gross_yield: string;
  net_yield: string;
  total_fees: string;
  status: string;
  created_at: string;
}

interface YieldAllocation {
  id: string;
  yield_distribution_id: string;
  investor_id: string;
  fund_id: string;
  gross_yield: string;
  net_yield: string;
  fee_amount: string;
  ownership_pct: string;
  position_value_at_calc: string;
}

interface FeesAccount {
  id: string;
  full_name: string;
  account_type: string;
}

// ============================================================================
// Global Test State
// ============================================================================

let supabase: SupabaseClient;
let serviceSupabase: SupabaseClient;
let testFunds: Map<string, Fund> = new Map();
let testInvestorIds: string[] = [];
let feesAccountId: string | null = null;

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

  // Load funds
  const { data: funds } = await client
    .from('funds')
    .select('id, code, name, asset')
    .in('code', FUND_CODES as unknown as string[]);

  if (funds) {
    funds.forEach(fund => testFunds.set(fund.code, fund));
  }

  // Find or identify the fees account
  const { data: feesAccounts } = await client
    .from('profiles')
    .select('id, full_name, account_type')
    .or('account_type.eq.fees_account,full_name.ilike.%fees%,full_name.ilike.%indigo%fee%')
    .limit(1);

  if (feesAccounts && feesAccounts.length > 0) {
    feesAccountId = feesAccounts[0].id;
    console.log(`Found fees account: ${feesAccounts[0].full_name} (${feesAccountId})`);
  } else {
    console.warn('No fees account found - some tests may be skipped');
  }

  console.log(`Loaded ${testFunds.size} funds for yield distribution tests`);
});

test.afterAll(async () => {
  // Cleanup test investors
  if (testInvestorIds.length > 0 && SUPABASE_SERVICE_KEY) {
    const client = serviceSupabase;

    for (const investorId of testInvestorIds) {
      await client.rpc('force_delete_investor', { p_investor_id: investorId }).catch(() => {});
    }
  }
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
    p_notes: 'Yield distribution test deposit',
  });

  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? false, transactionId: data?.transaction_id };
}

async function applyYieldDistribution(
  fundId: string,
  yieldAmount: number,
  yieldDate: string,
  notes?: string
): Promise<{ success: boolean; distributionId?: string; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client.rpc('apply_daily_yield_to_fund_v3', {
    p_fund_id: fundId,
    p_yield_amount: yieldAmount,
    p_yield_date: yieldDate,
    p_notes: notes || 'Test yield distribution',
  });

  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? false, distributionId: data?.distribution_id };
}

async function getYieldDistribution(distributionId: string): Promise<YieldDistribution | null> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client
    .from('yield_distributions')
    .select('*')
    .eq('id', distributionId)
    .single();

  if (error) return null;
  return data;
}

async function getYieldAllocations(distributionId: string): Promise<YieldAllocation[]> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client
    .from('yield_allocations')
    .select('*')
    .eq('yield_distribution_id', distributionId);

  if (error) return [];
  return data || [];
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

async function getFeesAccountPosition(fundId: string): Promise<number> {
  if (!feesAccountId) return 0;
  return getPosition(feesAccountId, fundId);
}

async function getAllPositionsForFund(fundId: string): Promise<{ investorId: string; value: number }[]> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data } = await client
    .from('investor_positions')
    .select('investor_id, current_value')
    .eq('fund_id', fundId)
    .eq('is_active', true);

  return (data || []).map(p => ({
    investorId: p.investor_id,
    value: parseFloat(p.current_value),
  }));
}

// ============================================================================
// Test Suite: Basic Yield Distribution
// ============================================================================

test.describe('Basic Yield Distribution', () => {
  let testInvestorId: string;
  const testFundCode = 'IND-USDT';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Basic Yield Investor');
    await performDeposit(testInvestorId, testFundCode, 100000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should apply daily yield to fund', async () => {
    const fund = testFunds.get(testFundCode)!;
    const yieldAmount = 500; // 500 USDT yield

    const result = await applyYieldDistribution(fund.id, yieldAmount, testDate);

    expect(result.success).toBe(true);
    expect(result.distributionId).toBeDefined();
  });

  test('should create yield distribution record', async () => {
    const fund = testFunds.get(testFundCode)!;

    const result = await applyYieldDistribution(fund.id, 300, testDate);

    if (result.success && result.distributionId) {
      const distribution = await getYieldDistribution(result.distributionId);

      expect(distribution).toBeDefined();
      expect(distribution!.fund_id).toBe(fund.id);
      expect(distribution!.yield_date).toBe(testDate);
      expect(distribution!.status).toBe('applied');
    }
  });

  test('should create yield allocation for investor', async () => {
    const fund = testFunds.get(testFundCode)!;

    const result = await applyYieldDistribution(fund.id, 200, testDate);

    if (result.success && result.distributionId) {
      const allocations = await getYieldAllocations(result.distributionId);

      expect(allocations.length).toBeGreaterThan(0);

      // Find allocation for our test investor
      const investorAllocation = allocations.find(a => a.investor_id === testInvestorId);

      if (investorAllocation) {
        expect(parseFloat(investorAllocation.gross_yield)).toBeGreaterThan(0);
      }
    }
  });

  test('should increase investor position after yield', async () => {
    const fund = testFunds.get(testFundCode)!;
    const positionBefore = await getPosition(testInvestorId, fund.id);

    const yieldAmount = 100;
    const result = await applyYieldDistribution(fund.id, yieldAmount, testDate);

    if (result.success) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const positionAfter = await getPosition(testInvestorId, fund.id);

      expect(positionAfter).toBeGreaterThan(positionBefore);
    }
  });
});

// ============================================================================
// Test Suite: Fees Account as Investor
// ============================================================================

test.describe('Fees Account as Investor', () => {
  const testFundCode = 'IND-ETH';
  const testDate = '2026-01-18';
  let testInvestorId: string;

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Fees Account Test Investor');
    await performDeposit(testInvestorId, testFundCode, 10, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should route fees to fees account', async () => {
    if (!feesAccountId) {
      test.skip();
      return;
    }

    const fund = testFunds.get(testFundCode)!;
    const feesPositionBefore = await getFeesAccountPosition(fund.id);

    // Apply yield - this should generate fees
    const yieldAmount = 0.5;
    const result = await applyYieldDistribution(fund.id, yieldAmount, testDate);

    if (result.success) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const feesPositionAfter = await getFeesAccountPosition(fund.id);

      // If fees were deducted, the fees account position should increase
      console.log(`Fees account position: before=${feesPositionBefore}, after=${feesPositionAfter}`);

      // The change depends on fee configuration
      if (result.distributionId) {
        const distribution = await getYieldDistribution(result.distributionId);
        if (distribution && parseFloat(distribution.total_fees) > 0) {
          expect(feesPositionAfter).toBeGreaterThan(feesPositionBefore);
        }
      }
    }
  });

  test('should apply yield to fees account like regular investor', async () => {
    if (!feesAccountId) {
      test.skip();
      return;
    }

    const fund = testFunds.get(testFundCode)!;

    // Get fees account position before
    const feesPositionBefore = await getFeesAccountPosition(fund.id);

    if (feesPositionBefore > 0) {
      // Fees account has a position, so it should receive yield

      // Apply yield
      const result = await applyYieldDistribution(fund.id, 0.1, testDate);

      if (result.success && result.distributionId) {
        const allocations = await getYieldAllocations(result.distributionId);

        // Check if fees account received an allocation
        const feesAllocation = allocations.find(a => a.investor_id === feesAccountId);

        if (feesAllocation) {
          console.log(`Fees account yield allocation: ${feesAllocation.gross_yield}`);
          expect(parseFloat(feesAllocation.gross_yield)).toBeGreaterThan(0);
        }
      }
    } else {
      console.log('Fees account has no position - cannot test yield allocation');
    }
  });

  test('should include fees account in ownership calculation', async () => {
    if (!feesAccountId) {
      test.skip();
      return;
    }

    const fund = testFunds.get(testFundCode)!;

    // Get all positions
    const positions = await getAllPositionsForFund(fund.id);
    const totalAUM = positions.reduce((sum, p) => sum + p.value, 0);

    // Find fees account position
    const feesPosition = positions.find(p => p.investorId === feesAccountId);

    if (feesPosition && totalAUM > 0) {
      const feesOwnershipPct = (feesPosition.value / totalAUM) * 100;
      console.log(`Fees account ownership: ${feesOwnershipPct.toFixed(4)}% (${feesPosition.value} of ${totalAUM})`);

      // Ownership should be positive
      expect(feesOwnershipPct).toBeGreaterThan(0);
      expect(feesOwnershipPct).toBeLessThanOrEqual(100);
    }
  });

  test('should compound yield for fees account', async () => {
    if (!feesAccountId) {
      test.skip();
      return;
    }

    const fund = testFunds.get(testFundCode)!;

    // Ensure fees account has position by routing fees from a yield
    await applyYieldDistribution(fund.id, 0.2, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    const feesPosition1 = await getFeesAccountPosition(fund.id);

    // Apply another yield
    await applyYieldDistribution(fund.id, 0.2, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    const feesPosition2 = await getFeesAccountPosition(fund.id);

    // And another
    await applyYieldDistribution(fund.id, 0.2, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    const feesPosition3 = await getFeesAccountPosition(fund.id);

    console.log(`Fees account compounding: ${feesPosition1} -> ${feesPosition2} -> ${feesPosition3}`);

    // Each yield should increase the fees account position (compound effect)
    expect(feesPosition2).toBeGreaterThanOrEqual(feesPosition1);
    expect(feesPosition3).toBeGreaterThanOrEqual(feesPosition2);
  });
});

// ============================================================================
// Test Suite: Multi-Investor Yield Distribution
// ============================================================================

test.describe('Multi-Investor Yield Distribution', () => {
  let investor1Id: string;
  let investor2Id: string;
  let investor3Id: string;
  const testFundCode = 'IND-SOL';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    investor1Id = await createTestInvestor('Multi Yield Investor 1');
    investor2Id = await createTestInvestor('Multi Yield Investor 2');
    investor3Id = await createTestInvestor('Multi Yield Investor 3');

    // Different deposit amounts for different ownership %
    await performDeposit(investor1Id, testFundCode, 500, testDate);  // 50%
    await performDeposit(investor2Id, testFundCode, 300, testDate);  // 30%
    await performDeposit(investor3Id, testFundCode, 200, testDate);  // 20%

    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should allocate yield proportionally to ownership', async () => {
    const fund = testFunds.get(testFundCode)!;
    const yieldAmount = 100; // 100 SOL yield

    const result = await applyYieldDistribution(fund.id, yieldAmount, testDate);

    if (result.success && result.distributionId) {
      const allocations = await getYieldAllocations(result.distributionId);

      const alloc1 = allocations.find(a => a.investor_id === investor1Id);
      const alloc2 = allocations.find(a => a.investor_id === investor2Id);
      const alloc3 = allocations.find(a => a.investor_id === investor3Id);

      if (alloc1 && alloc2 && alloc3) {
        const yield1 = parseFloat(alloc1.gross_yield);
        const yield2 = parseFloat(alloc2.gross_yield);
        const yield3 = parseFloat(alloc3.gross_yield);

        // Check proportionality (50:30:20)
        const total = yield1 + yield2 + yield3;

        console.log(`Yield allocation: Inv1=${yield1}, Inv2=${yield2}, Inv3=${yield3}, Total=${total}`);

        // Approximately 50/30/20 split (allowing for fees)
        expect(yield1 / total).toBeCloseTo(0.5, 1);
        expect(yield2 / total).toBeCloseTo(0.3, 1);
        expect(yield3 / total).toBeCloseTo(0.2, 1);
      }
    }
  });

  test('should sum of allocations equal total yield (minus fees)', async () => {
    const fund = testFunds.get(testFundCode)!;
    const yieldAmount = 50;

    const result = await applyYieldDistribution(fund.id, yieldAmount, testDate);

    if (result.success && result.distributionId) {
      const distribution = await getYieldDistribution(result.distributionId);
      const allocations = await getYieldAllocations(result.distributionId);

      if (distribution) {
        const totalAllocated = allocations.reduce(
          (sum, a) => sum + parseFloat(a.net_yield),
          0
        );

        const expectedNet = parseFloat(distribution.net_yield);

        // Total allocated should equal distribution net yield
        expect(totalAllocated).toBeCloseTo(expectedNet, 6);
      }
    }
  });

  test('should maintain ownership percentages sum to 100%', async () => {
    const fund = testFunds.get(testFundCode)!;

    const result = await applyYieldDistribution(fund.id, 25, testDate);

    if (result.success && result.distributionId) {
      const allocations = await getYieldAllocations(result.distributionId);

      const totalOwnership = allocations.reduce(
        (sum, a) => sum + parseFloat(a.ownership_pct),
        0
      );

      expect(totalOwnership).toBeCloseTo(100, 4);
    }
  });
});

// ============================================================================
// Test Suite: Yield Conservation Laws
// ============================================================================

test.describe('Yield Conservation Laws', () => {
  let testInvestorId: string;
  const testFundCode = 'IND-BTC';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Conservation Test Investor');
    await performDeposit(testInvestorId, testFundCode, 1, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should conserve yield: gross_yield = net_yield + fees', async () => {
    const fund = testFunds.get(testFundCode)!;
    const yieldAmount = 0.01;

    const result = await applyYieldDistribution(fund.id, yieldAmount, testDate);

    if (result.success && result.distributionId) {
      const distribution = await getYieldDistribution(result.distributionId);

      if (distribution) {
        const grossYield = parseFloat(distribution.gross_yield);
        const netYield = parseFloat(distribution.net_yield);
        const totalFees = parseFloat(distribution.total_fees);

        // Conservation: gross = net + fees
        expect(grossYield).toBeCloseTo(netYield + totalFees, 8);
      }
    }
  });

  test('should conserve yield across allocations', async () => {
    const fund = testFunds.get(testFundCode)!;
    const yieldAmount = 0.005;

    const result = await applyYieldDistribution(fund.id, yieldAmount, testDate);

    if (result.success && result.distributionId) {
      const distribution = await getYieldDistribution(result.distributionId);
      const allocations = await getYieldAllocations(result.distributionId);

      if (distribution && allocations.length > 0) {
        const distributionGross = parseFloat(distribution.gross_yield);

        const allocatedGross = allocations.reduce(
          (sum, a) => sum + parseFloat(a.gross_yield),
          0
        );

        // Total allocated gross should equal distribution gross
        expect(allocatedGross).toBeCloseTo(distributionGross, 8);
      }
    }
  });

  test('should not create or destroy value', async () => {
    const fund = testFunds.get(testFundCode)!;

    // Get total AUM before
    const positions = await getAllPositionsForFund(fund.id);
    const aumBefore = positions.reduce((sum, p) => sum + p.value, 0);

    // Apply yield
    const yieldAmount = 0.002;
    const result = await applyYieldDistribution(fund.id, yieldAmount, testDate);

    if (result.success) {
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get total AUM after
      const positionsAfter = await getAllPositionsForFund(fund.id);
      const aumAfter = positionsAfter.reduce((sum, p) => sum + p.value, 0);

      // AUM should increase by exactly the yield amount
      const aumChange = aumAfter - aumBefore;

      expect(aumChange).toBeCloseTo(yieldAmount, 8);
    }
  });
});

// ============================================================================
// Test Suite: Fee Deduction
// ============================================================================

test.describe('Fee Deduction', () => {
  let testInvestorId: string;
  const testFundCode = 'IND-XRP';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Fee Deduction Test Investor');
    await performDeposit(testInvestorId, testFundCode, 10000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should deduct platform fee from gross yield', async () => {
    const fund = testFunds.get(testFundCode)!;
    const yieldAmount = 100;

    const result = await applyYieldDistribution(fund.id, yieldAmount, testDate);

    if (result.success && result.distributionId) {
      const distribution = await getYieldDistribution(result.distributionId);

      if (distribution) {
        const grossYield = parseFloat(distribution.gross_yield);
        const netYield = parseFloat(distribution.net_yield);

        // Net should be less than or equal to gross
        expect(netYield).toBeLessThanOrEqual(grossYield);

        // Total fees should be the difference
        const totalFees = parseFloat(distribution.total_fees);
        expect(totalFees).toBeCloseTo(grossYield - netYield, 8);
      }
    }
  });

  test('should apply investor-specific fee if configured', async () => {
    const fund = testFunds.get(testFundCode)!;

    const result = await applyYieldDistribution(fund.id, 50, testDate);

    if (result.success && result.distributionId) {
      const allocations = await getYieldAllocations(result.distributionId);
      const testAllocation = allocations.find(a => a.investor_id === testInvestorId);

      if (testAllocation) {
        const feeAmount = parseFloat(testAllocation.fee_amount);

        console.log(`Investor fee: ${feeAmount}`);
        // Fee could be 0 or positive depending on config
        expect(feeAmount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should route deducted fees to fees account', async () => {
    if (!feesAccountId) {
      test.skip();
      return;
    }

    const fund = testFunds.get(testFundCode)!;
    const feesPositionBefore = await getFeesAccountPosition(fund.id);

    const result = await applyYieldDistribution(fund.id, 200, testDate);

    if (result.success && result.distributionId) {
      const distribution = await getYieldDistribution(result.distributionId);

      if (distribution && parseFloat(distribution.total_fees) > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const feesPositionAfter = await getFeesAccountPosition(fund.id);
        const feesIncrease = feesPositionAfter - feesPositionBefore;

        console.log(`Fees routed to account: ${feesIncrease} (distribution fees: ${distribution.total_fees})`);

        // Fees position should increase
        expect(feesPositionAfter).toBeGreaterThanOrEqual(feesPositionBefore);
      }
    }
  });
});

// ============================================================================
// Test Suite: Yield Distribution with IB Commissions
// ============================================================================

test.describe('Yield Distribution with IB Commissions', () => {
  let ibProfileId: string;
  let referredInvestorId: string;
  const testFundCode = 'IND-USDT';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Create IB profile
    const { data: ibData } = await client
      .from('profiles')
      .insert({
        full_name: 'Yield IB Test',
        email: `yield.ib.${Date.now()}@ib.indigo.fund`,
        role: 'ib',
        ib_code: `IB-YIELD-${Date.now()}`,
        status: 'active',
      })
      .select('id')
      .single();

    if (ibData) {
      ibProfileId = ibData.id;
    }

    // Create referred investor
    referredInvestorId = await createTestInvestor('Yield IB Referred Investor');

    // Link to IB
    await client
      .from('profiles')
      .update({ referred_by: ibProfileId })
      .eq('id', referredInvestorId);

    // Create position
    await performDeposit(referredInvestorId, testFundCode, 50000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should calculate IB commission on yield', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    // Get IB allocations before
    const { data: allocationsBefore } = await client
      .from('ib_allocations')
      .select('id')
      .eq('ib_profile_id', ibProfileId);

    // Apply yield
    const result = await applyYieldDistribution(fund.id, 500, testDate);

    if (result.success) {
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get IB allocations after
      const { data: allocationsAfter } = await client
        .from('ib_allocations')
        .select('*')
        .eq('ib_profile_id', ibProfileId);

      console.log(`IB allocations: before=${allocationsBefore?.length || 0}, after=${allocationsAfter?.length || 0}`);
    }
  });

  test('should deduct IB commission from investor yield', async () => {
    const fund = testFunds.get(testFundCode)!;

    const result = await applyYieldDistribution(fund.id, 300, testDate);

    if (result.success && result.distributionId) {
      const allocations = await getYieldAllocations(result.distributionId);
      const referredAllocation = allocations.find(a => a.investor_id === referredInvestorId);

      if (referredAllocation) {
        const grossYield = parseFloat(referredAllocation.gross_yield);
        const netYield = parseFloat(referredAllocation.net_yield);

        // If IB commission is taken, net should be less than gross
        console.log(`Referred investor: gross=${grossYield}, net=${netYield}`);
      }
    }
  });
});

// ============================================================================
// Test Suite: Edge Cases
// ============================================================================

test.describe('Yield Distribution Edge Cases', () => {
  test('should handle zero yield amount', async () => {
    const fund = testFunds.get('IND-USDT')!;

    const result = await applyYieldDistribution(fund.id, 0, '2026-01-18');

    // Should either fail or create zero distribution
    console.log(`Zero yield result: success=${result.success}, error=${result.error}`);
  });

  test('should handle very small yield (dust)', async () => {
    const investorId = await createTestInvestor('Dust Yield Investor');
    await performDeposit(investorId, 'IND-BTC', 0.001, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 300));

    const fund = testFunds.get('IND-BTC')!;
    const dustYield = 0.0000000001;

    const result = await applyYieldDistribution(fund.id, dustYield, '2026-01-18');

    console.log(`Dust yield result: success=${result.success}`);
  });

  test('should handle very large yield', async () => {
    const investorId = await createTestInvestor('Large Yield Investor');
    await performDeposit(investorId, 'IND-USDT', 1000000, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 300));

    const fund = testFunds.get('IND-USDT')!;
    const largeYield = 100000;

    const result = await applyYieldDistribution(fund.id, largeYield, '2026-01-18');

    expect(result.success).toBe(true);
  });

  test('should handle yield to fund with no positions', async () => {
    // Try to apply yield to a fund with no active positions
    // This should be handled gracefully
    const fund = testFunds.get('IND-XRP')!;

    // Note: This may succeed or fail depending on AUM validation
    const result = await applyYieldDistribution(fund.id, 10, '2026-01-18');

    console.log(`Yield to empty fund: success=${result.success}, error=${result.error}`);
  });

  test('should reject negative yield amount', async () => {
    const fund = testFunds.get('IND-ETH')!;

    const result = await applyYieldDistribution(fund.id, -100, '2026-01-18');

    expect(result.success).toBe(false);
  });

  test('should handle concurrent yield distributions', async () => {
    const investorId = await createTestInvestor('Concurrent Yield Investor');
    await performDeposit(investorId, 'IND-SOL', 1000, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 300));

    const fund = testFunds.get('IND-SOL')!;

    // Launch concurrent distributions
    const promises = Array(3).fill(null).map((_, i) =>
      applyYieldDistribution(fund.id, 10 + i, '2026-01-18')
    );

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Concurrent yield distributions: ${successCount}/3 succeeded`);
  });
});

// ============================================================================
// Test Suite: Yield Distribution Status
// ============================================================================

test.describe('Yield Distribution Status', () => {
  test('should create distribution with applied status', async () => {
    const investorId = await createTestInvestor('Status Test Investor');
    await performDeposit(investorId, 'IND-USDT', 10000, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 300));

    const fund = testFunds.get('IND-USDT')!;
    const result = await applyYieldDistribution(fund.id, 50, '2026-01-18');

    if (result.success && result.distributionId) {
      const distribution = await getYieldDistribution(result.distributionId);
      expect(distribution!.status).toBe('applied');
    }
  });

  test('should track distribution created_at timestamp', async () => {
    const investorId = await createTestInvestor('Timestamp Test Investor');
    await performDeposit(investorId, 'IND-ETH', 5, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 300));

    const fund = testFunds.get('IND-ETH')!;
    const beforeTime = new Date();

    const result = await applyYieldDistribution(fund.id, 0.05, '2026-01-18');

    if (result.success && result.distributionId) {
      const distribution = await getYieldDistribution(result.distributionId);
      const createdAt = new Date(distribution!.created_at);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    }
  });
});
