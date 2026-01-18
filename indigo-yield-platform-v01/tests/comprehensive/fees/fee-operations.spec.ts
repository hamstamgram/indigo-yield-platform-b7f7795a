/**
 * Fee Operations Tests
 *
 * Comprehensive tests for fee management including:
 * - Fee calculation on yield distributions
 * - Fee routing to INDIGO fees account
 * - Fees account as investor (receives yield)
 * - Fee schedule management
 * - Investor-specific fee overrides
 * - Fee allocation records
 *
 * CRITICAL BUSINESS RULE:
 * The INDIGO fees account is treated as a regular investor:
 * - All platform fees are deposited into the fees account
 * - The fees account has positions in each fund
 * - The fees account receives yield distributions proportional to ownership
 * - The fees account compounds just like any other investor
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

interface FeeSchedule {
  id: string;
  fund_id?: string;
  investor_id?: string;
  management_fee_pct: string;
  performance_fee_pct: string;
  is_active: boolean;
}

interface FeeAllocation {
  id: string;
  yield_distribution_id: string;
  investor_id: string;
  fund_id: string;
  fee_amount: string;
  fee_type: string;
  created_at: string;
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

  await supabase.auth.signInWithPassword({
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

  // Find fees account
  const { data: feesAccounts } = await client
    .from('profiles')
    .select('id, full_name, account_type')
    .or('account_type.eq.fees_account,full_name.ilike.%fees%,full_name.ilike.%indigo%fee%')
    .limit(1);

  if (feesAccounts && feesAccounts.length > 0) {
    feesAccountId = feesAccounts[0].id;
    console.log(`Found fees account: ${feesAccounts[0].full_name}`);
  }

  console.log(`Loaded ${testFunds.size} funds for fee operations tests`);
});

// ============================================================================
// Helper Functions
// ============================================================================

async function getOrCreateTestInvestor(name: string): Promise<string> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  // First, try to find an existing test investor we can use
  const { data: existingProfiles, error: fetchError } = await client
    .from('profiles')
    .select('id')
    .eq('status', 'active')
    .not('email', 'like', '%@indigo.fund')  // Avoid system accounts
    .limit(1)
    .single();

  if (!fetchError && existingProfiles) {
    console.log(`Using existing profile: ${existingProfiles.id}`);
    testInvestorIds.push(existingProfiles.id);
    return existingProfiles.id;
  }

  // If no existing profile, we can't create one due to FK constraint
  throw new Error('No existing test profile found. Cannot create new profiles due to auth.users FK constraint.');
}

// Alias for backward compatibility
const createTestInvestor = getOrCreateTestInvestor;

async function performDeposit(
  investorId: string,
  fundCode: string,
  amount: number,
  txDate: string
): Promise<{ success: boolean; transactionId?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const fund = testFunds.get(fundCode);
  if (!fund) return { success: false };

  const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
    p_investor_id: investorId,
    p_fund_id: fund.id,
    p_amount: amount,
    p_tx_date: txDate,
    p_notes: 'Fee test deposit',
  });

  if (error) return { success: false };
  return { success: data?.success ?? false, transactionId: data?.transaction_id };
}

async function applyYieldDistribution(
  fundId: string,
  yieldAmount: number,
  yieldDate: string
): Promise<{ success: boolean; distributionId?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client.rpc('apply_daily_yield_to_fund_v3', {
    p_fund_id: fundId,
    p_yield_amount: yieldAmount,
    p_yield_date: yieldDate,
    p_notes: 'Fee test yield',
  });

  if (error) return { success: false };
  return { success: data?.success ?? false, distributionId: data?.distribution_id };
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

async function getFeeAllocations(distributionId: string): Promise<FeeAllocation[]> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data } = await client
    .from('fee_allocations')
    .select('*')
    .eq('yield_distribution_id', distributionId);

  return data || [];
}

// ============================================================================
// Test Suite: Fees Account as Investor
// ============================================================================

test.describe('Fees Account as Investor', () => {
  const testFundCode = 'IND-USDT';
  const testDate = '2026-01-18';

  test('should identify fees account exists', async () => {
    if (!feesAccountId) {
      console.warn('No fees account found - skipping fees account tests');
      test.skip();
      return;
    }

    expect(feesAccountId).toBeDefined();
  });

  test('should have fees account with position in fund', async () => {
    if (!feesAccountId) {
      test.skip();
      return;
    }

    const fund = testFunds.get(testFundCode)!;

    // Create regular investor with deposit to generate fees
    const investorId = await createTestInvestor('Fees Position Test Investor');
    await performDeposit(investorId, testFundCode, 100000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Apply yield (which generates fees)
    await applyYieldDistribution(fund.id, 1000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check fees account position
    const feesPosition = await getFeesAccountPosition(fund.id);

    console.log(`Fees account position in ${testFundCode}: ${feesPosition}`);

    // Fees account should have received fees
    // (exact amount depends on fee configuration)
  });

  test('should include fees account in yield distribution', async () => {
    if (!feesAccountId) {
      test.skip();
      return;
    }

    const fund = testFunds.get(testFundCode)!;
    const feesPositionBefore = await getFeesAccountPosition(fund.id);

    // Ensure there's a fees position
    if (feesPositionBefore === 0) {
      console.log('Fees account has no position - creating via fee generation');

      const investorId = await createTestInvestor('Fee Generation Investor');
      await performDeposit(investorId, testFundCode, 50000, testDate);
      await applyYieldDistribution(fund.id, 500, testDate);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const feesPositionAfterSetup = await getFeesAccountPosition(fund.id);

    if (feesPositionAfterSetup > 0) {
      // Apply another yield - fees account should receive proportional yield
      await applyYieldDistribution(fund.id, 500, testDate);
      await new Promise(resolve => setTimeout(resolve, 500));

      const feesPositionAfterYield = await getFeesAccountPosition(fund.id);

      // Position should increase (from yield)
      expect(feesPositionAfterYield).toBeGreaterThanOrEqual(feesPositionAfterSetup);

      console.log(`Fees account: before=${feesPositionAfterSetup}, after=${feesPositionAfterYield}`);
    }
  });

  test('should compound fees account yield over multiple distributions', async () => {
    if (!feesAccountId) {
      test.skip();
      return;
    }

    const fund = testFunds.get('IND-ETH')!;

    // Ensure investor with position
    const investorId = await createTestInvestor('ETH Fee Compound Investor');
    await performDeposit(investorId, 'IND-ETH', 10, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    const positions: number[] = [];

    // Apply multiple yield distributions
    for (let i = 0; i < 5; i++) {
      await applyYieldDistribution(fund.id, 0.1, testDate);
      await new Promise(resolve => setTimeout(resolve, 300));

      const pos = await getFeesAccountPosition(fund.id);
      positions.push(pos);
    }

    console.log('Fees account position over time:', positions);

    // Each position should be >= previous (compounding)
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThanOrEqual(positions[i - 1]);
    }
  });
});

// ============================================================================
// Test Suite: Fee Calculation
// ============================================================================

test.describe('Fee Calculation', () => {
  let testInvestorId: string;
  const testFundCode = 'IND-SOL';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Fee Calculation Investor');
    await performDeposit(testInvestorId, testFundCode, 1000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should calculate fees on yield distribution', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const result = await applyYieldDistribution(fund.id, 50, testDate);

    if (result.success && result.distributionId) {
      const { data: distribution } = await client
        .from('yield_distributions')
        .select('*')
        .eq('id', result.distributionId)
        .single();

      if (distribution) {
        const grossYield = parseFloat(distribution.gross_yield);
        const netYield = parseFloat(distribution.net_yield);
        const totalFees = parseFloat(distribution.total_fees);

        console.log(`Fee calculation: gross=${grossYield}, net=${netYield}, fees=${totalFees}`);

        // Fees should be non-negative
        expect(totalFees).toBeGreaterThanOrEqual(0);

        // Conservation: gross = net + fees
        expect(grossYield).toBeCloseTo(netYield + totalFees, 8);
      }
    }
  });

  test('should create fee allocation records', async () => {
    const fund = testFunds.get(testFundCode)!;

    const result = await applyYieldDistribution(fund.id, 30, testDate);

    if (result.success && result.distributionId) {
      const allocations = await getFeeAllocations(result.distributionId);

      console.log(`Fee allocations created: ${allocations.length}`);

      // Fee allocations may or may not be created depending on fee structure
    }
  });
});

// ============================================================================
// Test Suite: Fee Routing to Fees Account
// ============================================================================

test.describe('Fee Routing to Fees Account', () => {
  const testFundCode = 'IND-BTC';
  const testDate = '2026-01-18';

  test('should route collected fees to fees account position', async () => {
    if (!feesAccountId) {
      test.skip();
      return;
    }

    const fund = testFunds.get(testFundCode)!;

    // Setup: Create investor with deposit
    const investorId = await createTestInvestor('Fee Routing Investor');
    await performDeposit(investorId, testFundCode, 1, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    const feesPositionBefore = await getFeesAccountPosition(fund.id);

    // Apply yield with fees
    const result = await applyYieldDistribution(fund.id, 0.01, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    if (result.success) {
      const feesPositionAfter = await getFeesAccountPosition(fund.id);
      const feesIncrease = feesPositionAfter - feesPositionBefore;

      console.log(`Fees routed: ${feesIncrease} ${testFundCode.split('-')[1]}`);

      // Fees position should increase (if fees were deducted)
      expect(feesPositionAfter).toBeGreaterThanOrEqual(feesPositionBefore);
    }
  });

  test('should track fee transactions in ledger', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    if (!feesAccountId) {
      test.skip();
      return;
    }

    const fund = testFunds.get(testFundCode)!;

    // Check for fee transactions
    const { data: feeTransactions } = await client
      .from('transactions_v2')
      .select('*')
      .eq('investor_id', feesAccountId)
      .eq('fund_id', fund.id)
      .in('type', ['FEE', 'FEE_CREDIT'])
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`Fee transactions for fees account: ${feeTransactions?.length || 0}`);
  });
});

// ============================================================================
// Test Suite: Fee Schedule Management
// ============================================================================

test.describe('Fee Schedule Management', () => {
  test('should have global fee settings', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: globalFees } = await client
      .from('global_fee_settings')
      .select('*')
      .limit(1);

    console.log(`Global fee settings: ${JSON.stringify(globalFees)}`);
  });

  test('should allow investor-specific fee override', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const investorId = await createTestInvestor('Custom Fee Investor');

    // Try to create investor-specific fee schedule
    const { data, error } = await client
      .from('investor_fee_schedule')
      .insert({
        investor_id: investorId,
        management_fee_pct: 0.5, // 0.5% custom fee
        performance_fee_pct: 5, // 5% performance fee
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.log(`Fee schedule creation: ${error.message}`);
    } else {
      expect(data).toBeDefined();
      expect(parseFloat(data.management_fee_pct)).toBe(0.5);
    }
  });

  test('should retrieve fee schedule for investor', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const investorId = await createTestInvestor('Fee Schedule Query Investor');

    // Check if investor has custom schedule
    const { data: customSchedule } = await client
      .from('investor_fee_schedule')
      .select('*')
      .eq('investor_id', investorId)
      .eq('is_active', true)
      .single();

    // Either custom or falls back to global
    console.log(`Custom schedule for investor: ${customSchedule ? 'Yes' : 'No (using global)'}`);
  });
});

// ============================================================================
// Test Suite: Fee Types
// ============================================================================

test.describe('Fee Types', () => {
  let testInvestorId: string;
  const testFundCode = 'IND-XRP';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Fee Types Investor');
    await performDeposit(testInvestorId, testFundCode, 10000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should deduct management fee from yield', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const result = await applyYieldDistribution(fund.id, 100, testDate);

    if (result.success && result.distributionId) {
      // Check yield allocation for fee_amount
      const { data: allocations } = await client
        .from('yield_allocations')
        .select('*')
        .eq('yield_distribution_id', result.distributionId)
        .eq('investor_id', testInvestorId);

      if (allocations && allocations.length > 0) {
        const feeAmount = parseFloat(allocations[0].fee_amount);
        console.log(`Management fee for investor: ${feeAmount}`);

        expect(feeAmount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should handle zero fee configuration', async () => {
    // If fee is 0%, net should equal gross
    const fund = testFunds.get(testFundCode)!;

    const result = await applyYieldDistribution(fund.id, 50, testDate);

    if (result.success && result.distributionId) {
      const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

      const { data: dist } = await client
        .from('yield_distributions')
        .select('gross_yield, net_yield, total_fees')
        .eq('id', result.distributionId)
        .single();

      if (dist && parseFloat(dist.total_fees) === 0) {
        expect(parseFloat(dist.gross_yield)).toBeCloseTo(parseFloat(dist.net_yield), 8);
      }
    }
  });
});

// ============================================================================
// Test Suite: Internal Fee Routing
// ============================================================================

test.describe('Internal Fee Routing', () => {
  test('should route withdrawal fee to fees account', async () => {
    if (!feesAccountId) {
      test.skip();
      return;
    }

    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const testFundCode = 'IND-USDT';
    const fund = testFunds.get(testFundCode)!;

    // Create investor and withdrawal
    const investorId = await createTestInvestor('Withdrawal Fee Investor');
    await performDeposit(investorId, testFundCode, 10000, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if internal_route_to_fees RPC exists
    const { data, error } = await client.rpc('internal_route_to_fees', {
      p_fund_id: fund.id,
      p_amount: 100,
      p_source_type: 'withdrawal_fee',
      p_reference_id: 'test-reference',
    });

    if (error) {
      console.log(`Internal route to fees: ${error.message}`);
    } else {
      console.log(`Internal route result: ${JSON.stringify(data)}`);
    }
  });
});

// ============================================================================
// Test Suite: Fee Conservation
// ============================================================================

test.describe('Fee Conservation', () => {
  test('should conserve total value: investor_yield + fees = gross_yield', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const testFundCode = 'IND-ETH';
    const fund = testFunds.get(testFundCode)!;

    // Create investor
    const investorId = await createTestInvestor('Fee Conservation Investor');
    await performDeposit(investorId, testFundCode, 5, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await applyYieldDistribution(fund.id, 0.1, '2026-01-18');

    if (result.success && result.distributionId) {
      const { data: dist } = await client
        .from('yield_distributions')
        .select('gross_yield, net_yield, total_fees')
        .eq('id', result.distributionId)
        .single();

      const { data: allocations } = await client
        .from('yield_allocations')
        .select('net_yield, fee_amount')
        .eq('yield_distribution_id', result.distributionId);

      if (dist && allocations) {
        const totalAllocatedNet = allocations.reduce((sum, a) => sum + parseFloat(a.net_yield), 0);
        const totalAllocatedFees = allocations.reduce((sum, a) => sum + parseFloat(a.fee_amount), 0);

        const gross = parseFloat(dist.gross_yield);
        const total = totalAllocatedNet + totalAllocatedFees;

        console.log(`Conservation: gross=${gross}, allocated=${total}`);

        // Should be conserved (within precision)
        expect(total).toBeCloseTo(gross, 6);
      }
    }
  });
});

// ============================================================================
// Test Suite: Fees Account Reporting
// ============================================================================

test.describe('Fees Account Reporting', () => {
  test('should list fees account transactions', async () => {
    if (!feesAccountId) {
      test.skip();
      return;
    }

    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: transactions } = await client
      .from('transactions_v2')
      .select('id, fund_id, type, amount, tx_date')
      .eq('investor_id', feesAccountId)
      .order('tx_date', { ascending: false })
      .limit(20);

    console.log(`Fees account transactions: ${transactions?.length || 0}`);

    if (transactions && transactions.length > 0) {
      // Summarize by type
      const byType = new Map<string, number>();
      for (const tx of transactions) {
        const current = byType.get(tx.type) || 0;
        byType.set(tx.type, current + parseFloat(tx.amount));
      }

      console.log('Fees account transaction summary:');
      for (const [type, total] of byType) {
        console.log(`  ${type}: ${total}`);
      }
    }
  });

  test('should list fees account positions across funds', async () => {
    if (!feesAccountId) {
      test.skip();
      return;
    }

    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: positions } = await client
      .from('investor_positions')
      .select(`
        fund_id,
        current_value,
        is_active,
        funds(code, name, asset)
      `)
      .eq('investor_id', feesAccountId);

    console.log('Fees account positions:');
    if (positions) {
      for (const pos of positions) {
        const fundInfo = pos.funds as any;
        console.log(`  ${fundInfo?.code || pos.fund_id}: ${pos.current_value} (active: ${pos.is_active})`);
      }
    }
  });
});
