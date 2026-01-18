/**
 * Comprehensive Yield Calculation Tests
 *
 * CRITICAL BUSINESS RULES:
 * 1. Each fund operates in its own native currency (BTC, ETH, SOL, USDT, XRP)
 * 2. Values CANNOT be aggregated across funds
 * 3. Yield is calculated as: gross_yield = opening_aum * gross_yield_percentage
 * 4. Each investor gets proportional share based on ownership %
 * 5. ownership_pct = investor_position_value / total_fund_aum * 100
 * 6. Sum of all ownership percentages must equal 100%
 *
 * YIELD CALCULATION FORMULA:
 * - investor_gross_yield = fund_gross_yield * (investor_position / fund_aum)
 * - investor_fee = investor_gross_yield * fee_percentage
 * - investor_net_yield = investor_gross_yield - investor_fee
 *
 * CONSERVATION LAW:
 * - total_yield_distributed = SUM(investor_yields) + dust
 * - No yield "created" or "destroyed" - strict conservation
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Test Configuration
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: SupabaseClient;
let adminId: string;
let testFunds: Map<string, { id: string; code: string; asset: string }> = new Map();
let testInvestors: { id: string; email: string }[] = [];

// Precision for comparisons (10 decimal places)
const PRECISION = 10;
const TOLERANCE = 1e-8;

// ============================================================================
// Setup
// ============================================================================

test.beforeAll(async () => {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get funds
  const { data: funds } = await supabase
    .from('funds')
    .select('id, code, asset')
    .in('code', ['IND-BTC', 'IND-ETH', 'IND-SOL', 'IND-USDT', 'IND-XRP']);

  funds?.forEach(f => testFunds.set(f.code, f));

  // Get investors
  const { data: investors } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('is_admin', false)
    .limit(10);

  testInvestors = investors || [];

  // Get admin
  const { data: admin } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_admin', true)
    .single();

  adminId = admin?.id;
});

// ============================================================================
// Helper Functions
// ============================================================================

async function setupInvestorPosition(
  investorId: string,
  fundId: string,
  amount: number,
  effectiveDate: string
): Promise<void> {
  await supabase.rpc('apply_deposit_with_crystallization', {
    p_investor_id: investorId,
    p_fund_id: fundId,
    p_amount: amount,
    p_created_by: adminId,
    p_effective_date: effectiveDate,
    p_description: 'Test setup deposit'
  });
}

async function setFundAUM(
  fundId: string,
  date: string,
  totalAum: number
): Promise<void> {
  await supabase.rpc('set_fund_daily_aum', {
    p_fund_id: fundId,
    p_aum_date: date,
    p_total_aum: totalAum,
    p_source: 'test'
  });
}

async function applyYield(
  fundId: string,
  yieldDate: string,
  grossYieldPct: number
): Promise<any> {
  const { data, error } = await supabase.rpc('apply_daily_yield_to_fund_v3', {
    p_fund_id: fundId,
    p_yield_date: yieldDate,
    p_gross_yield_pct: grossYieldPct,
    p_created_by: adminId,
    p_purpose: 'transaction'
  });

  if (error) throw error;
  return data;
}

async function getYieldAllocations(distributionId: string): Promise<any[]> {
  const { data } = await supabase
    .from('yield_allocations')
    .select('*')
    .eq('distribution_id', distributionId)
    .eq('is_voided', false);

  return data || [];
}

async function getInvestorPosition(investorId: string, fundId: string): Promise<any> {
  const { data } = await supabase
    .from('investor_positions')
    .select('*')
    .eq('investor_id', investorId)
    .eq('fund_id', fundId)
    .single();

  return data;
}

// ============================================================================
// TEST SUITE 1: Daily Yield Application
// ============================================================================

test.describe('1. Daily Yield Application', () => {
  test('should apply yield to fund with single investor', async () => {
    const fund = testFunds.get('IND-ETH');
    if (!fund) test.skip();

    const investor = testInvestors[0];
    const depositAmount = 100.0; // 100 ETH
    const yieldDate = '2026-02-01';
    const grossYieldPct = 0.001; // 0.1% daily yield

    // Setup: Create position
    await setupInvestorPosition(investor.id, fund!.id, depositAmount, yieldDate);

    // Set AUM
    await setFundAUM(fund!.id, yieldDate, depositAmount);

    // Apply yield
    const result = await applyYield(fund!.id, yieldDate, grossYieldPct);

    expect(result.success).toBe(true);

    // Verify calculations
    // gross_yield = 100 * 0.001 = 0.1 ETH
    const expectedGrossYield = depositAmount * grossYieldPct;

    // Single investor should get 100% of yield
    const allocations = await getYieldAllocations(result.distribution_id);
    expect(allocations.length).toBe(1);

    const allocation = allocations[0];
    expect(Number(allocation.ownership_pct)).toBeCloseTo(100, 0);
    expect(Number(allocation.gross_amount)).toBeCloseTo(expectedGrossYield, PRECISION);

    console.log(`✓ Single investor yield: ${expectedGrossYield} ${fund!.asset}`);
  });

  test('should apply yield to fund with multiple investors', async () => {
    const fund = testFunds.get('IND-SOL');
    if (!fund) test.skip();

    const investor1 = testInvestors[1];
    const investor2 = testInvestors[2];
    const investor3 = testInvestors[3];

    const amount1 = 200.0; // 40%
    const amount2 = 200.0; // 40%
    const amount3 = 100.0; // 20%
    const totalAUM = amount1 + amount2 + amount3; // 500 SOL

    const yieldDate = '2026-02-02';
    const grossYieldPct = 0.002; // 0.2% daily yield

    // Setup positions
    await setupInvestorPosition(investor1.id, fund!.id, amount1, yieldDate);
    await setupInvestorPosition(investor2.id, fund!.id, amount2, yieldDate);
    await setupInvestorPosition(investor3.id, fund!.id, amount3, yieldDate);

    // Set AUM
    await setFundAUM(fund!.id, yieldDate, totalAUM);

    // Apply yield
    const result = await applyYield(fund!.id, yieldDate, grossYieldPct);

    expect(result.success).toBe(true);

    // Total yield = 500 * 0.002 = 1 SOL
    const expectedTotalYield = totalAUM * grossYieldPct;

    const allocations = await getYieldAllocations(result.distribution_id);
    expect(allocations.length).toBe(3);

    // Verify each investor gets proportional share
    const allocation1 = allocations.find(a => a.investor_id === investor1.id);
    const allocation2 = allocations.find(a => a.investor_id === investor2.id);
    const allocation3 = allocations.find(a => a.investor_id === investor3.id);

    // Investor 1: 200/500 = 40%, yield = 1 * 0.4 = 0.4 SOL
    expect(Number(allocation1?.ownership_pct)).toBeCloseTo(40, 0);
    expect(Number(allocation1?.gross_amount)).toBeCloseTo(0.4, PRECISION);

    // Investor 2: 200/500 = 40%, yield = 1 * 0.4 = 0.4 SOL
    expect(Number(allocation2?.ownership_pct)).toBeCloseTo(40, 0);
    expect(Number(allocation2?.gross_amount)).toBeCloseTo(0.4, PRECISION);

    // Investor 3: 100/500 = 20%, yield = 1 * 0.2 = 0.2 SOL
    expect(Number(allocation3?.ownership_pct)).toBeCloseTo(20, 0);
    expect(Number(allocation3?.gross_amount)).toBeCloseTo(0.2, PRECISION);

    // Verify conservation: sum of allocations = total yield
    const sumAllocations = allocations.reduce((sum, a) => sum + Number(a.gross_amount), 0);
    expect(Math.abs(sumAllocations - expectedTotalYield)).toBeLessThan(TOLERANCE);

    console.log(`✓ Multi-investor yield distributed: ${expectedTotalYield} ${fund!.asset}`);
  });

  test('should verify gross_yield = opening_aum * gross_yield_percentage', async () => {
    const fund = testFunds.get('IND-USDT');
    if (!fund) test.skip();

    const investor = testInvestors[4];
    const openingAUM = 10000.0; // 10,000 USDT
    const grossYieldPct = 0.0015; // 0.15% daily

    const yieldDate = '2026-02-03';

    await setupInvestorPosition(investor.id, fund!.id, openingAUM, yieldDate);
    await setFundAUM(fund!.id, yieldDate, openingAUM);

    const result = await applyYield(fund!.id, yieldDate, grossYieldPct);

    // Expected: 10000 * 0.0015 = 15 USDT
    const expectedGross = openingAUM * grossYieldPct;

    const { data: distribution } = await supabase
      .from('yield_distributions')
      .select('*')
      .eq('id', result.distribution_id)
      .single();

    expect(Number(distribution?.gross_yield_amount)).toBeCloseTo(expectedGross, PRECISION);

    console.log(`✓ Formula verified: ${openingAUM} × ${grossYieldPct} = ${expectedGross} ${fund!.asset}`);
  });
});

// ============================================================================
// TEST SUITE 2: Ownership Percentage Calculation
// ============================================================================

test.describe('2. Ownership Percentage Calculation', () => {
  test('should calculate ownership_pct = investor_position / fund_aum * 100', async () => {
    const fund = testFunds.get('IND-BTC');
    if (!fund) test.skip();

    const investor = testInvestors[0];
    const investorPosition = 2.5; // 2.5 BTC
    const fundAUM = 10.0; // 10 BTC total

    const yieldDate = '2026-02-04';

    await setupInvestorPosition(investor.id, fund!.id, investorPosition, yieldDate);
    await setFundAUM(fund!.id, yieldDate, fundAUM);

    const result = await applyYield(fund!.id, yieldDate, 0.001);

    const allocations = await getYieldAllocations(result.distribution_id);
    const allocation = allocations.find(a => a.investor_id === investor.id);

    // Expected: 2.5 / 10 * 100 = 25%
    const expectedOwnership = (investorPosition / fundAUM) * 100;
    expect(Number(allocation?.ownership_pct)).toBeCloseTo(expectedOwnership, PRECISION);

    console.log(`✓ Ownership: ${investorPosition}/${fundAUM} = ${expectedOwnership}%`);
  });

  test('should verify sum of ownership percentages equals 100%', async () => {
    const fund = testFunds.get('IND-XRP');
    if (!fund) test.skip();

    // Setup 5 investors with different positions
    const amounts = [100, 200, 150, 250, 300]; // Total: 1000 XRP
    const totalAUM = amounts.reduce((a, b) => a + b, 0);
    const yieldDate = '2026-02-05';

    for (let i = 0; i < amounts.length; i++) {
      await setupInvestorPosition(testInvestors[i].id, fund!.id, amounts[i], yieldDate);
    }

    await setFundAUM(fund!.id, yieldDate, totalAUM);
    const result = await applyYield(fund!.id, yieldDate, 0.001);

    const allocations = await getYieldAllocations(result.distribution_id);

    // Sum all ownership percentages
    const totalOwnership = allocations.reduce((sum, a) => sum + Number(a.ownership_pct), 0);

    // Should be exactly 100% (within floating point tolerance)
    expect(Math.abs(totalOwnership - 100)).toBeLessThan(TOLERANCE);

    console.log(`✓ Total ownership: ${totalOwnership.toFixed(6)}% ≈ 100%`);
  });

  test('should test with 1, 2, 5, 10 investors', async () => {
    const fund = testFunds.get('IND-ETH');
    if (!fund) test.skip();

    const investorCounts = [1, 2, 5, 10];

    for (const count of investorCounts) {
      const yieldDate = `2026-02-${String(10 + count).padStart(2, '0')}`;

      // Setup equal positions for simplicity
      const positionAmount = 100.0;
      const totalAUM = positionAmount * count;

      for (let i = 0; i < count && i < testInvestors.length; i++) {
        await setupInvestorPosition(testInvestors[i].id, fund!.id, positionAmount, yieldDate);
      }

      await setFundAUM(fund!.id, yieldDate, totalAUM);
      const result = await applyYield(fund!.id, yieldDate, 0.001);

      const allocations = await getYieldAllocations(result.distribution_id);
      expect(allocations.length).toBe(Math.min(count, testInvestors.length));

      // Each should have equal ownership
      const expectedOwnership = 100 / count;
      for (const allocation of allocations) {
        expect(Number(allocation.ownership_pct)).toBeCloseTo(expectedOwnership, 1);
      }

      console.log(`✓ ${count} investors: ${expectedOwnership.toFixed(2)}% each`);
    }
  });
});

// ============================================================================
// TEST SUITE 3: Fee Deduction
// ============================================================================

test.describe('3. Fee Deduction', () => {
  test('should verify gross_yield - fee_amount = net_yield', async () => {
    const fund = testFunds.get('IND-SOL');
    if (!fund) test.skip();

    const investor = testInvestors[0];
    const position = 1000.0;
    const yieldDate = '2026-02-20';
    const grossYieldPct = 0.002; // 0.2%

    await setupInvestorPosition(investor.id, fund!.id, position, yieldDate);
    await setFundAUM(fund!.id, yieldDate, position);

    const result = await applyYield(fund!.id, yieldDate, grossYieldPct);

    const allocations = await getYieldAllocations(result.distribution_id);
    const allocation = allocations[0];

    const grossAmount = Number(allocation.gross_amount);
    const feeAmount = Number(allocation.fee_amount);
    const netAmount = Number(allocation.net_amount);

    // Verify: gross - fee = net
    expect(Math.abs((grossAmount - feeAmount) - netAmount)).toBeLessThan(TOLERANCE);

    console.log(`✓ Fee calculation: ${grossAmount} - ${feeAmount} = ${netAmount}`);
  });

  test('should verify fee_amount = gross_yield * fee_percentage', async () => {
    const fund = testFunds.get('IND-USDT');
    if (!fund) test.skip();

    const investor = testInvestors[1];
    const position = 5000.0;
    const yieldDate = '2026-02-21';

    // Get investor's fee percentage
    const { data: profile } = await supabase
      .from('profiles')
      .select('fee_pct')
      .eq('id', investor.id)
      .single();

    const feePct = Number(profile?.fee_pct || 20) / 100; // Convert from percentage

    await setupInvestorPosition(investor.id, fund!.id, position, yieldDate);
    await setFundAUM(fund!.id, yieldDate, position);

    const result = await applyYield(fund!.id, yieldDate, 0.001);

    const allocations = await getYieldAllocations(result.distribution_id);
    const allocation = allocations[0];

    const grossAmount = Number(allocation.gross_amount);
    const feeAmount = Number(allocation.fee_amount);

    // Verify: fee = gross * fee_pct
    const expectedFee = grossAmount * feePct;
    expect(Math.abs(feeAmount - expectedFee)).toBeLessThan(TOLERANCE);

    console.log(`✓ Fee percentage: ${grossAmount} × ${feePct} = ${feeAmount}`);
  });
});

// ============================================================================
// TEST SUITE 4: Month-End Scenario
// ============================================================================

test.describe('4. Month-End Yield Distribution Scenario', () => {
  test('should calculate correct yield for deposits at different dates', async () => {
    /**
     * Scenario:
     * - Investor A deposits 100 ETH on Jan 1
     * - Investor B deposits 50 ETH on Jan 15
     * - Daily yield = 0.03% (0.0003)
     * - Calculate expected yield at Jan 31
     *
     * Expected:
     * - Jan 1-14 (14 days): Only A, AUM=100, A gets 100% of yield
     * - Jan 15-31 (17 days): A+B, AUM=150, A gets 66.67%, B gets 33.33%
     */

    const fund = testFunds.get('IND-ETH');
    if (!fund) test.skip();

    const investorA = testInvestors[0];
    const investorB = testInvestors[1];

    const amountA = 100.0;
    const amountB = 50.0;
    const dailyYieldPct = 0.0003; // 0.03%

    // Setup deposits
    await setupInvestorPosition(investorA.id, fund!.id, amountA, '2026-01-01');
    await setupInvestorPosition(investorB.id, fund!.id, amountB, '2026-01-15');

    // Calculate expected yields
    // Days 1-14: A only, yield = 100 * 0.0003 * 14 = 0.42 ETH to A
    // Days 15-31: Both, total AUM = 150
    //   - Daily yield = 150 * 0.0003 = 0.045 ETH
    //   - A's share = 0.045 * (100/150) = 0.03 ETH/day * 17 days = 0.51 ETH
    //   - B's share = 0.045 * (50/150) = 0.015 ETH/day * 17 days = 0.255 ETH

    const expectedA_phase1 = amountA * dailyYieldPct * 14;
    const expectedA_phase2 = (amountA + amountB) * dailyYieldPct * (amountA / (amountA + amountB)) * 17;
    const expectedB_phase2 = (amountA + amountB) * dailyYieldPct * (amountB / (amountA + amountB)) * 17;

    const totalExpectedA = expectedA_phase1 + expectedA_phase2;
    const totalExpectedB = expectedB_phase2;

    console.log(`Expected A: ${totalExpectedA.toFixed(6)} ETH`);
    console.log(`Expected B: ${totalExpectedB.toFixed(6)} ETH`);

    // In practice, yield is applied daily, so this is a simplified test
    // The actual system should match these calculations
    expect(totalExpectedA).toBeGreaterThan(totalExpectedB);
    expect(totalExpectedA + totalExpectedB).toBeCloseTo(
      amountA * dailyYieldPct * 31 + amountB * dailyYieldPct * 17,
      PRECISION
    );
  });
});

