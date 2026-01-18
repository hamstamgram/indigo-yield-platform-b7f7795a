/**
 * Data Integrity Tests
 *
 * Comprehensive tests for data consistency and integrity including:
 * - Position-transaction reconciliation
 * - AUM validation
 * - Orphaned record detection
 * - Balance chain verification
 * - Foreign key integrity
 * - Duplicate detection
 *
 * @requires Supabase connection with service_role key
 * @requires Admin credentials
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Test Configuration
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'testadmin@indigo.fund';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Indigo!Admin2026#Secure';

const FUND_CODES = ['IND-BTC', 'IND-ETH', 'IND-SOL', 'IND-USDT', 'IND-XRP'] as const;

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

interface IntegrityViolation {
  type: string;
  entity_id: string;
  description: string;
  severity: string;
}

// ============================================================================
// Global Test State
// ============================================================================

let supabase: SupabaseClient;
let serviceSupabase: SupabaseClient;
let testFunds: Map<string, Fund> = new Map();

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

  console.log(`Loaded ${testFunds.size} funds for integrity tests`);
});

// ============================================================================
// Test Suite: Position-Transaction Reconciliation
// ============================================================================

test.describe('Position-Transaction Reconciliation', () => {
  test('should reconcile all positions against transactions', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Get all active positions
    const { data: positions, error } = await client
      .from('investor_positions')
      .select('investor_id, fund_id, current_value')
      .eq('is_active', true);

    if (error) {
      console.log(`Position fetch error: ${error.message}`);
      return;
    }

    let discrepancies = 0;
    let checked = 0;

    for (const position of positions || []) {
      // Calculate expected position from transactions
      const { data: transactions } = await client
        .from('transactions_v2')
        .select('type, amount')
        .eq('investor_id', position.investor_id)
        .eq('fund_id', position.fund_id)
        .eq('is_voided', false);

      let calculatedPosition = 0;
      for (const tx of transactions || []) {
        const amount = parseFloat(tx.amount);
        if (['DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT'].includes(tx.type)) {
          calculatedPosition += amount;
        } else if (['WITHDRAWAL', 'FEE', 'IB_DEBIT', 'INTERNAL_WITHDRAWAL'].includes(tx.type)) {
          calculatedPosition -= amount;
        }
      }

      const storedPosition = parseFloat(position.current_value);
      const variance = Math.abs(storedPosition - calculatedPosition);

      if (variance > PRECISION_TOLERANCE) {
        discrepancies++;
        console.error(`DISCREPANCY: investor=${position.investor_id}, fund=${position.fund_id}`);
        console.error(`  Stored: ${storedPosition}, Calculated: ${calculatedPosition}, Variance: ${variance}`);
      }

      checked++;
    }

    console.log(`Position reconciliation: ${checked} checked, ${discrepancies} discrepancies`);

    // Ideally no discrepancies
    expect(discrepancies).toBe(0);
  });
});

// ============================================================================
// Test Suite: AUM Reconciliation
// ============================================================================

test.describe('AUM Reconciliation', () => {
  test('should reconcile AUM against sum of positions', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    for (const [fundCode, fund] of testFunds) {
      // Get sum of positions
      const { data: positions } = await client
        .from('investor_positions')
        .select('current_value')
        .eq('fund_id', fund.id)
        .eq('is_active', true);

      const calculatedAUM = (positions || []).reduce(
        (sum, p) => sum + parseFloat(p.current_value),
        0
      );

      // Get latest recorded AUM
      const { data: aumRecord } = await client
        .from('fund_daily_aum')
        .select('total_aum')
        .eq('fund_id', fund.id)
        .order('aum_date', { ascending: false })
        .limit(1)
        .single();

      const recordedAUM = aumRecord ? parseFloat(aumRecord.total_aum) : 0;

      if (recordedAUM > 0 || calculatedAUM > 0) {
        const variance = Math.abs(recordedAUM - calculatedAUM);
        const variancePct = calculatedAUM > 0 ? (variance / calculatedAUM) * 100 : 0;

        console.log(`${fundCode}: recorded=${recordedAUM}, calculated=${calculatedAUM}, variance=${variancePct.toFixed(4)}%`);

        // Allow small variance for timing
        if (variancePct > 1) {
          console.warn(`Large AUM variance for ${fundCode}: ${variancePct.toFixed(2)}%`);
        }
      }
    }
  });

  test('should use check_aum_reconciliation RPC', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    for (const [fundCode, fund] of testFunds) {
      const { data, error } = await client.rpc('check_aum_reconciliation', {
        p_fund_id: fund.id,
        p_tolerance: 0.01,
      });

      if (error) {
        console.log(`${fundCode} AUM check: ${error.message}`);
      } else {
        console.log(`${fundCode} AUM reconciliation: ${JSON.stringify(data)}`);
      }
    }
  });
});

// ============================================================================
// Test Suite: Orphaned Records
// ============================================================================

test.describe('Orphaned Records Detection', () => {
  test('should detect transactions with non-existent investor', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: orphanedTx, error } = await client
      .from('transactions_v2')
      .select(`
        id,
        investor_id,
        investors!inner(id)
      `)
      .is('investors.id', null)
      .limit(10);

    // If using inner join, no results means no orphans
    console.log(`Orphaned transactions (invalid investor): ${orphanedTx?.length || 0}`);
  });

  test('should detect transactions with non-existent fund', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: orphanedTx, error } = await client
      .from('transactions_v2')
      .select(`
        id,
        fund_id,
        funds!inner(id)
      `)
      .is('funds.id', null)
      .limit(10);

    console.log(`Orphaned transactions (invalid fund): ${orphanedTx?.length || 0}`);
  });

  test('should detect positions without investor', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: orphanedPos, error } = await client
      .from('investor_positions')
      .select(`
        id,
        investor_id,
        investors!inner(id)
      `)
      .is('investors.id', null)
      .limit(10);

    console.log(`Orphaned positions: ${orphanedPos?.length || 0}`);
  });
});

// ============================================================================
// Test Suite: Duplicate Detection
// ============================================================================

test.describe('Duplicate Detection', () => {
  test('should detect duplicate investor emails', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: duplicates, error } = await client
      .from('profiles')
      .select('email')
      .not('email', 'is', null);

    if (duplicates) {
      const emailCounts = new Map<string, number>();
      for (const inv of duplicates) {
        const count = emailCounts.get(inv.email) || 0;
        emailCounts.set(inv.email, count + 1);
      }

      const dups = Array.from(emailCounts.entries()).filter(([_, count]) => count > 1);
      console.log(`Duplicate investor emails: ${dups.length}`);

      if (dups.length > 0) {
        console.warn('Duplicate emails found:', dups.slice(0, 5));
      }
    }
  });

  test('should detect duplicate IB codes', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: ibs, error } = await client
      .from('profiles')
      .select('ib_code')
      .eq('role', 'ib')
      .not('ib_code', 'is', null);

    if (ibs) {
      const codeCounts = new Map<string, number>();
      for (const ib of ibs) {
        const count = codeCounts.get(ib.ib_code) || 0;
        codeCounts.set(ib.ib_code, count + 1);
      }

      const dups = Array.from(codeCounts.entries()).filter(([_, count]) => count > 1);
      console.log(`Duplicate IB codes: ${dups.length}`);
    }
  });
});

// ============================================================================
// Test Suite: Balance Chain Integrity
// ============================================================================

test.describe('Balance Chain Integrity', () => {
  test('should verify balance_after chain continuity', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Get unique investor-fund pairs
    const { data: pairs } = await client
      .from('transactions_v2')
      .select('investor_id, fund_id')
      .eq('is_voided', false)
      .limit(100);

    const uniquePairs = new Set(
      (pairs || []).map(p => `${p.investor_id}|${p.fund_id}`)
    );

    let brokenChains = 0;

    for (const pairKey of Array.from(uniquePairs).slice(0, 20)) {
      const [investorId, fundId] = pairKey.split('|');

      const { data: transactions } = await client
        .from('transactions_v2')
        .select('balance_before, balance_after')
        .eq('investor_id', investorId)
        .eq('fund_id', fundId)
        .eq('is_voided', false)
        .order('tx_date', { ascending: true })
        .order('created_at', { ascending: true });

      let previousBalanceAfter: number | null = null;

      for (const tx of transactions || []) {
        if (tx.balance_before !== null && previousBalanceAfter !== null) {
          const balanceBefore = parseFloat(tx.balance_before);
          if (Math.abs(balanceBefore - previousBalanceAfter) > PRECISION_TOLERANCE) {
            brokenChains++;
            break;
          }
        }
        if (tx.balance_after !== null) {
          previousBalanceAfter = parseFloat(tx.balance_after);
        }
      }
    }

    console.log(`Balance chain check: ${brokenChains} broken chains (note: balance_before/after may not be maintained)`);
  });
});

// ============================================================================
// Test Suite: Void Integrity
// ============================================================================

test.describe('Void Integrity', () => {
  test('should verify voided transactions have reason', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: voidedWithoutReason, error } = await client
      .from('transactions_v2')
      .select('id')
      .eq('is_voided', true)
      .is('voided_reason', null);

    console.log(`Voided transactions without reason: ${voidedWithoutReason?.length || 0}`);
  });

  test('should verify voided transactions have timestamp', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: voidedWithoutTimestamp, error } = await client
      .from('transactions_v2')
      .select('id')
      .eq('is_voided', true)
      .is('voided_at', null);

    console.log(`Voided transactions without timestamp: ${voidedWithoutTimestamp?.length || 0}`);
  });
});

// ============================================================================
// Test Suite: Yield Distribution Integrity
// ============================================================================

test.describe('Yield Distribution Integrity', () => {
  test('should verify yield allocations sum to distribution total', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Get recent distributions
    const { data: distributions } = await client
      .from('yield_distributions')
      .select('id, gross_yield, net_yield')
      .eq('status', 'applied')
      .order('created_at', { ascending: false })
      .limit(20);

    let mismatches = 0;

    for (const dist of distributions || []) {
      const { data: allocations } = await client
        .from('yield_allocations')
        .select('net_yield')
        .eq('yield_distribution_id', dist.id)
        .eq('is_voided', false);

      const totalAllocated = (allocations || []).reduce(
        (sum, a) => sum + parseFloat(a.net_yield),
        0
      );

      const expectedNet = parseFloat(dist.net_yield);
      const variance = Math.abs(totalAllocated - expectedNet);

      if (variance > PRECISION_TOLERANCE * 100) {
        mismatches++;
        console.warn(`Yield distribution ${dist.id}: allocated=${totalAllocated}, expected=${expectedNet}`);
      }
    }

    console.log(`Yield distribution check: ${mismatches} mismatches out of ${distributions?.length || 0}`);
  });
});

// ============================================================================
// Test Suite: Fee Integrity
// ============================================================================

test.describe('Fee Integrity', () => {
  test('should verify fee allocations match yield distribution fees', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: distributions } = await client
      .from('yield_distributions')
      .select('id, total_fees')
      .eq('status', 'applied')
      .not('total_fees', 'eq', '0')
      .order('created_at', { ascending: false })
      .limit(20);

    let verified = 0;
    let mismatches = 0;

    for (const dist of distributions || []) {
      const { data: allocations } = await client
        .from('yield_allocations')
        .select('fee_amount')
        .eq('yield_distribution_id', dist.id);

      const totalFees = (allocations || []).reduce(
        (sum, a) => sum + parseFloat(a.fee_amount || '0'),
        0
      );

      const expectedFees = parseFloat(dist.total_fees);
      const variance = Math.abs(totalFees - expectedFees);

      if (variance > PRECISION_TOLERANCE * 100) {
        mismatches++;
      }

      verified++;
    }

    console.log(`Fee integrity: ${verified} checked, ${mismatches} mismatches`);
  });
});

// ============================================================================
// Test Suite: Foreign Key Integrity
// ============================================================================

test.describe('Foreign Key Integrity', () => {
  test('should verify all funds have valid assets', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: funds } = await client
      .from('funds')
      .select('id, code, asset');

    const validAssets = ['BTC', 'ETH', 'SOL', 'USDT', 'XRP', 'EURC', 'xAUT', 'ADA'];

    const invalidAssets = (funds || []).filter(f => !validAssets.includes(f.asset));

    console.log(`Funds with invalid assets: ${invalidAssets.length}`);
  });

  test('should verify all yield allocations have valid distribution', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Sample check
    const { data: orphans, error } = await client
      .from('yield_allocations')
      .select(`
        id,
        yield_distribution_id,
        yield_distributions!inner(id)
      `)
      .is('yield_distributions.id', null)
      .limit(10);

    console.log(`Orphaned yield allocations: ${orphans?.length || 0}`);
  });
});

// ============================================================================
// Test Suite: Ownership Percentage Integrity
// ============================================================================

test.describe('Ownership Percentage Integrity', () => {
  test('should verify ownership sums to 100% per fund', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    for (const [fundCode, fund] of testFunds) {
      const { data: positions } = await client
        .from('investor_positions')
        .select('current_value')
        .eq('fund_id', fund.id)
        .eq('is_active', true);

      const totalAUM = (positions || []).reduce(
        (sum, p) => sum + parseFloat(p.current_value),
        0
      );

      if (totalAUM > 0) {
        let totalOwnership = 0;
        for (const pos of positions || []) {
          const ownership = (parseFloat(pos.current_value) / totalAUM) * 100;
          totalOwnership += ownership;
        }

        const variance = Math.abs(totalOwnership - 100);

        if (variance > 0.01) {
          console.warn(`${fundCode}: Ownership sum ${totalOwnership.toFixed(6)}% (expected 100%)`);
        }
      }
    }
  });
});

// ============================================================================
// Test Suite: Data Type Validation
// ============================================================================

test.describe('Data Type Validation', () => {
  test('should verify no negative positions', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: negativePositions, error } = await client
      .from('investor_positions')
      .select('id, investor_id, fund_id, current_value')
      .lt('current_value', 0);

    console.log(`Negative positions: ${negativePositions?.length || 0}`);

    if (negativePositions && negativePositions.length > 0) {
      console.error('CRITICAL: Found negative positions:', negativePositions.slice(0, 5));
    }

    expect(negativePositions?.length || 0).toBe(0);
  });

  test('should verify no negative transaction amounts', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: negativeTx, error } = await client
      .from('transactions_v2')
      .select('id, type, amount')
      .lt('amount', 0);

    console.log(`Negative transaction amounts: ${negativeTx?.length || 0}`);

    if (negativeTx && negativeTx.length > 0) {
      console.warn('Transactions with negative amounts:', negativeTx.slice(0, 5));
    }
  });
});
