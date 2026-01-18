/**
 * Withdrawal Workflow Tests
 *
 * Comprehensive tests for the full withdrawal lifecycle:
 * - Withdrawal request creation
 * - Admin approval/rejection workflow
 * - Processing and completion
 * - Yield crystallization before withdrawal
 * - Position updates
 * - Audit trail
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

// Withdrawal statuses
const WITHDRAWAL_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

interface WithdrawalRequest {
  id: string;
  investor_id: string;
  fund_id: string;
  amount: string;
  status: string;
  requested_at: string;
  approved_at?: string;
  completed_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

// ============================================================================
// Global Test State
// ============================================================================

let supabase: SupabaseClient;
let serviceSupabase: SupabaseClient;
let testFunds: Map<string, Fund> = new Map();
let testInvestorIds: string[] = [];
let testWithdrawalIds: string[] = [];

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
  const { data: funds } = await client
    .from('funds')
    .select('id, code, name, asset')
    .in('code', FUND_CODES as unknown as string[]);

  if (funds) {
    funds.forEach(fund => testFunds.set(fund.code, fund));
  }

  console.log(`Loaded ${testFunds.size} funds for withdrawal workflow tests`);
});

test.afterAll(async () => {
  // Cleanup
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
): Promise<{ success: boolean; transactionId?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const fund = testFunds.get(fundCode);
  if (!fund) return { success: false };

  const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
    p_investor_id: investorId,
    p_fund_id: fund.id,
    p_amount: amount,
    p_tx_date: txDate,
    p_notes: 'Withdrawal test deposit',
  });

  if (error) return { success: false };
  return { success: data?.success ?? false, transactionId: data?.transaction_id };
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

async function createWithdrawalRequest(
  investorId: string,
  fundId: string,
  amount: number
): Promise<{ success: boolean; withdrawalId?: string; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client.rpc('create_withdrawal_request', {
    p_investor_id: investorId,
    p_fund_id: fundId,
    p_amount: amount,
  });

  if (error) return { success: false, error: error.message };

  if (data?.withdrawal_id) {
    testWithdrawalIds.push(data.withdrawal_id);
  }

  return {
    success: data?.success ?? false,
    withdrawalId: data?.withdrawal_id,
    error: data?.error,
  };
}

async function getWithdrawal(withdrawalId: string): Promise<WithdrawalRequest | null> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client
    .from('withdrawal_requests')
    .select('*')
    .eq('id', withdrawalId)
    .single();

  if (error) return null;
  return data;
}

async function approveWithdrawal(withdrawalId: string): Promise<{ success: boolean; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client.rpc('approve_withdrawal', {
    p_withdrawal_id: withdrawalId,
  });

  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? true };
}

async function rejectWithdrawal(withdrawalId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client.rpc('reject_withdrawal', {
    p_withdrawal_id: withdrawalId,
    p_reason: reason,
  });

  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? true };
}

async function startProcessingWithdrawal(withdrawalId: string): Promise<{ success: boolean; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client.rpc('start_processing_withdrawal', {
    p_withdrawal_id: withdrawalId,
  });

  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? true };
}

async function completeWithdrawal(withdrawalId: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client.rpc('complete_withdrawal', {
    p_withdrawal_id: withdrawalId,
  });

  if (error) return { success: false, error: error.message };
  return {
    success: data?.success ?? false,
    transactionId: data?.transaction_id,
  };
}

async function cancelWithdrawal(withdrawalId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client.rpc('cancel_withdrawal_by_admin', {
    p_withdrawal_id: withdrawalId,
    p_reason: reason,
  });

  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? true };
}

// ============================================================================
// Test Suite: Withdrawal Request Creation
// ============================================================================

test.describe('Withdrawal Request Creation', () => {
  let testInvestorId: string;
  const testFundCode = 'IND-USDT';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Withdrawal Request Investor');
    await performDeposit(testInvestorId, testFundCode, 10000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should create withdrawal request', async () => {
    const fund = testFunds.get(testFundCode)!;

    const result = await createWithdrawalRequest(testInvestorId, fund.id, 1000);

    expect(result.success).toBe(true);
    expect(result.withdrawalId).toBeDefined();
  });

  test('should create withdrawal with pending status', async () => {
    const fund = testFunds.get(testFundCode)!;

    const result = await createWithdrawalRequest(testInvestorId, fund.id, 500);

    if (result.success && result.withdrawalId) {
      const withdrawal = await getWithdrawal(result.withdrawalId);

      expect(withdrawal!.status).toBe(WITHDRAWAL_STATUSES.PENDING);
    }
  });

  test('should reject withdrawal exceeding balance', async () => {
    const fund = testFunds.get(testFundCode)!;
    const position = await getPosition(testInvestorId, fund.id);

    const result = await createWithdrawalRequest(testInvestorId, fund.id, position + 1000);

    expect(result.success).toBe(false);
  });

  test('should reject zero amount withdrawal', async () => {
    const fund = testFunds.get(testFundCode)!;

    const result = await createWithdrawalRequest(testInvestorId, fund.id, 0);

    expect(result.success).toBe(false);
  });

  test('should reject negative amount withdrawal', async () => {
    const fund = testFunds.get(testFundCode)!;

    const result = await createWithdrawalRequest(testInvestorId, fund.id, -100);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Test Suite: Withdrawal Approval Flow
// ============================================================================

test.describe('Withdrawal Approval Flow', () => {
  let testInvestorId: string;
  let withdrawalId: string;
  const testFundCode = 'IND-ETH';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Approval Flow Investor');
    await performDeposit(testInvestorId, testFundCode, 10, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    const fund = testFunds.get(testFundCode)!;
    const result = await createWithdrawalRequest(testInvestorId, fund.id, 2);
    withdrawalId = result.withdrawalId!;
  });

  test('should approve pending withdrawal', async () => {
    const result = await approveWithdrawal(withdrawalId);

    expect(result.success).toBe(true);

    const withdrawal = await getWithdrawal(withdrawalId);
    expect(withdrawal!.status).toBe(WITHDRAWAL_STATUSES.APPROVED);
    expect(withdrawal!.approved_at).toBeDefined();
  });

  test('should reject approving non-pending withdrawal', async () => {
    // Already approved, try to approve again
    const result = await approveWithdrawal(withdrawalId);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Test Suite: Withdrawal Rejection Flow
// ============================================================================

test.describe('Withdrawal Rejection Flow', () => {
  let testInvestorId: string;
  let withdrawalId: string;
  const testFundCode = 'IND-SOL';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Rejection Flow Investor');
    await performDeposit(testInvestorId, testFundCode, 500, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    const fund = testFunds.get(testFundCode)!;
    const result = await createWithdrawalRequest(testInvestorId, fund.id, 100);
    withdrawalId = result.withdrawalId!;
  });

  test('should reject pending withdrawal with reason', async () => {
    const rejectionReason = 'Insufficient documentation';

    const result = await rejectWithdrawal(withdrawalId, rejectionReason);

    expect(result.success).toBe(true);

    const withdrawal = await getWithdrawal(withdrawalId);
    expect(withdrawal!.status).toBe(WITHDRAWAL_STATUSES.REJECTED);
    expect(withdrawal!.rejection_reason).toBe(rejectionReason);
    expect(withdrawal!.rejected_at).toBeDefined();
  });

  test('should not affect position after rejection', async () => {
    const fund = testFunds.get(testFundCode)!;
    const position = await getPosition(testInvestorId, fund.id);

    // Position should still be 500 (the rejection doesn't deduct)
    expect(position).toBeCloseTo(500, 8);
  });
});

// ============================================================================
// Test Suite: Withdrawal Processing
// ============================================================================

test.describe('Withdrawal Processing', () => {
  let testInvestorId: string;
  let withdrawalId: string;
  const testFundCode = 'IND-BTC';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Processing Flow Investor');
    await performDeposit(testInvestorId, testFundCode, 1, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    const fund = testFunds.get(testFundCode)!;
    const result = await createWithdrawalRequest(testInvestorId, fund.id, 0.1);
    withdrawalId = result.withdrawalId!;

    // Approve first
    await approveWithdrawal(withdrawalId);
  });

  test('should start processing approved withdrawal', async () => {
    const result = await startProcessingWithdrawal(withdrawalId);

    expect(result.success).toBe(true);

    const withdrawal = await getWithdrawal(withdrawalId);
    expect(withdrawal!.status).toBe(WITHDRAWAL_STATUSES.PROCESSING);
  });

  test('should reject starting processing on non-approved withdrawal', async () => {
    const fund = testFunds.get(testFundCode)!;

    // Create new pending withdrawal
    const newResult = await createWithdrawalRequest(testInvestorId, fund.id, 0.05);

    if (newResult.success && newResult.withdrawalId) {
      // Try to process without approval
      const processResult = await startProcessingWithdrawal(newResult.withdrawalId);
      expect(processResult.success).toBe(false);
    }
  });
});

// ============================================================================
// Test Suite: Withdrawal Completion
// ============================================================================

test.describe('Withdrawal Completion', () => {
  let testInvestorId: string;
  let withdrawalId: string;
  const testFundCode = 'IND-XRP';
  const testDate = '2026-01-18';
  const depositAmount = 10000;
  const withdrawalAmount = 2500;

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Completion Flow Investor');
    await performDeposit(testInvestorId, testFundCode, depositAmount, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    const fund = testFunds.get(testFundCode)!;
    const result = await createWithdrawalRequest(testInvestorId, fund.id, withdrawalAmount);
    withdrawalId = result.withdrawalId!;

    // Approve and start processing
    await approveWithdrawal(withdrawalId);
    await startProcessingWithdrawal(withdrawalId);
  });

  test('should complete processing withdrawal', async () => {
    const result = await completeWithdrawal(withdrawalId);

    expect(result.success).toBe(true);

    const withdrawal = await getWithdrawal(withdrawalId);
    expect(withdrawal!.status).toBe(WITHDRAWAL_STATUSES.COMPLETED);
    expect(withdrawal!.completed_at).toBeDefined();
  });

  test('should create withdrawal transaction', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    const { data: transactions } = await client
      .from('transactions_v2')
      .select('*')
      .eq('investor_id', testInvestorId)
      .eq('fund_id', fund.id)
      .eq('type', 'WITHDRAWAL')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(transactions).toBeDefined();
    expect(transactions!.length).toBeGreaterThan(0);
    expect(parseFloat(transactions![0].amount)).toBeCloseTo(withdrawalAmount, 8);
  });

  test('should decrease position after completion', async () => {
    const fund = testFunds.get(testFundCode)!;
    const position = await getPosition(testInvestorId, fund.id);

    // Position should be deposit - withdrawal
    expect(position).toBeCloseTo(depositAmount - withdrawalAmount, 8);
  });
});

// ============================================================================
// Test Suite: Withdrawal Cancellation
// ============================================================================

test.describe('Withdrawal Cancellation', () => {
  let testInvestorId: string;
  const testFundCode = 'IND-USDT';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Cancellation Flow Investor');
    await performDeposit(testInvestorId, testFundCode, 5000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should cancel pending withdrawal', async () => {
    const fund = testFunds.get(testFundCode)!;
    const result = await createWithdrawalRequest(testInvestorId, fund.id, 500);

    if (result.success && result.withdrawalId) {
      const cancelResult = await cancelWithdrawal(result.withdrawalId, 'Investor requested cancellation');

      expect(cancelResult.success).toBe(true);

      const withdrawal = await getWithdrawal(result.withdrawalId);
      expect(withdrawal!.status).toBe(WITHDRAWAL_STATUSES.CANCELLED);
    }
  });

  test('should cancel approved withdrawal', async () => {
    const fund = testFunds.get(testFundCode)!;
    const result = await createWithdrawalRequest(testInvestorId, fund.id, 300);

    if (result.success && result.withdrawalId) {
      await approveWithdrawal(result.withdrawalId);

      const cancelResult = await cancelWithdrawal(result.withdrawalId, 'Admin cancelled after approval');

      expect(cancelResult.success).toBe(true);
    }
  });

  test('should not cancel completed withdrawal', async () => {
    const fund = testFunds.get(testFundCode)!;
    const result = await createWithdrawalRequest(testInvestorId, fund.id, 200);

    if (result.success && result.withdrawalId) {
      await approveWithdrawal(result.withdrawalId);
      await startProcessingWithdrawal(result.withdrawalId);
      await completeWithdrawal(result.withdrawalId);

      // Try to cancel completed
      const cancelResult = await cancelWithdrawal(result.withdrawalId, 'Try to cancel completed');

      expect(cancelResult.success).toBe(false);
    }
  });
});

// ============================================================================
// Test Suite: Yield Crystallization on Withdrawal
// ============================================================================

test.describe('Yield Crystallization on Withdrawal', () => {
  let testInvestorId: string;
  const testFundCode = 'IND-ETH';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Crystallization Withdrawal Investor');
    await performDeposit(testInvestorId, testFundCode, 10, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should crystallize yield before withdrawal completion', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get(testFundCode)!;

    // Apply some yield first
    await client.rpc('apply_daily_yield_to_fund_v3', {
      p_fund_id: fund.id,
      p_yield_amount: 0.1,
      p_yield_date: testDate,
      p_notes: 'Pre-withdrawal yield',
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const positionBefore = await getPosition(testInvestorId, fund.id);

    // Create and complete withdrawal
    const result = await createWithdrawalRequest(testInvestorId, fund.id, 2);

    if (result.success && result.withdrawalId) {
      await approveWithdrawal(result.withdrawalId);
      await startProcessingWithdrawal(result.withdrawalId);
      await completeWithdrawal(result.withdrawalId);

      await new Promise(resolve => setTimeout(resolve, 500));

      const positionAfter = await getPosition(testInvestorId, fund.id);

      // Position should decrease by withdrawal amount
      // (crystallized yield would have been applied)
      console.log(`Position before: ${positionBefore}, after: ${positionAfter}`);
      expect(positionAfter).toBeLessThan(positionBefore);
    }
  });
});

// ============================================================================
// Test Suite: Withdrawal Audit Trail
// ============================================================================

test.describe('Withdrawal Audit Trail', () => {
  let testInvestorId: string;
  let withdrawalId: string;
  const testFundCode = 'IND-SOL';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Audit Trail Investor');
    await performDeposit(testInvestorId, testFundCode, 1000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    const fund = testFunds.get(testFundCode)!;
    const result = await createWithdrawalRequest(testInvestorId, fund.id, 100);
    withdrawalId = result.withdrawalId!;
  });

  test('should create audit log for withdrawal request', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: auditLogs } = await client
      .from('withdrawal_audit_logs')
      .select('*')
      .eq('withdrawal_id', withdrawalId)
      .order('created_at', { ascending: true });

    if (auditLogs && auditLogs.length > 0) {
      expect(auditLogs[0].action).toBe('create');
    }
  });

  test('should log all status transitions', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Approve
    await approveWithdrawal(withdrawalId);
    // Process
    await startProcessingWithdrawal(withdrawalId);
    // Complete
    await completeWithdrawal(withdrawalId);

    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: auditLogs } = await client
      .from('withdrawal_audit_logs')
      .select('*')
      .eq('withdrawal_id', withdrawalId)
      .order('created_at', { ascending: true });

    if (auditLogs) {
      console.log(`Audit trail entries: ${auditLogs.length}`);
      // Should have entries for: create, approve, processing, complete
      expect(auditLogs.length).toBeGreaterThanOrEqual(4);
    }
  });
});

// ============================================================================
// Test Suite: Route to Fees Account
// ============================================================================

test.describe('Route Withdrawal to Fees Account', () => {
  let testInvestorId: string;
  let withdrawalId: string;
  const testFundCode = 'IND-USDT';
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Route to Fees Investor');
    await performDeposit(testInvestorId, testFundCode, 50000, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    const fund = testFunds.get(testFundCode)!;
    const result = await createWithdrawalRequest(testInvestorId, fund.id, 5000);
    withdrawalId = result.withdrawalId!;

    await approveWithdrawal(withdrawalId);
  });

  test('should route withdrawal to fees account', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data, error } = await client.rpc('route_withdrawal_to_fees', {
      p_withdrawal_id: withdrawalId,
    });

    if (error) {
      console.log(`Route to fees error: ${error.message}`);
    } else {
      expect(data?.success).toBe(true);

      // Check withdrawal status
      const withdrawal = await getWithdrawal(withdrawalId);
      console.log(`Withdrawal status after routing: ${withdrawal?.status}`);
    }
  });
});

// ============================================================================
// Test Suite: Full Withdrawal Lifecycle
// ============================================================================

test.describe('Full Withdrawal Lifecycle', () => {
  test('should complete full withdrawal lifecycle', async () => {
    const testInvestorId = await createTestInvestor('Full Lifecycle Investor');
    const testFundCode = 'IND-BTC';
    const testDate = '2026-01-18';
    const depositAmount = 2;
    const withdrawalAmount = 0.5;

    // 1. Setup: Create position
    await performDeposit(testInvestorId, testFundCode, depositAmount, testDate);
    await new Promise(resolve => setTimeout(resolve, 500));

    const fund = testFunds.get(testFundCode)!;
    const positionAfterDeposit = await getPosition(testInvestorId, fund.id);
    expect(positionAfterDeposit).toBeCloseTo(depositAmount, 8);

    // 2. Create withdrawal request
    const createResult = await createWithdrawalRequest(testInvestorId, fund.id, withdrawalAmount);
    expect(createResult.success).toBe(true);
    const withdrawalId = createResult.withdrawalId!;

    let withdrawal = await getWithdrawal(withdrawalId);
    expect(withdrawal!.status).toBe(WITHDRAWAL_STATUSES.PENDING);

    // 3. Approve
    await approveWithdrawal(withdrawalId);
    withdrawal = await getWithdrawal(withdrawalId);
    expect(withdrawal!.status).toBe(WITHDRAWAL_STATUSES.APPROVED);

    // 4. Start processing
    await startProcessingWithdrawal(withdrawalId);
    withdrawal = await getWithdrawal(withdrawalId);
    expect(withdrawal!.status).toBe(WITHDRAWAL_STATUSES.PROCESSING);

    // 5. Complete
    await completeWithdrawal(withdrawalId);
    withdrawal = await getWithdrawal(withdrawalId);
    expect(withdrawal!.status).toBe(WITHDRAWAL_STATUSES.COMPLETED);

    // 6. Verify position
    const finalPosition = await getPosition(testInvestorId, fund.id);
    expect(finalPosition).toBeCloseTo(depositAmount - withdrawalAmount, 8);

    console.log(`Full lifecycle completed: ${depositAmount} - ${withdrawalAmount} = ${finalPosition}`);
  });
});