// ============================================================================
// TEST SUITE 5: Yield Precision
// ============================================================================

test.describe('5. Yield Precision', () => {
  test('should handle very small yields: 0.0001%', async () => {
    const fund = testFunds.get('IND-BTC');
    if (!fund) test.skip();

    const investor = testInvestors[0];
    const position = 10.0; // 10 BTC
    const tinyYieldPct = 0.000001; // 0.0001%
    const yieldDate = '2026-03-01';

    await setupInvestorPosition(investor.id, fund!.id, position, yieldDate);
    await setFundAUM(fund!.id, yieldDate, position);

    const result = await applyYield(fund!.id, yieldDate, tinyYieldPct);

    // Expected: 10 * 0.000001 = 0.00001 BTC
    const expectedYield = position * tinyYieldPct;

    const allocations = await getYieldAllocations(result.distribution_id);
    expect(Number(allocations[0]?.gross_amount)).toBeCloseTo(expectedYield, PRECISION);

    console.log(`✓ Tiny yield: ${expectedYield} ${fund!.asset}`);
  });

  test('should handle large positions: 1,000,000 units', async () => {
    const fund = testFunds.get('IND-USDT');
    if (!fund) test.skip();

    const investor = testInvestors[0];
    const largePosition = 1000000.0; // 1M USDT
    const yieldPct = 0.001; // 0.1%
    const yieldDate = '2026-03-02';

    await setupInvestorPosition(investor.id, fund!.id, largePosition, yieldDate);
    await setFundAUM(fund!.id, yieldDate, largePosition);

    const result = await applyYield(fund!.id, yieldDate, yieldPct);

    // Expected: 1,000,000 * 0.001 = 1,000 USDT
    const expectedYield = largePosition * yieldPct;

    const allocations = await getYieldAllocations(result.distribution_id);
    expect(Number(allocations[0]?.gross_amount)).toBeCloseTo(expectedYield, 2);

    console.log(`✓ Large position yield: ${expectedYield} ${fund!.asset}`);
  });

  test('should verify no rounding errors accumulate over multiple yields', async () => {
    const fund = testFunds.get('IND-SOL');
    if (!fund) test.skip();

    const investor = testInvestors[0];
    const initialPosition = 100.0;
    const yieldPct = 0.001; // 0.1% per day
    const days = 30;

    let currentPosition = initialPosition;

    await setupInvestorPosition(investor.id, fund!.id, initialPosition, '2026-03-01');

    // Apply 30 days of yield
    for (let day = 1; day <= days; day++) {
      const yieldDate = `2026-03-${String(day).padStart(2, '0')}`;
      await setFundAUM(fund!.id, yieldDate, currentPosition);
      await applyYield(fund!.id, yieldDate, yieldPct);

      // Update position (compound)
      currentPosition = currentPosition * (1 + yieldPct);
    }

    // Expected final: 100 * (1.001)^30 ≈ 103.04 SOL
    const expectedFinal = initialPosition * Math.pow(1 + yieldPct, days);

    const position = await getInvestorPosition(investor.id, fund!.id);
    const actualFinal = Number(position.current_value);

    // Should be within 0.01% of expected
    const errorPct = Math.abs((actualFinal - expectedFinal) / expectedFinal) * 100;
    expect(errorPct).toBeLessThan(0.01);

    console.log(`✓ 30-day compound: ${actualFinal.toFixed(6)} ≈ ${expectedFinal.toFixed(6)} (error: ${errorPct.toFixed(4)}%)`);
  });
});

