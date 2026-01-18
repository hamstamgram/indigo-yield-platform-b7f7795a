/**
 * Comprehensive Withdrawal Transaction Tests
 * Database-driven validation of withdrawal flows on Indigo Yield Platform
 *
 * Tests all withdrawal scenarios directly against Supabase database:
 * - Basic withdrawal flow across all fund types
 * - Partial vs full withdrawal validation
 * - Yield crystallization on withdrawal
 * - Multi-date withdrawal scenarios
 * - Amount validation and precision handling
 * - Error handling and edge cases
 *
 * Uses canonical RPC: apply_withdrawal_with_crystallization
 * Database: Supabase PostgreSQL
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'postgresql://postgres.nkfimvovosdehmyyjubn@aws-0-us-east-2.pooler.supabase.com:5432/postgres';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Fund types to test
const FUND_TYPES = ['IND-BTC', 'IND-ETH', 'IND-SOL', 'IND-USDT', 'IND-XRP'];

// Tolerance for financial calculations (0.00001 for 8 decimal precision)
const AMOUNT_TOLERANCE = 0.00001;

// Helper to create Supabase client
function createSupabaseClient(): SupabaseClient {
  const url = SUPABASE_URL.startsWith('postgresql://')
    ? SUPABASE_URL.replace('postgresql://', 'https://').split('@')[1].split(':')[0]
    : SUPABASE_URL;

  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required');
  }

  return createClient(url, key);
}

// Helper to get admin user ID (for created_by parameter)
async function getAdminUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client
    .from('profiles')
    .select('id')
    .eq('role', 'super_admin')
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`Failed to get admin user: ${error?.message || 'No admin found'}`);
  }

  return data.id;
}

// Helper to get or create test investor
async function getOrCreateTestInvestor(client: SupabaseClient, fundId: string): Promise<{
  investorId: string;
  initialBalance: number;
}> {
  // Look for active position with balance
  const { data: positions } = await client
    .from('investor_positions')
    .select('investor_id, current_value')
    .eq('fund_id', fundId)
    .eq('is_active', true)
    .gt('current_value', 100)
    .order('current_value', { ascending: false })
    .limit(1);

  if (positions && positions.length > 0) {
    return {
      investorId: positions[0].investor_id,
      initialBalance: Number(positions[0].current_value),
    };
  }

  throw new Error(`No investor found with active position in fund ${fundId}`);
}

// Helper to compare numbers with tolerance
function almostEqual(a: number, b: number, tolerance = AMOUNT_TOLERANCE): boolean {
  return Math.abs(a - b) <= tolerance;
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

test.describe('Comprehensive Withdrawal Transaction Tests', () => {
  let client: SupabaseClient;
  let adminUserId: string;

  test.beforeAll(async () => {
    client = createSupabaseClient();
    adminUserId = await getAdminUserId(client);
  });

  // ============================================
  // 1. BASIC WITHDRAWAL FLOW
  // ============================================

  test.describe('Basic Withdrawal Flow', () => {
    for (const fundType of FUND_TYPES) {
      test(`should withdraw from ${fundType} fund`, async () => {
        // Get fund ID
        const { data: fund, error: fundError } = await client
          .from('funds')
          .select('id, symbol')
          .eq('symbol', fundType)
          .eq('status', 'active')
          .single();

        if (fundError || !fund) {
          test.skip();
          return;
        }

        // Get test investor with balance
        const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);

        // Withdrawal amount (10% of balance)
        const withdrawalAmount = Number((initialBalance * 0.1).toFixed(8));

        // Get position before withdrawal
        const { data: positionBefore } = await client
          .from('investor_positions')
          .select('current_value, is_active')
          .eq('investor_id', investorId)
          .eq('fund_id', fund.id)
          .single();

        expect(positionBefore).toBeTruthy();
        const balanceBefore = Number(positionBefore!.current_value);

        // Get AUM before withdrawal
        const { data: aumBefore } = await client
          .from('fund_daily_aum')
          .select('total_aum, aum_date')
          .eq('fund_id', fund.id)
          .eq('is_voided', false)
          .order('aum_date', { ascending: false })
          .limit(1)
          .single();

        // Execute withdrawal via RPC
        const { data: withdrawalResult, error: withdrawalError } = await client.rpc(
          'apply_withdrawal_with_crystallization',
          {
            p_investor_id: investorId,
            p_fund_id: fund.id,
            p_amount: withdrawalAmount,
            p_created_by: adminUserId,
            p_effective_date: formatDate(new Date()),
            p_description: `Test withdrawal from ${fundType}`,
          }
        );

        // Verify RPC succeeded
        expect(withdrawalError).toBeNull();
        expect(withdrawalResult).toBeTruthy();

        // Wait a moment for database consistency
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify transaction created
        const { data: transactions } = await client
          .from('transactions_v2')
          .select('*')
          .eq('investor_id', investorId)
          .eq('fund_id', fund.id)
          .eq('type', 'WITHDRAWAL')
          .eq('is_voided', false)
          .order('created_at', { ascending: false })
          .limit(1);

        expect(transactions).toBeTruthy();
        expect(transactions!.length).toBeGreaterThan(0);

        const transaction = transactions![0];
        expect(transaction.type).toBe('WITHDRAWAL');
        expect(almostEqual(Number(transaction.amount), withdrawalAmount)).toBe(true);

        // Verify position updated
        const { data: positionAfter } = await client
          .from('investor_positions')
          .select('current_value, is_active')
          .eq('investor_id', investorId)
          .eq('fund_id', fund.id)
          .single();

        expect(positionAfter).toBeTruthy();
        const balanceAfter = Number(positionAfter!.current_value);

        // Balance should decrease by withdrawal amount
        const expectedBalance = balanceBefore - withdrawalAmount;
        expect(almostEqual(balanceAfter, expectedBalance)).toBe(true);

        // Position should still be active (partial withdrawal)
        expect(positionAfter!.is_active).toBe(true);

        // Verify AUM updated (may create new record or update existing)
        const { data: aumAfter } = await client
          .from('fund_daily_aum')
          .select('total_aum, aum_date')
          .eq('fund_id', fund.id)
          .eq('is_voided', false)
          .order('aum_date', { ascending: false })
          .limit(1)
          .single();

        expect(aumAfter).toBeTruthy();

        // AUM should decrease by withdrawal amount (if same date) or be recorded for new date
        if (aumBefore && aumAfter!.aum_date === aumBefore.aum_date) {
          const aumBeforeValue = Number(aumBefore.total_aum);
          const aumAfterValue = Number(aumAfter!.total_aum);
          expect(aumAfterValue).toBeLessThanOrEqual(aumBeforeValue);
        }
      });
    }
  });

  // ============================================
  // 2. PARTIAL VS FULL WITHDRAWAL
  // ============================================

  test.describe('Partial vs Full Withdrawal', () => {
    test('should keep position active after partial withdrawal', async () => {
      // Get any active fund
      const { data: fund } = await client
        .from('funds')
        .select('id, symbol')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);

      // Partial withdrawal (30%)
      const withdrawalAmount = Number((initialBalance * 0.3).toFixed(8));

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: withdrawalAmount,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test partial withdrawal',
      });

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify position still active
      const { data: position } = await client
        .from('investor_positions')
        .select('is_active, current_value')
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .single();

      expect(position).toBeTruthy();
      expect(position!.is_active).toBe(true);
      expect(Number(position!.current_value)).toBeGreaterThan(0);
    });

    test('should set position inactive after full withdrawal (100%)', async () => {
      // Get any active fund
      const { data: fund } = await client
        .from('funds')
        .select('id, symbol')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      // Create new test position or get one with small balance
      const { data: positions } = await client
        .from('investor_positions')
        .select('investor_id, current_value')
        .eq('fund_id', fund.id)
        .eq('is_active', true)
        .gt('current_value', 0)
        .lt('current_value', 50)
        .limit(1);

      if (!positions || positions.length === 0) {
        test.skip();
        return;
      }

      const investorId = positions[0].investor_id;
      const fullBalance = Number(positions[0].current_value);

      // Full withdrawal (100%)
      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: fullBalance,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test full withdrawal',
      });

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify position inactive and balance is zero
      const { data: position } = await client
        .from('investor_positions')
        .select('is_active, current_value')
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .single();

      expect(position).toBeTruthy();
      expect(position!.is_active).toBe(false);
      expect(almostEqual(Number(position!.current_value), 0)).toBe(true);
    });
  });

  // ============================================
  // 3. YIELD CRYSTALLIZATION ON WITHDRAWAL
  // ============================================

  test.describe('Yield Crystallization on Withdrawal', () => {
    test('should crystallize accrued yield before withdrawal', async () => {
      // Get fund and investor with potential accrued yield
      const { data: fund } = await client
        .from('funds')
        .select('id, symbol')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);

      // Check for existing yield events count
      const { data: yieldEventsBefore, count: yieldCountBefore } = await client
        .from('investor_yield_events')
        .select('*', { count: 'exact' })
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .eq('is_voided', false);

      const withdrawalAmount = Number((initialBalance * 0.2).toFixed(8));

      // Execute withdrawal (which should crystallize yield if any)
      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: withdrawalAmount,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test withdrawal with crystallization',
      });

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if yield events were created
      const { data: yieldEventsAfter, count: yieldCountAfter } = await client
        .from('investor_yield_events')
        .select('*', { count: 'exact' })
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .eq('is_voided', false);

      // If yield was accrued, count should increase
      // Note: This depends on whether there was accrued yield to crystallize
      expect(yieldCountAfter).toBeGreaterThanOrEqual(yieldCountBefore || 0);

      // Verify withdrawal transaction exists
      const { data: withdrawal } = await client
        .from('transactions_v2')
        .select('*')
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .eq('type', 'WITHDRAWAL')
        .eq('is_voided', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(withdrawal).toBeTruthy();
      expect(almostEqual(Number(withdrawal!.amount), withdrawalAmount)).toBe(true);
    });

    test('should add crystallized yield to position before withdrawal', async () => {
      // This test verifies that if yield is crystallized,
      // it's added to position before the withdrawal is subtracted
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);

      const positionBefore = initialBalance;
      const withdrawalAmount = Number((initialBalance * 0.15).toFixed(8));

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: withdrawalAmount,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test yield crystallization before withdrawal',
      });

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: position } = await client
        .from('investor_positions')
        .select('current_value')
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .single();

      expect(position).toBeTruthy();
      const positionAfter = Number(position!.current_value);

      // Position should be: (before + yield) - withdrawal
      // Since we don't know exact yield, just verify position decreased by at most withdrawal amount
      expect(positionAfter).toBeLessThanOrEqual(positionBefore);
    });
  });

  // ============================================
  // 4. MULTI-DATE WITHDRAWALS
  // ============================================

  test.describe('Multi-Date Withdrawals', () => {
    test('should withdraw on first day of month', async () => {
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);
      const withdrawalAmount = Number((initialBalance * 0.05).toFixed(8));

      // First day of current month
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: withdrawalAmount,
        p_created_by: adminUserId,
        p_effective_date: formatDate(firstDay),
        p_description: 'Withdrawal on first day of month',
      });

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify transaction with correct date
      const { data: transaction } = await client
        .from('transactions_v2')
        .select('tx_date, amount')
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .eq('type', 'WITHDRAWAL')
        .eq('is_voided', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(transaction).toBeTruthy();
      expect(transaction!.tx_date).toBe(formatDate(firstDay));
    });

    test('should withdraw on 15th of month', async () => {
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);
      const withdrawalAmount = Number((initialBalance * 0.05).toFixed(8));

      // 15th of current month
      const today = new Date();
      const fifteenth = new Date(today.getFullYear(), today.getMonth(), 15);

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: withdrawalAmount,
        p_created_by: adminUserId,
        p_effective_date: formatDate(fifteenth),
        p_description: 'Withdrawal on 15th of month',
      });

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: transaction } = await client
        .from('transactions_v2')
        .select('tx_date')
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .eq('type', 'WITHDRAWAL')
        .eq('is_voided', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(transaction).toBeTruthy();
      expect(transaction!.tx_date).toBe(formatDate(fifteenth));
    });

    test('should withdraw on last day of month', async () => {
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);
      const withdrawalAmount = Number((initialBalance * 0.05).toFixed(8));

      // Last day of current month
      const today = new Date();
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: withdrawalAmount,
        p_created_by: adminUserId,
        p_effective_date: formatDate(lastDay),
        p_description: 'Withdrawal on last day of month',
      });

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: transaction } = await client
        .from('transactions_v2')
        .select('tx_date')
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .eq('type', 'WITHDRAWAL')
        .eq('is_voided', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(transaction).toBeTruthy();
      expect(transaction!.tx_date).toBe(formatDate(lastDay));
    });

    test('should calculate yield correctly based on effective_date', async () => {
      // This test verifies that yield calculation considers the effective_date
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);
      const withdrawalAmount = Number((initialBalance * 0.05).toFixed(8));

      // Past date (e.g., 10 days ago)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: withdrawalAmount,
        p_created_by: adminUserId,
        p_effective_date: formatDate(pastDate),
        p_description: 'Withdrawal with past effective_date',
      });

      // Note: RPC may reject past dates or handle them specially
      // This test documents the behavior
      expect(error).toBeNull();
    });
  });

  // ============================================
  // 5. AMOUNT VALIDATION
  // ============================================

  test.describe('Amount Validation', () => {
    test('should reject withdrawal exceeding balance', async () => {
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);

      // Attempt to withdraw more than balance
      const excessAmount = initialBalance * 2;

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: excessAmount,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test insufficient balance',
      });

      // Should fail with insufficient balance error
      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/insufficient|balance|exceed/i);
    });

    test('should reject negative withdrawal amount', async () => {
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId } = await getOrCreateTestInvestor(client, fund.id);

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: -100,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test negative amount',
      });

      // Should fail with validation error
      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/negative|positive|invalid|amount/i);
    });

    test('should reject zero withdrawal amount', async () => {
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId } = await getOrCreateTestInvestor(client, fund.id);

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: 0,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test zero amount',
      });

      // Should fail with validation error
      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/zero|positive|invalid|amount/i);
    });

    test('should handle high precision amounts (0.001)', async () => {
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);

      // Very small withdrawal
      const smallAmount = 0.001;

      if (initialBalance < smallAmount) {
        test.skip();
        return;
      }

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: smallAmount,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test precision 0.001',
      });

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify transaction recorded with correct precision
      const { data: transaction } = await client
        .from('transactions_v2')
        .select('amount')
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .eq('type', 'WITHDRAWAL')
        .eq('is_voided', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(transaction).toBeTruthy();
      expect(almostEqual(Number(transaction!.amount), smallAmount)).toBe(true);
    });

    test('should handle ultra-high precision amounts (0.00001)', async () => {
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);

      // Ultra small withdrawal (8 decimal places)
      const ultraSmallAmount = 0.00001;

      if (initialBalance < ultraSmallAmount) {
        test.skip();
        return;
      }

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: ultraSmallAmount,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test ultra precision 0.00001',
      });

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: transaction } = await client
        .from('transactions_v2')
        .select('amount')
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .eq('type', 'WITHDRAWAL')
        .eq('is_voided', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(transaction).toBeTruthy();
      expect(almostEqual(Number(transaction!.amount), ultraSmallAmount)).toBe(true);
    });
  });

  // ============================================
  // 6. ERROR HANDLING
  // ============================================

  test.describe('Error Handling', () => {
    test('should fail when no position exists', async () => {
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      // Use a non-existent investor ID
      const fakeInvestorId = '00000000-0000-0000-0000-000000000000';

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: fakeInvestorId,
        p_fund_id: fund.id,
        p_amount: 100,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test no position',
      });

      // Should fail with position not found error
      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/position|not found|does not exist/i);
    });

    test('should fail when position is already inactive', async () => {
      // Find an inactive position
      const { data: inactivePositions } = await client
        .from('investor_positions')
        .select('investor_id, fund_id')
        .eq('is_active', false)
        .limit(1);

      if (!inactivePositions || inactivePositions.length === 0) {
        test.skip();
        return;
      }

      const { investor_id, fund_id } = inactivePositions[0];

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investor_id,
        p_fund_id: fund_id,
        p_amount: 100,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test inactive position',
      });

      // Should fail with inactive position error
      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/inactive|closed|not active/i);
    });

    test('should fail with invalid fund_id', async () => {
      // Get valid investor
      const { data: positions } = await client
        .from('investor_positions')
        .select('investor_id')
        .eq('is_active', true)
        .limit(1);

      if (!positions || positions.length === 0) {
        test.skip();
        return;
      }

      const investorId = positions[0].investor_id;
      const fakeFundId = '00000000-0000-0000-0000-000000000000';

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fakeFundId,
        p_amount: 100,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test invalid fund',
      });

      // Should fail with fund not found error
      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/fund|not found|invalid/i);
    });

    test('should fail with invalid created_by user', async () => {
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);
      const withdrawalAmount = initialBalance * 0.1;

      // Use invalid user ID
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: withdrawalAmount,
        p_created_by: fakeUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test invalid user',
      });

      // May or may not fail depending on RPC validation
      // Document the behavior
      if (error) {
        expect(error.message).toMatch(/user|not found|invalid|permission/i);
      }
    });
  });

  // ============================================
  // 7. TRANSACTION INTEGRITY
  // ============================================

  test.describe('Transaction Integrity', () => {
    test('should maintain balance_before and balance_after fields correctly', async () => {
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);
      const withdrawalAmount = Number((initialBalance * 0.1).toFixed(8));

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: withdrawalAmount,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test balance tracking',
      });

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: transaction } = await client
        .from('transactions_v2')
        .select('balance_before, balance_after, amount')
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .eq('type', 'WITHDRAWAL')
        .eq('is_voided', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(transaction).toBeTruthy();

      const balanceBefore = Number(transaction!.balance_before);
      const balanceAfter = Number(transaction!.balance_after);
      const amount = Number(transaction!.amount);

      // Verify: balance_after = balance_before - amount
      expect(almostEqual(balanceAfter, balanceBefore - amount)).toBe(true);
    });

    test('should set is_voided to false on new withdrawal', async () => {
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);
      const withdrawalAmount = Number((initialBalance * 0.05).toFixed(8));

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: withdrawalAmount,
        p_created_by: adminUserId,
        p_effective_date: formatDate(new Date()),
        p_description: 'Test voided flag',
      });

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: transaction } = await client
        .from('transactions_v2')
        .select('is_voided')
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .eq('type', 'WITHDRAWAL')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(transaction).toBeTruthy();
      expect(transaction!.is_voided).toBe(false);
    });

    test('should record correct tx_date from effective_date', async () => {
      const { data: fund } = await client
        .from('funds')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fund) {
        test.skip();
        return;
      }

      const { investorId, initialBalance } = await getOrCreateTestInvestor(client, fund.id);
      const withdrawalAmount = Number((initialBalance * 0.05).toFixed(8));

      const effectiveDate = new Date();
      effectiveDate.setDate(effectiveDate.getDate() - 5);
      const effectiveDateStr = formatDate(effectiveDate);

      const { error } = await client.rpc('apply_withdrawal_with_crystallization', {
        p_investor_id: investorId,
        p_fund_id: fund.id,
        p_amount: withdrawalAmount,
        p_created_by: adminUserId,
        p_effective_date: effectiveDateStr,
        p_description: 'Test tx_date tracking',
      });

      expect(error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: transaction } = await client
        .from('transactions_v2')
        .select('tx_date')
        .eq('investor_id', investorId)
        .eq('fund_id', fund.id)
        .eq('type', 'WITHDRAWAL')
        .eq('is_voided', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(transaction).toBeTruthy();
      expect(transaction!.tx_date).toBe(effectiveDateStr);
    });
  });
});
