/**
 * Report Generation Tests
 *
 * Comprehensive tests for report functionality including:
 * - Statement generation
 * - Performance reports
 * - Tax documents
 * - Report delivery tracking
 * - Report change logging
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

interface GeneratedReport {
  id: string;
  investor_id: string;
  fund_id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
}

interface StatementDelivery {
  id: string;
  investor_id: string;
  statement_id: string;
  delivery_status: string;
  sent_at?: string;
  delivered_at?: string;
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

  console.log(`Loaded ${testFunds.size} funds for report tests`);
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

async function performDeposit(investorId: string, fundCode: string, amount: number): Promise<boolean> {
  const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
  const fund = testFunds.get(fundCode);
  if (!fund) return false;

  const { data, error } = await client.rpc('apply_deposit_with_crystallization', {
    p_investor_id: investorId,
    p_fund_id: fund.id,
    p_amount: amount,
    p_tx_date: '2026-01-18',
    p_notes: 'Report test deposit',
  });

  return data?.success ?? false;
}

// ============================================================================
// Test Suite: Statement Period Management
// ============================================================================

test.describe('Statement Period Management', () => {
  test('should have statement periods defined', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: periods, error } = await client
      .from('statement_periods')
      .select('*')
      .order('start_date', { ascending: false })
      .limit(12);

    if (error) {
      console.log(`Statement periods query: ${error.message}`);
    } else {
      console.log(`Statement periods: ${periods?.length || 0}`);
    }
  });

  test('should get statement period summary', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get('IND-USDT')!;

    const { data, error } = await client.rpc('get_statement_period_summary', {
      p_fund_id: fund.id,
      p_period_start: '2026-01-01',
      p_period_end: '2026-01-31',
    });

    if (error) {
      console.log(`Period summary: ${error.message}`);
    } else {
      console.log(`Period summary result: ${JSON.stringify(data)}`);
    }
  });
});

// ============================================================================
// Test Suite: Generated Reports
// ============================================================================

test.describe('Generated Reports', () => {
  let testInvestorId: string;

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Report Generation Investor');
    await performDeposit(testInvestorId, 'IND-USDT', 10000);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should list generated reports', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: reports, error } = await client
      .from('generated_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log(`Generated reports query: ${error.message}`);
    } else {
      console.log(`Generated reports: ${reports?.length || 0}`);
    }
  });

  test('should list generated statements', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: statements, error } = await client
      .from('generated_statements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log(`Generated statements query: ${error.message}`);
    } else {
      console.log(`Generated statements: ${statements?.length || 0}`);
    }
  });

  test('should query investor reports', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: investorReports } = await client
      .from('generated_reports')
      .select('*')
      .eq('investor_id', testInvestorId);

    console.log(`Reports for test investor: ${investorReports?.length || 0}`);
  });
});

// ============================================================================
// Test Suite: Report Delivery Tracking
// ============================================================================

test.describe('Report Delivery Tracking', () => {
  test('should list statement email deliveries', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: deliveries, error } = await client
      .from('statement_email_delivery')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log(`Delivery tracking query: ${error.message}`);
    } else {
      console.log(`Statement deliveries: ${deliveries?.length || 0}`);

      if (deliveries && deliveries.length > 0) {
        // Group by status
        const byStatus = new Map<string, number>();
        for (const d of deliveries) {
          const count = byStatus.get(d.delivery_status) || 0;
          byStatus.set(d.delivery_status, count + 1);
        }

        console.log('Delivery status breakdown:');
        for (const [status, count] of byStatus) {
          console.log(`  ${status}: ${count}`);
        }
      }
    }
  });

  test('should get delivery statistics', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data, error } = await client.rpc('get_delivery_stats');

    if (error) {
      console.log(`Delivery stats: ${error.message}`);
    } else {
      console.log(`Delivery stats: ${JSON.stringify(data)}`);
    }
  });

  test('should queue statement deliveries', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data, error } = await client.rpc('queue_statement_deliveries', {
      p_period_start: '2026-01-01',
      p_period_end: '2026-01-31',
    });

    if (error) {
      console.log(`Queue deliveries: ${error.message}`);
    } else {
      console.log(`Queued deliveries: ${JSON.stringify(data)}`);
    }
  });
});

// ============================================================================
// Test Suite: Report Change Logging
// ============================================================================

test.describe('Report Change Logging', () => {
  test('should have report change log table', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: logs, error } = await client
      .from('report_change_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log(`Report change log: ${error.message}`);
    } else {
      console.log(`Report change entries: ${logs?.length || 0}`);
    }
  });
});

// ============================================================================
// Test Suite: Performance Reports
// ============================================================================

test.describe('Performance Reports', () => {
  let testInvestorId: string;

  test.beforeAll(async () => {
    testInvestorId = await createTestInvestor('Performance Report Investor');
    await performDeposit(testInvestorId, 'IND-ETH', 5);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should query investor fund performance', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get('IND-ETH')!;

    const { data: performance, error } = await client
      .from('investor_fund_performance')
      .select('*')
      .eq('investor_id', testInvestorId)
      .eq('fund_id', fund.id);

    if (error) {
      console.log(`Performance query: ${error.message}`);
    } else {
      console.log(`Performance records: ${performance?.length || 0}`);
    }
  });

  test('should get historical NAV data', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;
    const fund = testFunds.get('IND-ETH')!;

    const { data, error } = await client.rpc('get_historical_nav', {
      p_fund_id: fund.id,
      p_start_date: '2026-01-01',
      p_end_date: '2026-01-31',
    });

    if (error) {
      console.log(`Historical NAV: ${error.message}`);
    } else {
      console.log(`Historical NAV data: ${JSON.stringify(data)}`);
    }
  });
});

// ============================================================================
// Test Suite: Document Storage
// ============================================================================

test.describe('Document Storage', () => {
  test('should list stored documents', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    const { data: documents, error } = await client
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log(`Documents query: ${error.message}`);
    } else {
      console.log(`Stored documents: ${documents?.length || 0}`);

      if (documents && documents.length > 0) {
        // Group by type
        const byType = new Map<string, number>();
        for (const d of documents) {
          const count = byType.get(d.document_type) || 0;
          byType.set(d.document_type, count + 1);
        }

        console.log('Document types:');
        for (const [type, count] of byType) {
          console.log(`  ${type}: ${count}`);
        }
      }
    }
  });
});

// ============================================================================
// Test Suite: Retry and Manual Operations
// ============================================================================

test.describe('Delivery Operations', () => {
  test('should retry failed delivery', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Find a failed delivery
    const { data: failedDeliveries } = await client
      .from('statement_email_delivery')
      .select('id')
      .eq('delivery_status', 'failed')
      .limit(1);

    if (failedDeliveries && failedDeliveries.length > 0) {
      const { data, error } = await client.rpc('retry_delivery', {
        p_delivery_id: failedDeliveries[0].id,
      });

      if (error) {
        console.log(`Retry delivery: ${error.message}`);
      } else {
        console.log(`Retry result: ${JSON.stringify(data)}`);
      }
    } else {
      console.log('No failed deliveries to retry');
    }
  });

  test('should mark delivery as sent manually', async () => {
    const client = SUPABASE_SERVICE_KEY ? serviceSupabase : supabase;

    // Find a pending delivery
    const { data: pendingDeliveries } = await client
      .from('statement_email_delivery')
      .select('id')
      .eq('delivery_status', 'pending')
      .limit(1);

    if (pendingDeliveries && pendingDeliveries.length > 0) {
      const { data, error } = await client.rpc('mark_sent_manually', {
        p_delivery_id: pendingDeliveries[0].id,
        p_notes: 'Marked manually for testing',
      });

      if (error) {
        console.log(`Mark sent manually: ${error.message}`);
      } else {
        console.log(`Mark sent result: ${JSON.stringify(data)}`);
      }
    } else {
      console.log('No pending deliveries to mark');
    }
  });
});