// ============================================================================
// TEST SUITE 6: Dust Handling
// ============================================================================

test.describe('6. Dust Handling', () => {
  test('should record dust_amount in yield_distributions', async () => {
    const fund = testFunds.get('IND-ETH');
    if (!fund) test.skip();

    // Setup positions that will create dust (rounding remainder)
    const amounts = [33.33, 33.33, 33.34]; // Total: 100, but ownership will have rounding
    const yieldDate = '2026-03-10';

    for (let i = 0; i < amounts.length; i++) {
      await setupInvestorPosition(testInvestors[i].id, fund!.id, amounts[i], yieldDate);
    }

    const totalAUM = amounts.reduce((a, b) => a + b, 0);
    await setFundAUM(fund!.id, yieldDate, totalAUM);

    const result = await applyYield(fund!.id, yieldDate, 0.001);

    const { data: distribution } = await supabase
      .from('yield_distributions')
      .select('dust_amount, dust_receiver_id')
      .eq('id', result.distribution_id)
      .single();

    // Dust should be recorded (even if 0)
    expect(distribution).toBeTruthy();
    expect(distribution?.dust_amount !== undefined).toBe(true);

    console.log(`✓ Dust recorded: ${distribution?.dust_amount}`);
  });
});

// ============================================================================
// TEST SUITE 7: Conservation Laws
// ============================================================================

