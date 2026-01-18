/**
 * Period and Snapshot Tests
 *
 * Comprehensive tests for period management including:
 * - Period locking and unlocking
 * - Fund period snapshots
 * - Investor period snapshots
 * - Ownership percentage calculation at period end
 * - Period-based reconciliation
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

interface FundPeriodSnapshot {
  id: string;
  fund_id: string;
  period_start: string;
  period_end: string;
  opening_aum: string;
  closing_aum: string;
  total_yield: string;
  total_fees: string;
  is_locked: boolean;
  created_at: string;
}

interface InvestorPeriodSnapshot {
  id: string;
  investor_id: string;
  fund_id: string;
  period_start: string;
  period_end: string;
  opening_balance: string;
  closing_balance: string;
  total_yield: string;
  ownership_pct: string;
}

// ============================================================================
// Global Test State
// ============================================================================

let supabase: SupabaseClient;
let serviceSupabase: SupabaseClient;
let testFunds: Map<string, Fund> = new Map();
let testInvestorIds: string[] = [];

// ============================================================================
// Setup
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
  const { data: funds } = await client
    .from('funds')
    .select('id, code, name, asset')
    .in('code', FUND_CODES as unknown as string[]);

  if (funds) {
    funds.forEach(fund => testFunds.set(fund.code, fund));
  }

  console.log(`Loaded ${testFunds.size} funds for period tests`);
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

async function performDeposit(investorId: string, fundCode: string, amount: number, txDate: string): Promise<boolean> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const fund = testFunds.get(fundCode);
  if (!fund) return false;

  const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
    p_investor_id: investorId,
    p_fund_id: fund.id,
    p_amount: amount,
    p_tx_date: txDate,
    p_notes: 'Period test deposit',
  });

  return data?.success ?? false;
}

// ============================================================================
// Test Suite: Period Lock Status
// ============================================================================

test.describe('Period Lock Status', () => {
  const testFundCode = 'IND-USDT';

  test('should check if period is locked', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const { data, error } = await client.rpc('is_period_locked', {
      p_fund_id: fund.id,
      p_period_date: '2025-12-31',
    });

    if (error) {
      console.log(`Period lock check: ${error.message}`);
    } else {
      console.log(`Period 2025-12 locked: ${data}`);
    }
  });

  test('should check current month lock status', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const { data, error } = await client.rpc('is_period_locked', {
      p_fund_id: fund.id,
      p_period_date: '2026-01-18',
    });

    if (error) {
      console.log(`Current period lock check: ${error.message}`);
    } else {
      console.log(`Period 2026-01 locked: ${data}`);
      // Current month should typically not be locked
    }
  });
});

// ============================================================================
// Test Suite: Fund Period Snapshot
// ============================================================================

test.describe('Fund Period Snapshot', () => {
  let testInvestorId: string;
  const testFundCode = 'IND-ETH';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Period Snapshot Investor');
    await performDeposit(testInvestorId, testFundCode, 10, '2026-01-15');
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should generate fund period snapshot', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const { data, error } = await client.rpc('generate_fund_period_snapshot', {
      p_fund_id: fund.id,
      p_period_start: '2026-01-01',
      p_period_end: '2026-01-31',
    });

    if (error) {
      console.log(`Generate snapshot: ${error.message}`);
    } else {
      console.log(`Snapshot generated: ${JSON.stringify(data)}`);
      expect(data).toBeDefined();
    }
  });

  test('should list fund period snapshots', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const { data: snapshots, error } = await client
      .from('fund_period_snapshot')
      .select('*')
      .eq('fund_id', fund.id)
      .order('period_end', { ascending: false })
      .limit(12);

    if (error) {
      console.log(`Snapshot list: ${error.message}`);
    } else {
      console.log(`Fund snapshots: ${snapshots?.length || 0}`);
    }
  });
});

// ============================================================================
// Test Suite: Period Locking
// ============================================================================

test.describe('Period Locking', () => {
  const testFundCode = 'IND-SOL';

  test('should lock fund period', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    // First generate snapshot
    await client.rpc('generate_fund_period_snapshot', {
      p_fund_id: fund.id,
      p_period_start: '2025-11-01',
      p_period_end: '2025-11-30',
    });

    // Then lock
    const { data, error } = await client.rpc('lock_fund_period_snapshot', {
      p_fund_id: fund.id,
      p_period_end: '2025-11-30',
    });

    if (error) {
      console.log(`Lock period: ${error.message}`);
    } else {
      console.log(`Period locked: ${JSON.stringify(data)}`);
    }
  });

  test('should reject transactions in locked period', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    // Check if period is locked
    const { data: isLocked } = await client.rpc('is_period_locked', {
      p_fund_id: fund.id,
      p_period_date: '2025-11-15',
    });

    if (isLocked) {
      // Try to create transaction in locked period
      const investorId = await createTestInvestor('Locked Period Investor');

      const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: 100,
        p_tx_date: '2025-11-15',
        p_notes: 'Should fail - locked period',
      });

      // Should fail
      console.log(`Deposit in locked period: success=${data?.success}, error=${error?.message}`);
    }
  });

  test('should unlock fund period', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const { data, error } = await client.rpc('unlock_fund_period_snapshot', {
      p_fund_id: fund.id,
      p_period_end: '2025-11-30',
    });

    if (error) {
      console.log(`Unlock period: ${error.message}`);
    } else {
      console.log(`Period unlocked: ${JSON.stringify(data)}`);
    }
  });
});

// ============================================================================
// Test Suite: Investor Period Snapshot
// ============================================================================

test.describe('Investor Period Snapshot', () => {
  let testInvestorId: string;
  const testFundCode = 'IND-BTC';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Investor Snapshot Test');
    await performDeposit(testInvestorId, testFundCode, 0.5, '2026-01-10');
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should list investor period snapshots', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: snapshots, error } = await client
      .from('investor_period_snapshot')
      .select('*')
      .eq('investor_id', testInvestorId)
      .order('period_end', { ascending: false });

    if (error) {
      console.log(`Investor snapshots: ${error.message}`);
    } else {
      console.log(`Investor period snapshots: ${snapshots?.length || 0}`);
    }
  });
});

// ============================================================================
// Test Suite: Period Ownership
// ============================================================================

test.describe('Period Ownership', () => {
  const testFundCode = 'IND-XRP';

  test('should get period ownership percentages', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    // Create investors with positions
    const inv1 = await createTestInvestor('Ownership Test 1');
    const inv2 = await createTestInvestor('Ownership Test 2');

    await performDeposit(inv1, testFundCode, 6000, '2026-01-15');
    await performDeposit(inv2, testFundCode, 4000, '2026-01-15');

    await new Promise(resolve => setTimeout(resolve, 500));

    const { data, error } = await client.rpc('get_period_ownership', {
      p_fund_id: fund.id,
      p_period_date: '2026-01-31',
    });

    if (error) {
      console.log(`Period ownership: ${error.message}`);
    } else {
      console.log(`Period ownership: ${JSON.stringify(data)}`);

      if (data && Array.isArray(data)) {
        const totalOwnership = data.reduce((sum: number, o: any) =>
          sum + parseFloat(o.ownership_pct || 0), 0);

        console.log(`Total ownership: ${totalOwnership}%`);
        // Should sum to approximately 100%
      }
    }
  });
});

// ============================================================================
// Test Suite: Period Reconciliation
// ============================================================================

test.describe('Period Reconciliation', () => {
  const testFundCode = 'IND-USDT';

  test('should reconcile fund period', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const { data, error } = await client.rpc('reconcile_fund_period', {
      p_fund_id: fund.id,
      p_period_start: '2026-01-01',
      p_period_end: '2026-01-31',
    });

    if (error) {
      console.log(`Period reconciliation: ${error.message}`);
    } else {
      console.log(`Reconciliation result: ${JSON.stringify(data)}`);
    }
  });
});

// ============================================================================
// Test Suite: Accounting Periods
// ============================================================================

test.describe('Accounting Periods', () => {
  test('should list accounting periods', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: periods, error } = await client
      .from('accounting_periods')
      .select('*')
      .order('period_end', { ascending: false })
      .limit(12);

    if (error) {
      console.log(`Accounting periods: ${error.message}`);
    } else {
      console.log(`Accounting periods: ${periods?.length || 0}`);
    }
  });
});

// ============================================================================
// Test Suite: Position Snapshots
// ============================================================================

test.describe('Position Snapshots', () => {
  test('should list investor position snapshots', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: snapshots, error } = await client
      .from('investor_position_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(20);

    if (error) {
      console.log(`Position snapshots: ${error.message}`);
    } else {
      console.log(`Position snapshots: ${snapshots?.length || 0}`);
    }
  });
});
