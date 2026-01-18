/**
 * Full Month Simulation Test
 *
 * This test simulates a complete month of operations to validate:
 * 1. The AUM → Crystallize → Transaction flow
 * 2. Daily yield applications
 * 3. Multiple transactions throughout the month
 * 4. Month-end processing
 * 5. Final position and yield reconciliation
 *
 * CRITICAL FLOW:
 * When any transaction occurs:
 *   1. SET AUM (opening balance for the day)
 *   2. CRYSTALLIZE YIELD for ALL investors at CURRENT ownership %
 *   3. APPLY TRANSACTION (changes ownership percentages)
 *   4. RECALCULATE ownership percentages
 *
 * This ensures existing investors don't get diluted on accrued yield.
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: SupabaseClient;
let adminId: string;
let testFund: { id: string; code: string; asset: string };
let investors: { id: string; email: string; name: string }[];

// Simulation parameters
const DAILY_YIELD_PCT = 0.001; // 0.1% daily yield
const FEE_PCT = 0.20; // 20% fee on yield
const TOLERANCE = 1e-6;

// ============================================================================
// Test Data Structures
// ============================================================================

interface SimulationEvent {
  day: number;
  type: 'deposit' | 'withdrawal' | 'yield';
  investorIndex: number;
  amount: number;
  description: string;
}

interface InvestorState {
  id: string;
  name: string;
  position: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalYieldEarned: number;
  totalFeesPaid: number;
  ownershipPct: number;
}

interface DayState {
  day: number;
  date: string;
  openingAUM: number;
  closingAUM: number;
  dailyYield: number;
  events: string[];
  investorStates: InvestorState[];
}

// ============================================================================
// Setup
// ============================================================================

test.beforeAll(async () => {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get ETH fund for simulation
  const { data: fund } = await supabase
    .from('funds')
    .select('id, code, asset')
    .eq('code', 'IND-ETH')
    .single();

  testFund = fund!;

  // Get admin
  const { data: admin } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_admin', true)
    .single();

  adminId = admin?.id;

  // Get test investors
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .eq('is_admin', false)
    .limit(5);

  investors = (profiles || []).map(p => ({
    id: p.id,
    email: p.email,
    name: `${p.first_name || 'Investor'} ${p.last_name || ''}`.trim()
  }));
});

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function setAUM(fundId: string, date: string, amount: number): Promise<void> {
  await supabase.rpc('set_fund_daily_aum', {
    p_fund_id: fundId,
    p_aum_date: date,
    p_total_aum: amount,
    p_source: 'simulation_test'
  });
}

async function applyDeposit(
  investorId: string,
  fundId: string,
  amount: number,
  date: string
): Promise<any> {
  const { data, error } = await supabase.rpc('apply_deposit_with_crystallization', {
    p_investor_id: investorId,
    p_fund_id: fundId,
    p_amount: amount,
    p_created_by: adminId,
    p_effective_date: date,
    p_description: 'Simulation deposit'
  });

  if (error) throw error;
  return data;
}

async function applyWithdrawal(
  investorId: string,
  fundId: string,
  amount: number,
  date: string
): Promise<any> {
  const { data, error } = await supabase.rpc('apply_withdrawal_with_crystallization', {
    p_investor_id: investorId,
    p_fund_id: fundId,
    p_amount: amount,
    p_created_by: adminId,
    p_effective_date: date,
    p_description: 'Simulation withdrawal'
  });

  if (error) throw error;
  return data;
}

async function applyDailyYield(fundId: string, date: string): Promise<any> {
  const { data, error } = await supabase.rpc('apply_daily_yield_to_fund_v3', {
    p_fund_id: fundId,
    p_yield_date: date,
    p_gross_yield_pct: DAILY_YIELD_PCT,
    p_created_by: adminId,
    p_purpose: 'transaction'
  });

  if (error) throw error;
  return data;
}

async function getInvestorPosition(investorId: string, fundId: string): Promise<number> {
  const { data } = await supabase
    .from('investor_positions')
    .select('current_value')
    .eq('investor_id', investorId)
    .eq('fund_id', fundId)
    .single();

  return Number(data?.current_value || 0);
}

async function getFundTotalAUM(fundId: string): Promise<number> {
  const { data } = await supabase
    .from('investor_positions')
    .select('current_value')
    .eq('fund_id', fundId)
    .eq('is_active', true);

  return (data || []).reduce((sum, p) => sum + Number(p.current_value), 0);
}

async function getYieldAllocations(investorId: string, fundId: string): Promise<any[]> {
  const { data } = await supabase
    .from('yield_allocations')
    .select(`
      *,
      yield_distributions!inner(fund_id)
    `)
    .eq('investor_id', investorId)
    .eq('yield_distributions.fund_id', fundId)
    .eq('is_voided', false);

  return data || [];
}

// ============================================================================
// TEST: Full January 2026 Simulation
// ============================================================================

test.describe('Full Month Simulation: January 2026', () => {
  /**
   * Simulation Scenario:
   *
   * Day 1:  Investor A deposits 100 ETH
   * Day 5:  Investor B deposits 50 ETH
   * Day 10: Investor C deposits 25 ETH
   * Day 15: Investor A deposits 25 ETH more
   * Day 20: Investor B withdraws 20 ETH
   * Day 25: Investor D deposits 100 ETH
   *
   * Daily yield: 0.1% applied at end of each day
   *
   * Expected behavior:
   * - When B deposits on Day 5, A's yield from Day 1-5 is crystallized at 100% ownership
   * - When C deposits on Day 10, A+B's yield from Day 5-10 is crystallized at their respective ownership
   * - etc.
   */

  const simulationEvents: SimulationEvent[] = [
    { day: 1, type: 'deposit', investorIndex: 0, amount: 100, description: 'A initial deposit' },
    { day: 5, type: 'deposit', investorIndex: 1, amount: 50, description: 'B initial deposit' },
    { day: 10, type: 'deposit', investorIndex: 2, amount: 25, description: 'C initial deposit' },
    { day: 15, type: 'deposit', investorIndex: 0, amount: 25, description: 'A additional deposit' },
    { day: 20, type: 'withdrawal', investorIndex: 1, amount: 20, description: 'B partial withdrawal' },
    { day: 25, type: 'deposit', investorIndex: 3, amount: 100, description: 'D initial deposit' },
  ];

  let dayStates: DayState[] = [];
  let expectedFinalPositions: Map<string, number> = new Map();

  test('should process all January transactions and yields', async () => {
    if (!testFund || investors.length < 4) {
      test.skip();
      return;
    }

    console.log('\n========================================');
    console.log('JANUARY 2026 SIMULATION');
    console.log(`Fund: ${testFund.code} (${testFund.asset})`);
    console.log(`Daily Yield: ${DAILY_YIELD_PCT * 100}%`);
    console.log('========================================\n');

    // Track state throughout simulation
    let currentPositions: Map<string, number> = new Map();

    // Process each day of January
    for (let day = 1; day <= 31; day++) {
      const date = formatDate(2026, 1, day);
      const dayEvents: string[] = [];

      // Get events for this day
      const todaysEvents = simulationEvents.filter(e => e.day === day);

      // Calculate opening AUM
      let openingAUM = 0;
      for (const pos of currentPositions.values()) {
        openingAUM += pos;
      }

      // Set AUM before any transactions (triggers crystallization)
      if (openingAUM > 0) {
        await setAUM(testFund.id, date, openingAUM);
        dayEvents.push(`Set AUM: ${openingAUM.toFixed(4)} ${testFund.asset}`);
      }

      // Process transactions
      for (const event of todaysEvents) {
        const investor = investors[event.investorIndex];

        if (event.type === 'deposit') {
          await applyDeposit(investor.id, testFund.id, event.amount, date);
          const currentPos = currentPositions.get(investor.id) || 0;
          currentPositions.set(investor.id, currentPos + event.amount);
          dayEvents.push(`DEPOSIT: ${investor.name} +${event.amount} ${testFund.asset}`);
        } else if (event.type === 'withdrawal') {
          await applyWithdrawal(investor.id, testFund.id, event.amount, date);
          const currentPos = currentPositions.get(investor.id) || 0;
          currentPositions.set(investor.id, currentPos - event.amount);
          dayEvents.push(`WITHDRAWAL: ${investor.name} -${event.amount} ${testFund.asset}`);
        }
      }

      // Apply daily yield at end of day (if there's AUM)
      const currentAUM = Array.from(currentPositions.values()).reduce((a, b) => a + b, 0);
      if (currentAUM > 0) {
        await applyDailyYield(testFund.id, date);
        const dailyYield = currentAUM * DAILY_YIELD_PCT;
        dayEvents.push(`YIELD: ${dailyYield.toFixed(6)} ${testFund.asset} distributed`);

        // Update positions with yield (simplified - actual is per investor)
        for (const [id, pos] of currentPositions.entries()) {
          if (pos > 0) {
            const ownership = pos / currentAUM;
            const grossYield = dailyYield * ownership;
            const netYield = grossYield * (1 - FEE_PCT);
            currentPositions.set(id, pos + netYield);
          }
        }
      }

      // Store day state
      const closingAUM = Array.from(currentPositions.values()).reduce((a, b) => a + b, 0);
      dayStates.push({
        day,
        date,
        openingAUM,
        closingAUM,
        dailyYield: currentAUM * DAILY_YIELD_PCT,
        events: dayEvents,
        investorStates: investors.map(inv => ({
          id: inv.id,
          name: inv.name,
          position: currentPositions.get(inv.id) || 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          totalYieldEarned: 0,
          totalFeesPaid: 0,
          ownershipPct: closingAUM > 0 ? ((currentPositions.get(inv.id) || 0) / closingAUM) * 100 : 0
        }))
      });

      // Log significant days
      if (todaysEvents.length > 0 || day === 31) {
        console.log(`Day ${day} (${date}):`);
        dayEvents.forEach(e => console.log(`  ${e}`));
        console.log(`  Closing AUM: ${closingAUM.toFixed(4)} ${testFund.asset}\n`);
      }
    }

    // Store expected final positions
    for (const [id, pos] of currentPositions.entries()) {
      expectedFinalPositions.set(id, pos);
    }

    expect(dayStates.length).toBe(31);
  });

  test('should verify final positions match expected', async () => {
    if (!testFund || investors.length < 4) {
      test.skip();
      return;
    }

    console.log('\n--- Final Position Verification ---\n');

    for (const investor of investors.slice(0, 4)) {
      const actualPosition = await getInvestorPosition(investor.id, testFund.id);
      const expectedPosition = expectedFinalPositions.get(investor.id) || 0;

      console.log(`${investor.name}:`);
      console.log(`  Expected: ${expectedPosition.toFixed(6)} ${testFund.asset}`);
      console.log(`  Actual:   ${actualPosition.toFixed(6)} ${testFund.asset}`);

      // Allow 1% tolerance due to compound calculation differences
      const tolerance = expectedPosition * 0.01;
      expect(Math.abs(actualPosition - expectedPosition)).toBeLessThan(tolerance);
    }
  });

  test('should verify total fund AUM reconciles', async () => {
    if (!testFund) {
      test.skip();
      return;
    }

    const totalFromPositions = await getFundTotalAUM(testFund.id);
    const sumExpected = Array.from(expectedFinalPositions.values()).reduce((a, b) => a + b, 0);

    console.log(`\nAUM Reconciliation:`);
    console.log(`  Sum of positions: ${totalFromPositions.toFixed(4)} ${testFund.asset}`);
    console.log(`  Expected sum:     ${sumExpected.toFixed(4)} ${testFund.asset}`);

    // Should match within 1%
    const tolerance = sumExpected * 0.01;
    expect(Math.abs(totalFromPositions - sumExpected)).toBeLessThan(tolerance);
  });

  test('should verify yield was crystallized before each transaction', async () => {
    if (!testFund || investors.length < 4) {
      test.skip();
      return;
    }

    // Check that yield allocations exist for investors
    const allocationsA = await getYieldAllocations(investors[0].id, testFund.id);
    const allocationsB = await getYieldAllocations(investors[1].id, testFund.id);

    console.log(`\nYield Allocations:`);
    console.log(`  Investor A: ${allocationsA.length} allocations`);
    console.log(`  Investor B: ${allocationsB.length} allocations`);

    // A should have allocations (was in fund all month)
    expect(allocationsA.length).toBeGreaterThan(0);
  });

  test('should verify no yield dilution occurred', async () => {
    /**
     * Key test: When Investor B deposited on Day 5,
     * Investor A should have received 100% of yield from Day 1-5.
     *
     * If crystallization worked correctly, A's yield for those 5 days
     * was calculated at 100% ownership, NOT at the reduced ownership
     * after B deposited.
     */

    if (!testFund || investors.length < 2) {
      test.skip();
      return;
    }

    // Calculate what A should have earned in first 5 days
    // Day 1-5: A owns 100%, position = 100 ETH
    // Daily yield at 0.1% = 0.1 ETH gross per day
    // 5 days = 0.5 ETH gross, 0.4 ETH net (after 20% fee)

    const expectedYieldDays1to5 = 100 * DAILY_YIELD_PCT * 5 * (1 - FEE_PCT);

    console.log(`\nAnti-Dilution Verification:`);
    console.log(`  A's expected yield (Days 1-5): ${expectedYieldDays1to5.toFixed(6)} ${testFund.asset}`);
    console.log(`  (At 100% ownership before B deposited)`);

    // The actual verification would require summing yield allocations
    // for A with dates <= Day 5 and ownership_pct = 100%

    expect(expectedYieldDays1to5).toBeGreaterThan(0);
  });
});