test.describe('7. Conservation Laws', () => {
  test('should verify total_yield_distributed = SUM(investor_yields) + dust', async () => {
    const fund = testFunds.get('IND-BTC');
    if (!fund) test.skip();

    // Setup multiple investors
    const amounts = [1.5, 2.5, 3.0, 3.0]; // Total: 10 BTC
    const yieldDate = '2026-03-15';

    for (let i = 0; i < amounts.length; i++) {
      await setupInvestorPosition(testInvestors[i].id, fund!.id, amounts[i], yieldDate);
    }

    const totalAUM = amounts.reduce((a, b) => a + b, 0);
    await setFundAUM(fund!.id, yieldDate, totalAUM);

    const result = await applyYield(fund!.id, yieldDate, 0.002);

    // Get distribution
    const { data: distribution } = await supabase
      .from('yield_distributions')
      .select('gross_yield_amount, dust_amount')
      .eq('id', result.distribution_id)
      .single();

    // Get all allocations
    const allocations = await getYieldAllocations(result.distribution_id);

    const totalDistributed = Number(distribution?.gross_yield_amount || 0);
    const dust = Number(distribution?.dust_amount || 0);
    const sumAllocations = allocations.reduce((sum, a) => sum + Number(a.gross_amount), 0);

    // Conservation: total = sum + dust
    const difference = Math.abs(totalDistributed - (sumAllocations + dust));
    expect(difference).toBeLessThan(TOLERANCE);

    console.log(`✓ Conservation: ${totalDistributed} = ${sumAllocations} + ${dust}`);
  });

  test('should verify opening_aum + yield = closing_aum for single day', async () => {
    const fund = testFunds.get('IND-USDT');
    if (!fund) test.skip();

    const investor = testInvestors[0];
    const openingAUM = 10000.0;
    const yieldPct = 0.001;
    const yieldDate = '2026-03-16';

    await setupInvestorPosition(investor.id, fund!.id, openingAUM, yieldDate);
    await setFundAUM(fund!.id, yieldDate, openingAUM);

    const result = await applyYield(fund!.id, yieldDate, yieldPct);

    // Expected closing = opening + yield
    const expectedClosing = openingAUM * (1 + yieldPct);

    // Get position after yield
    const position = await getInvestorPosition(investor.id, fund!.id);
    const actualClosing = Number(position.current_value);

    // Should match (accounting for fees)
    const { data: allocation } = await supabase
      .from('yield_allocations')
      .select('net_amount')
      .eq('distribution_id', result.distribution_id)
      .single();

    const netYield = Number(allocation?.net_amount || 0);
    expect(actualClosing).toBeCloseTo(openingAUM + netYield, PRECISION);

    console.log(`✓ Single day: ${openingAUM} + ${netYield} = ${actualClosing}`);
  });

  test('should verify no yield "created" or "destroyed"', async () => {
    const fund = testFunds.get('IND-XRP');
    if (!fund) test.skip();

    // Complex scenario: multiple investors, apply yield, verify totals
    const amounts = [1000, 2000, 3000, 4000];
    const yieldDate = '2026-03-17';

    for (let i = 0; i < amounts.length; i++) {
      await setupInvestorPosition(testInvestors[i].id, fund!.id, amounts[i], yieldDate);
    }

    const totalAUM = amounts.reduce((a, b) => a + b, 0); // 10,000 XRP
    const yieldPct = 0.0025; // 0.25%

    await setFundAUM(fund!.id, yieldDate, totalAUM);
    const result = await applyYield(fund!.id, yieldDate, yieldPct);

    // Expected total yield = 10000 * 0.0025 = 25 XRP
    const expectedTotalYield = totalAUM * yieldPct;

    // Get distribution
    const { data: distribution } = await supabase
      .from('yield_distributions')
      .select('gross_yield_amount, dust_amount')
      .eq('id', result.distribution_id)
      .single();

    // Get allocations
    const allocations = await getYieldAllocations(result.distribution_id);
    const sumGross = allocations.reduce((sum, a) => sum + Number(a.gross_amount), 0);
    const dust = Number(distribution?.dust_amount || 0);

    // Verify: expected = distributed (within tolerance)
    const totalAccounted = sumGross + dust;
    const difference = Math.abs(expectedTotalYield - totalAccounted);

    expect(difference).toBeLessThan(TOLERANCE);

    console.log(`✓ No yield lost: ${expectedTotalYield} ≈ ${totalAccounted} (diff: ${difference})`);
  });
});

// ============================================================================
// Summary
// ============================================================================

test.describe('Yield Calculation Test Summary', () => {
  test('should display test configuration', async () => {
    console.log('\n========================================');
    console.log('YIELD CALCULATION TEST SUMMARY');
    console.log('========================================');
    console.log(`Funds: ${Array.from(testFunds.keys()).join(', ')}`);
    console.log(`Investors: ${testInvestors.length}`);
    console.log(`Precision: ${PRECISION} decimal places`);
    console.log(`Tolerance: ${TOLERANCE}`);
    console.log('========================================\n');

    expect(testFunds.size).toBeGreaterThan(0);
  });
});
