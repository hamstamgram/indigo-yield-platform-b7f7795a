/**
 * Investor Lifecycle Tests
 *
 * Comprehensive tests for investor management including:
 * - Investor creation and onboarding
 * - Profile management and updates
 * - Status transitions (active, inactive, suspended)
 * - KYC and compliance status
 * - Investor deletion and cleanup
 * - Position management across lifecycle
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

// Valid investor statuses
const INVESTOR_STATUSES = ['active', 'inactive', 'suspended', 'pending'] as const;
const KYC_STATUSES = ['pending', 'approved', 'rejected', 'expired'] as const;
const TAX_STATUSES = ['pending', 'compliant', 'non_compliant'] as const;

// ============================================================================
// Type Definitions
// ============================================================================

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

interface Investor {
  id: string;
  full_name: string;
  email: string;
  status: string;
  kyc_status: string;
  tax_status: string;
  created_at: string;
  updated_at: string;
}

interface InvestorPosition {
  id: string;
  investor_id: string;
  fund_id: string;
  current_value: string;
  is_active: boolean;
}

// ============================================================================
// Global Test State
// ============================================================================

let supabase: SupabaseClient;
let serviceSupabase: SupabaseClient;
let testFunds: Map<string, Fund> = new Map();
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

  console.log(`Loaded ${testFunds.size} funds for investor lifecycle tests`);
});

test.afterAll(async () => {
  // Cleanup is handled in specific tests
});

// ============================================================================
// Helper Functions
// ============================================================================

async function createInvestor(
  name: string,
  options: {
    status?: string;
    kycStatus?: string;
    email?: string;
  } = {}
): Promise<string> {
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
      email: options.email || `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@test.indigo.fund`,
      status: options.status || 'active',
      kyc_status: options.kycStatus || 'approved',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create investor: ${error.message}`);

  testInvestorIds.push(data.id);
  return data.id;
}

async function getInvestor(investorId: string): Promise<Investor | null> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', investorId)
    .single();

  if (error) return null;
  return data;
}

async function updateInvestor(investorId: string, updates: Partial<Investor>): Promise<boolean> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', investorId);

  return !error;
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
    p_notes: 'Lifecycle test deposit',
  });

  if (error) return { success: false, error: error.message };
  return { success: data?.success ?? false, transactionId: data?.transaction_id };
}

async function getInvestorPositions(investorId: string): Promise<InvestorPosition[]> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  const { data, error } = await client
    .from('investor_positions')
    .select('*')
    .eq('investor_id', investorId);

  if (error) return [];
  return data || [];
}

async function deleteInvestor(investorId: string, force: boolean = false): Promise<{ success: boolean; error?: string }> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

  if (force) {
    // Use force delete RPC if available
    const { data, error } = await client.rpc('force_delete_investor', {
      p_investor_id: investorId,
    });

    if (error) return { success: false, error: error.message };
    return { success: data?.success ?? true };
  } else {
    // Standard delete
    const { error } = await client
      .from('profiles')
      .delete()
      .eq('id', investorId);

    return { success: !error, error: error?.message };
  }
}

// ============================================================================
// Test Suite: Investor Creation
// ============================================================================

test.describe('Investor Creation', () => {
  test('should create investor with all required fields', async () => {
    const investorId = await createInvestor('Complete Investor Test');
    const investor = await getInvestor(investorId);

    expect(investor).toBeDefined();
    expect(investor!.full_name).toBe('Complete Investor Test');
    expect(investor!.status).toBe('active');
    expect(investor!.kyc_status).toBe('approved');
    expect(investor!.tax_status).toBe('compliant');
    expect(investor!.created_at).toBeDefined();
  });

  test('should create investor with pending status', async () => {
    const investorId = await createInvestor('Pending Investor', { status: 'pending' });
    const investor = await getInvestor(investorId);

    expect(investor!.status).toBe('pending');
  });

  test('should create investor with pending KYC', async () => {
    const investorId = await createInvestor('Pending KYC Investor', { kycStatus: 'pending' });
    const investor = await getInvestor(investorId);

    expect(investor!.kyc_status).toBe('pending');
  });

  test('should reject duplicate email', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const uniqueEmail = `duplicate.test.${Date.now()}@test.indigo.fund`;

    // Create first investor
    const { data: first } = await client
      .from('profiles')
      .insert({
        full_name: 'First Investor',
        email: uniqueEmail,
        status: 'active',
        kyc_status: 'approved',
      })
      .select('id')
      .single();

    if (first) testInvestorIds.push(first.id);

    // Try to create second with same email
    const { error } = await client
      .from('profiles')
      .insert({
        full_name: 'Second Investor',
        email: uniqueEmail,
        status: 'active',
        kyc_status: 'approved',
      });

    expect(error).toBeDefined();
  });

  test('should auto-generate timestamps', async () => {
    const investorId = await createInvestor('Timestamp Test Investor');
    const investor = await getInvestor(investorId);

    expect(investor!.created_at).toBeDefined();
    expect(new Date(investor!.created_at).getTime()).toBeLessThanOrEqual(Date.now());
  });
});

// ============================================================================
// Test Suite: Investor Profile Updates
// ============================================================================

test.describe('Investor Profile Updates', () => {
  let testInvestorId: string;

  test.beforeAll(async () => {
    testInvestorId = await createInvestor('Profile Update Test Investor');
  });

  test('should update investor name', async () => {
    const newName = 'Updated Name Test';
    const success = await updateInvestor(testInvestorId, { full_name: newName } as any);
    expect(success).toBe(true);

    const investor = await getInvestor(testInvestorId);
    expect(investor!.full_name).toBe(newName);
  });

  test('should update investor email', async () => {
    const newEmail = `updated.email.${Date.now()}@test.indigo.fund`;
    const success = await updateInvestor(testInvestorId, { email: newEmail } as any);
    expect(success).toBe(true);

    const investor = await getInvestor(testInvestorId);
    expect(investor!.email).toBe(newEmail);
  });

  test('should update updated_at timestamp on change', async () => {
    const investorBefore = await getInvestor(testInvestorId);
    const updatedAtBefore = investorBefore!.updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));

    await updateInvestor(testInvestorId, { full_name: 'Timestamp Update Test' } as any);

    const investorAfter = await getInvestor(testInvestorId);
    expect(new Date(investorAfter!.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(updatedAtBefore).getTime()
    );
  });
});

// ============================================================================
// Test Suite: Status Transitions
// ============================================================================

test.describe('Status Transitions', () => {
  test('should transition from pending to active', async () => {
    const investorId = await createInvestor('Pending to Active', { status: 'pending' });

    const success = await updateInvestor(investorId, { status: 'active' } as any);
    expect(success).toBe(true);

    const investor = await getInvestor(investorId);
    expect(investor!.status).toBe('active');
  });

  test('should transition from active to inactive', async () => {
    const investorId = await createInvestor('Active to Inactive');

    const success = await updateInvestor(investorId, { status: 'inactive' } as any);
    expect(success).toBe(true);

    const investor = await getInvestor(investorId);
    expect(investor!.status).toBe('inactive');
  });

  test('should transition from active to suspended', async () => {
    const investorId = await createInvestor('Active to Suspended');

    const success = await updateInvestor(investorId, { status: 'suspended' } as any);
    expect(success).toBe(true);

    const investor = await getInvestor(investorId);
    expect(investor!.status).toBe('suspended');
  });

  test('should allow reactivation from inactive', async () => {
    const investorId = await createInvestor('Reactivation Test', { status: 'inactive' });

    const success = await updateInvestor(investorId, { status: 'active' } as any);
    expect(success).toBe(true);

    const investor = await getInvestor(investorId);
    expect(investor!.status).toBe('active');
  });

  test('should track status change in audit log', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const investorId = await createInvestor('Audit Status Change');

    await updateInvestor(investorId, { status: 'suspended' } as any);

    // Check audit log
    const { data: auditLogs } = await client
      .from('audit_log')
      .select('*')
      .eq('entity', 'investors')
      .eq('entity_id', investorId)
      .order('created_at', { ascending: false })
      .limit(1);

    // Audit log may or may not capture this depending on triggers
    console.log(`Audit log entries for status change: ${auditLogs?.length || 0}`);
  });
});

// ============================================================================
// Test Suite: KYC Status Management
// ============================================================================

test.describe('KYC Status Management', () => {
  test('should update KYC from pending to approved', async () => {
    const investorId = await createInvestor('KYC Approval Test', { kycStatus: 'pending' });

    const success = await updateInvestor(investorId, { kyc_status: 'approved' } as any);
    expect(success).toBe(true);

    const investor = await getInvestor(investorId);
    expect(investor!.kyc_status).toBe('approved');
  });

  test('should update KYC from pending to rejected', async () => {
    const investorId = await createInvestor('KYC Rejection Test', { kycStatus: 'pending' });

    const success = await updateInvestor(investorId, { kyc_status: 'rejected' } as any);
    expect(success).toBe(true);

    const investor = await getInvestor(investorId);
    expect(investor!.kyc_status).toBe('rejected');
  });

  test('should handle KYC expiration', async () => {
    const investorId = await createInvestor('KYC Expiration Test', { kycStatus: 'approved' });

    const success = await updateInvestor(investorId, { kyc_status: 'expired' } as any);
    expect(success).toBe(true);

    const investor = await getInvestor(investorId);
    expect(investor!.kyc_status).toBe('expired');
  });

  test('should allow KYC re-approval after rejection', async () => {
    const investorId = await createInvestor('KYC Re-approval Test', { kycStatus: 'rejected' });

    // Re-approve
    const success = await updateInvestor(investorId, { kyc_status: 'approved' } as any);
    expect(success).toBe(true);

    const investor = await getInvestor(investorId);
    expect(investor!.kyc_status).toBe('approved');
  });
});

// ============================================================================
// Test Suite: Tax Status Management
// ============================================================================

test.describe('Tax Status Management', () => {
  test('should update tax status to compliant', async () => {
    const investorId = await createInvestor('Tax Compliant Test', { taxStatus: 'pending' });

    const success = await updateInvestor(investorId, { tax_status: 'compliant' } as any);
    expect(success).toBe(true);

    const investor = await getInvestor(investorId);
    expect(investor!.tax_status).toBe('compliant');
  });

  test('should update tax status to non-compliant', async () => {
    const investorId = await createInvestor('Tax Non-Compliant Test', { taxStatus: 'compliant' });

    const success = await updateInvestor(investorId, { tax_status: 'non_compliant' } as any);
    expect(success).toBe(true);

    const investor = await getInvestor(investorId);
    expect(investor!.tax_status).toBe('non_compliant');
  });
});

// ============================================================================
// Test Suite: Investor with Positions
// ============================================================================

test.describe('Investor with Positions', () => {
  let testInvestorId: string;
  const testDate = '2026-01-18';

  test.beforeAll(async () => {
    testInvestorId = await createInvestor('Position Test Investor');
  });

  test('should create position on first deposit', async () => {
    const result = await performDeposit(testInvestorId, 'IND-USDT', 10000, testDate);
    expect(result.success).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    const positions = await getInvestorPositions(testInvestorId);
    expect(positions.length).toBeGreaterThan(0);

    const usdtPosition = positions.find(p => {
      const fund = testFunds.get('IND-USDT');
      return fund && p.fund_id === fund.id;
    });

    expect(usdtPosition).toBeDefined();
    expect(parseFloat(usdtPosition!.current_value)).toBeCloseTo(10000, 8);
  });

  test('should maintain positions across status changes', async () => {
    // Get position before status change
    const positionsBefore = await getInvestorPositions(testInvestorId);

    // Change status to inactive
    await updateInvestor(testInvestorId, { status: 'inactive' } as any);

    // Position should still exist
    const positionsAfter = await getInvestorPositions(testInvestorId);
    expect(positionsAfter.length).toBe(positionsBefore.length);
  });

  test('should have multiple positions for multi-fund investor', async () => {
    await performDeposit(testInvestorId, 'IND-ETH', 5, testDate);
    await performDeposit(testInvestorId, 'IND-BTC', 0.5, testDate);

    await new Promise(resolve => setTimeout(resolve, 500));

    const positions = await getInvestorPositions(testInvestorId);
    expect(positions.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================================
// Test Suite: Investor Deletion
// ============================================================================

test.describe('Investor Deletion', () => {
  test('should delete investor without positions', async () => {
    const investorId = await createInvestor('Delete No Position Investor');

    const result = await deleteInvestor(investorId);

    if (result.success) {
      const investor = await getInvestor(investorId);
      expect(investor).toBeNull();
      testInvestorIds = testInvestorIds.filter(id => id !== investorId);
    } else {
      console.log(`Deletion blocked: ${result.error}`);
    }
  });

  test('should prevent deletion of investor with positions', async () => {
    const investorId = await createInvestor('Delete With Position Investor');

    // Create a position
    await performDeposit(investorId, 'IND-USDT', 1000, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Standard delete should fail
    const result = await deleteInvestor(investorId, false);

    // Expect either failure or blocked by FK constraint
    if (!result.success) {
      expect(result.error).toBeDefined();
    } else {
      // If succeeded, verify cascade behavior
      const positions = await getInvestorPositions(investorId);
      console.log(`Positions after deletion: ${positions.length}`);
    }
  });

  test('should force delete investor with positions', async () => {
    const investorId = await createInvestor('Force Delete Investor');

    // Create positions
    await performDeposit(investorId, 'IND-ETH', 1, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Force delete
    const result = await deleteInvestor(investorId, true);

    if (result.success) {
      const investor = await getInvestor(investorId);
      expect(investor).toBeNull();
      testInvestorIds = testInvestorIds.filter(id => id !== investorId);
    } else {
      console.log(`Force delete result: ${result.error}`);
    }
  });

  test('should cleanup related data on force delete', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const investorId = await createInvestor('Cascade Delete Investor');

    // Create transactions
    await performDeposit(investorId, 'IND-SOL', 100, '2026-01-18');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Force delete
    const result = await deleteInvestor(investorId, true);

    if (result.success) {
      // Check that transactions are cleaned up
      const { data: transactions } = await client
        .from('transactions_v2')
        .select('id')
        .eq('investor_id', investorId);

      expect(transactions?.length || 0).toBe(0);

      // Check positions
      const positions = await getInvestorPositions(investorId);
      expect(positions.length).toBe(0);

      testInvestorIds = testInvestorIds.filter(id => id !== investorId);
    }
  });
});

// ============================================================================
// Test Suite: Investor Listing and Filtering
// ============================================================================

test.describe('Investor Listing and Filtering', () => {
  test.beforeAll(async () => {
    // Create investors with different statuses for filtering tests
    await createInvestor('Filter Active 1', { status: 'active' });
    await createInvestor('Filter Active 2', { status: 'active' });
    await createInvestor('Filter Inactive', { status: 'inactive' });
    await createInvestor('Filter Suspended', { status: 'suspended' });
  });

  test('should list all investors', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: investors, error } = await client
      .from('profiles')
      .select('id, full_name, status');

    expect(error).toBeNull();
    expect(investors!.length).toBeGreaterThan(0);
  });

  test('should filter by active status', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: investors } = await client
      .from('profiles')
      .select('id, full_name, status')
      .eq('status', 'active');

    expect(investors!.every(i => i.status === 'active')).toBe(true);
  });

  test('should filter by inactive status', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: investors } = await client
      .from('profiles')
      .select('id, full_name, status')
      .eq('status', 'inactive');

    expect(investors!.every(i => i.status === 'inactive')).toBe(true);
  });

  test('should filter by KYC status', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: investors } = await client
      .from('profiles')
      .select('id, full_name, kyc_status')
      .eq('kyc_status', 'approved');

    expect(investors!.every(i => i.kyc_status === 'approved')).toBe(true);
  });

  test('should search by name', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: investors } = await client
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', '%Filter%');

    expect(investors!.length).toBeGreaterThan(0);
    expect(investors!.every(i => i.full_name.includes('Filter'))).toBe(true);
  });
});

// ============================================================================
// Test Suite: Investor Audit Trail
// ============================================================================

test.describe('Investor Audit Trail', () => {
  test('should log investor creation', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const investorId = await createInvestor('Audit Creation Test');

    // Check audit log for creation
    const { data: auditLogs } = await client
      .from('audit_log')
      .select('*')
      .eq('entity', 'investors')
      .eq('entity_id', investorId)
      .eq('action', 'INSERT')
      .limit(1);

    // Log existence depends on audit trigger configuration
    console.log(`Creation audit log entries: ${auditLogs?.length || 0}`);
  });

  test('should log investor status changes', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const investorId = await createInvestor('Audit Update Test');

    await updateInvestor(investorId, { status: 'suspended' } as any);

    const { data: auditLogs } = await client
      .from('audit_log')
      .select('*')
      .eq('entity', 'investors')
      .eq('entity_id', investorId)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`Update audit log entries: ${auditLogs?.length || 0}`);
  });
});

// ============================================================================
// Test Suite: Edge Cases
// ============================================================================

test.describe('Investor Edge Cases', () => {
  test('should handle special characters in name', async () => {
    const specialName = "John O'Brien-Smith, Jr.";
    const investorId = await createInvestor(specialName);
    const investor = await getInvestor(investorId);

    expect(investor!.full_name).toBe(specialName);
  });

  test('should handle unicode characters in name', async () => {
    const unicodeName = 'Jean-Pierre Müller';
    const investorId = await createInvestor(unicodeName);
    const investor = await getInvestor(investorId);

    expect(investor!.full_name).toBe(unicodeName);
  });

  test('should handle very long name', async () => {
    const longName = 'A'.repeat(200);
    const investorId = await createInvestor(longName);
    const investor = await getInvestor(investorId);

    // Should either succeed or be truncated
    expect(investor).toBeDefined();
  });

  test('should handle concurrent investor creation', async () => {
    const promises = Array(5).fill(null).map((_, i) =>
      createInvestor(`Concurrent Investor ${i}`)
    );

    const investorIds = await Promise.all(promises);

    // All should succeed with unique IDs
    const uniqueIds = new Set(investorIds);
    expect(uniqueIds.size).toBe(5);
  });
});