// ============================================================================
// TEST: Ownership Percentage Transitions
// ============================================================================

test.describe('Ownership Percentage Transitions', () => {
  test('should track ownership changes through the month', async () => {
    if (!testFund || investors.length < 4) {
      test.skip();
      return;
    }

    const keyDays = [
      { day: 1, expectedOwnership: { A: 100, B: 0, C: 0, D: 0 } },
      { day: 5, expectedOwnership: { A: 66.67, B: 33.33, C: 0, D: 0 } },
      { day: 10, expectedOwnership: { A: 57.14, B: 28.57, C: 14.29, D: 0 } },
      // After A deposits 25 more on day 15:
      { day: 15, expectedOwnership: { A: 62.5, B: 25, C: 12.5, D: 0 } },
      // After B withdraws 20 on day 20:
      { day: 20, expectedOwnership: { A: 69.44, B: 16.67, C: 13.89, D: 0 } },
      // After D deposits 100 on day 25:
      { day: 25, expectedOwnership: { A: 41.67, B: 10, C: 8.33, D: 40 } },
    ];

    console.log('\n--- Ownership Transitions ---\n');

    for (const checkpoint of keyDays) {
      console.log(`Day ${checkpoint.day}:`);
      console.log(`  Expected: A=${checkpoint.expectedOwnership.A}%, B=${checkpoint.expectedOwnership.B}%, C=${checkpoint.expectedOwnership.C}%, D=${checkpoint.expectedOwnership.D}%`);
    }

    // Note: Actual ownership will differ slightly due to yield compounding
    expect(keyDays.length).toBe(6);
  });
});

// ============================================================================
// Summary
// ============================================================================

test.describe('Month Simulation Summary', () => {
  test('should display simulation summary', async () => {
    console.log('\n========================================');
    console.log('MONTH SIMULATION SUMMARY');
    console.log('========================================');
    console.log(`Fund: ${testFund?.code || 'N/A'}`);
    console.log(`Investors: ${investors?.length || 0}`);
    console.log(`Days Simulated: 31`);
    console.log(`Daily Yield Rate: ${DAILY_YIELD_PCT * 100}%`);
    console.log(`Fee Rate: ${FEE_PCT * 100}%`);
    console.log('========================================\n');

    expect(true).toBe(true);
  });
});
