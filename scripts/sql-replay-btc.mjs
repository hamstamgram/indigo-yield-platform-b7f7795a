#!/usr/bin/env node
/**
 * sql-replay-btc.mjs
 *
 * Replays all 56 BTC epochs directly via Supabase SQL RPCs.
 * No browser, no Playwright — purely database operations.
 *
 * Usage:
 *   node scripts/sql-replay-btc.mjs
 *
 * Context:
 * - Fund ID: 00746a0e-6054-4474-981c-0853d5d4f9b7 (TEST BTC Yield Fund)
 * - Admin ID: a0000001-0000-0000-0000-000000000001 (TEST Jose Molla)
 * - Supabase: https://nkfimvovosdehmyyjubn.supabase.co
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIG
// ============================================================================

const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k';

const FUND_ID = '00746a0e-6054-4474-981c-0853d5d4f9b7';
const ADMIN_ID = 'a0000001-0000-0000-0000-000000000001';

// Fixed investor ID mapping from E2E test profiles
const INVESTOR_MAP = {
  'TEST Jose': 'a0000001-0000-0000-0000-000000000001',
  'TEST Kyle': 'a0000001-0000-0000-0000-000000000002',
  'TEST Matthias': 'a0000001-0000-0000-0000-000000000003',
  'TEST Thomas': 'a0000001-0000-0000-0000-000000000004',
  'TEST Danielle': 'a0000001-0000-0000-0000-000000000005',
  'TEST Family Kabbaj': 'a0000001-0000-0000-0000-000000000006',
  'TEST Victoria': 'a0000001-0000-0000-0000-000000000007',
  'TEST Nathana': 'a0000001-0000-0000-0000-000000000008',
  'TEST Blondish': 'a0000001-0000-0000-0000-000000000009',
  'TEST Oliver': 'a0000001-0000-0000-0000-000000000010',
  'TEST Paul': 'a0000001-0000-0000-0000-000000000011',
  'TEST Sam': 'a0000001-0000-0000-0000-000000000012',
  'TEST Nath': 'a0000001-0000-0000-0000-000000000013',
  'TEST Vivie': 'a0000001-0000-0000-0000-000000000014',
  'TEST NSVO': 'a0000001-0000-0000-0000-000000000016',
  'TEST ALOK': 'a0000001-0000-0000-0000-000000000017',
};

// ============================================================================
// EPOCHS DATA (from tests/e2e/yield-replay-btc.spec.ts lines 325-762)
// ============================================================================

const EPOCHS = [
  {
    date: '2024-07-01',
    closingAum: null,
    purpose: undefined,
    transactions: [{ type: 'First Investment', investor: 'TEST Jose', amount: '3.468' }],
    description: 'Fund creation — Jose Molla first investment',
  },
  {
    date: '2024-07-31',
    closingAum: '3.490000',
    purpose: 'reporting',
    transactions: [],
    description: 'Pure yield',
  },
  {
    date: '2024-08-21',
    closingAum: '3.500000',
    purpose: 'transaction',
    transactions: [{ type: 'First Investment', investor: 'TEST Kyle', amount: '2' }],
    description: 'Kyle first investment 2 BTC + yield',
  },
  {
    date: '2024-08-31',
    closingAum: '5.510000',
    purpose: 'reporting',
    transactions: [],
    description: 'Pure yield',
  },
  {
    date: '2024-09-30',
    closingAum: '21.879300',
    purpose: 'reporting',
    transactions: [
      { type: 'First Investment', investor: 'TEST Matthias', amount: '4.62' },
      { type: 'First Investment', investor: 'TEST Thomas', amount: '6.5193' },
      { type: 'First Investment', investor: 'TEST Danielle', amount: '5.2' },
    ],
    yieldAfterTx: true,
    description: 'Matthias/Thomas/Danielle first investments → reporting yield',
  },
  {
    date: '2024-10-31',
    closingAum: '21.990000',
    purpose: 'reporting',
    transactions: [],
    description: 'Pure yield',
  },
  {
    date: '2024-11-09',
    closingAum: '22.020000',
    purpose: 'transaction',
    transactions: [{ type: 'Withdrawal', investor: 'TEST Danielle', amount: '0.27' }],
    description: 'Danielle withdrawal 0.27 BTC + yield',
  },
  {
    date: '2024-11-30',
    closingAum: '21.840000',
    purpose: 'reporting',
    transactions: [],
    description: 'Pure yield',
  },
  {
    date: '2024-12-14',
    closingAum: '21.880000',
    purpose: 'transaction',
    transactions: [{ type: 'Withdrawal', investor: 'TEST Danielle', amount: '0.124' }],
    description: 'Danielle withdrawal 0.124 BTC + yield',
  },
  {
    date: '2024-12-15',
    closingAum: null,
    purpose: undefined,
    transactions: [
      { type: 'Withdrawal', investor: 'TEST Kyle', amount: '2.0336368', fullExit: true },
      { type: 'Withdrawal', investor: 'TEST Matthias', amount: '4.6717292', fullExit: true },
      { type: 'Withdrawal', investor: 'TEST Danielle', amount: '4.86277111', fullExit: true },
    ],
    description: 'No yield — Kyle/Matthias/Danielle exit to Boosted Program',
  },
  {
    date: '2024-12-31',
    closingAum: '10.240000',
    purpose: 'reporting',
    transactions: [],
    description: 'Pure yield',
  },
  {
    date: '2025-01-31',
    closingAum: '10.300000',
    purpose: 'reporting',
    transactions: [],
    description: 'Pure yield',
  },
  {
    date: '2025-02-28',
    closingAum: '10.340000',
    purpose: 'reporting',
    transactions: [],
    description: 'Pure yield',
  },
  {
    date: '2025-03-31',
    closingAum: '3.695255',
    purpose: 'reporting',
    transactions: [{ type: 'Withdrawal', investor: 'TEST Thomas', amount: '6.7249', fullExit: true }],
    yieldAfterTx: true,
    description: 'Thomas exit to TAC Program → reporting yield',
  },
  {
    date: '2025-04-16',
    closingAum: '3.705070',
    purpose: 'transaction',
    transactions: [
      { type: 'Deposit / Top-up', investor: 'TEST Kyle', amount: '2.101' },
      { type: 'Deposit / Top-up', investor: 'TEST Matthias', amount: '4.8357' },
      { type: 'Deposit / Top-up', investor: 'TEST Danielle', amount: '5.0334' },
    ],
    description: 'Kyle/Matthias/Danielle re-enter from Boosted Program + yield',
  },
  {
    date: '2025-04-30',
    closingAum: '15.820229',
    purpose: 'reporting',
    transactions: [],
    description: 'Pure yield',
  },
  {
    date: '2025-05-13',
    closingAum: '15.800025',
    purpose: 'transaction',
    transactions: [{ type: 'Withdrawal', investor: 'TEST Kyle', amount: '2.1101', fullExit: true }],
    description: 'Kyle full exit 2.1101 BTC + yield',
  },
  {
    date: '2025-05-31',
    closingAum: '13.668401',
    purpose: 'reporting',
    transactions: [{ type: 'Withdrawal', investor: 'TEST Danielle', amount: '0.13' }],
    yieldAfterTx: true,
    description: 'Danielle withdrawal 0.13 BTC → reporting yield',
  },
  {
    date: '2025-06-11',
    closingAum: '13.685321',
    purpose: 'transaction',
    transactions: [{ type: 'First Investment', investor: 'TEST Family Kabbaj', amount: '2' }],
    description: 'Kabbaj first investment 2 BTC + yield',
  },
  {
    date: '2025-06-30',
    closingAum: '15.670811',
    purpose: 'reporting',
    transactions: [],
    description: 'Pure yield',
  },
  {
    date: '2025-07-11',
    closingAum: '15.777930',
    purpose: 'transaction',
    transactions: [
      { type: 'Deposit / Top-up', investor: 'TEST Thomas', amount: '6.69' },
      { type: 'Deposit / Top-up', investor: 'TEST Family Kabbaj', amount: '0.9914' },
      { type: 'First Investment', investor: 'TEST Victoria', amount: '0.1484' },
      { type: 'First Investment', investor: 'TEST Nathana', amount: '0.446' },
      { type: 'First Investment', investor: 'TEST Blondish', amount: '4.0996' },
    ],
    description: 'Thomas re-enters + Kabbaj top-up + Victoria/Nathanael/Blondish first investments + yield',
  },
  {
    date: '2025-07-24',
    closingAum: '28.108302',
    purpose: 'transaction',
    transactions: [{ type: 'First Investment', investor: 'TEST Oliver', amount: '2.115364' }],
    description: 'Oliver first investment 2.115364 BTC + yield',
  },
  {
    date: '2025-07-25',
    closingAum: '30.219336',
    purpose: 'transaction',
    transactions: [{ type: 'Withdrawal', investor: 'TEST Danielle', amount: '0.26' }],
    description: 'Danielle withdrawal 0.26 BTC + yield',
  },
  {
    date: '2025-07-31',
    closingAum: '30.597713',
    purpose: 'reporting',
    transactions: [{ type: 'Deposit / Top-up', investor: 'TEST Family Kabbaj', amount: '0.6' }],
    yieldAfterTx: true,
    description: 'Kabbaj top-up 0.6 BTC → reporting yield',
  },
  {
    date: '2025-08-20',
    closingAum: '30.742522',
    purpose: 'transaction',
    transactions: [{ type: 'Withdrawal', investor: 'TEST Danielle', amount: '0.11' }],
    description: 'Danielle withdrawal 0.11 BTC + yield',
  },
  {
    date: '2025-08-25',
    closingAum: '30.580007',
    purpose: 'transaction',
    transactions: [{ type: 'Deposit / Top-up', investor: 'TEST Family Kabbaj', amount: '0.9102' }],
    description: 'Kabbaj top-up 0.9102 BTC + yield',
  },
  {
    date: '2025-08-31',
    closingAum: '31.504807',
    purpose: 'reporting',
    transactions: [],
    description: 'Pure yield',
  },
  {
    date: '2025-09-30',
    closingAum: '31.710384',
    purpose: 'reporting',
    transactions: [],
    description: 'Pure yield',
  },
  {
    date: '2025-10-03',
    closingAum: '31.640013',
    purpose: 'transaction',
    transactions: [{ type: 'First Investment', investor: 'TEST Paul', amount: '0.4395' }],
    description: 'Paul first investment 0.4395 BTC + yield',
  },
  {
    date: '2025-10-23',
    closingAum: '32.220702',
    purpose: 'transaction',
    transactions: [{ type: 'Deposit / Top-up', investor: 'TEST Jose', amount: '0.062' }],
    description: 'Jose top-up 0.062 BTC + yield',
  },
  {
    date: '2025-10-31',
    closingAum: '32.218002',
    purpose: 'reporting',
    transactions: [],
    description: 'Pure yield',
  },
  {
    date: '2025-11-05',
    closingAum: '32.250012',
    purpose: 'transaction',
    transactions: [
      { type: 'Withdrawal', investor: 'TEST Danielle', amount: '0.283' },
      { type: 'Withdrawal', investor: 'TEST Paul', amount: '0.4408', fullExit: true },
    ],
    description: 'Danielle withdrawal 0.283 + Paul full exit + yield',
  },
  {
    date: '2025-11-08',
    closingAum: '31.593861',
    purpose: 'transaction',
    transactions: [{ type: 'Deposit / Top-up', investor: 'TEST Jose', amount: '0.4867' }],
    description: 'Jose top-up 0.4867 BTC + yield',
  },
  {
    date: '2025-11-17',
    closingAum: '32.083317',
    purpose: 'transaction',
    transactions: [{ type: 'First Investment', investor: 'TEST Sam', amount: '3.3' }],
    description: 'Sam first investment 3.3 BTC + yield',
  },
  {
    date: '2025-11-25',
    closingAum: null,
    purpose: undefined,
    transactions: [
      { type: 'Deposit / Top-up', investor: 'TEST Jose', amount: '0.548' },
      { type: 'Deposit / Top-up', investor: 'TEST Sam', amount: '1' },
    ],
    description: 'No yield — Jose 0.548 + Sam 1 BTC top-ups',
  },
  {
    date: '2025-11-27',
    closingAum: '36.932004',
    purpose: 'transaction',
    transactions: [
      { type: 'First Investment', investor: 'TEST Nath', amount: '1' },
      { type: 'First Investment', investor: 'TEST Vivie', amount: '3.411' },
    ],
    description: 'Nath&Thomas 1 BTC + Vivie&Liana 3.411 BTC first investments + yield',
  },
  {
    date: '2025-11-30',
    closingAum: null,
    purpose: undefined,
    transactions: [{ type: 'Deposit / Top-up', investor: 'TEST Sam', amount: '1.2' }],
    description: 'No yield — Sam top-up 1.2 BTC',
  },
  {
    date: '2025-12-08',
    closingAum: '42.629056',
    purpose: 'transaction',
    transactions: [{ type: 'Deposit / Top-up', investor: 'TEST Sam', amount: '1.1' }],
    description: 'Sam top-up 1.1 BTC + yield',
  },
  {
    date: '2025-12-09',
    closingAum: '43.780057',
    purpose: 'transaction',
    transactions: [{ type: 'Deposit / Top-up', investor: 'TEST Thomas', amount: '0.657' }],
    description: 'Thomas top-up 0.657 BTC + yield',
  },
  {
    date: '2025-12-15',
    closingAum: '44.413004',
    purpose: 'transaction',
    transactions: [{ type: 'Deposit / Top-up', investor: 'TEST Sam', amount: '1.17' }],
    description: 'Sam top-up 1.17 BTC + yield',
  },
  {
    date: '2025-12-23',
    closingAum: '45.590002',
    purpose: 'transaction',
    transactions: [{ type: 'Withdrawal', investor: 'TEST Matthias', amount: '4.9896327', fullExit: true }],
    description: 'Matthias full exit + yield',
  },
  {
    date: '2025-12-31',
    closingAum: null,
    purpose: undefined,
    transactions: [],
    description: 'No yield',
  },
  {
    date: '2026-01-02',
    closingAum: null,
    purpose: undefined,
    transactions: [{ type: 'Withdrawal', investor: 'TEST Sam', amount: '7.7852', fullExit: true }],
    description: 'No yield — Sam full exit 7.7852 BTC',
  },
  {
    date: '2026-01-05',
    closingAum: '32.834707',
    purpose: 'transaction',
    transactions: [
      { type: 'Deposit / Top-up', investor: 'TEST Family Kabbaj', amount: '2.1577' },
      { type: 'Withdrawal', investor: 'TEST Vivie', amount: '3.4221', fullExit: true },
    ],
    description: 'Kabbaj 2.1577 top-up + Vivie&Liana full exit + yield',
  },
  {
    date: '2026-01-13',
    closingAum: '31.664494',
    purpose: 'transaction',
    transactions: [
      { type: 'Deposit / Top-up', investor: 'TEST Thomas', amount: '0.1135766' },
      { type: 'First Investment', investor: 'TEST NSVO', amount: '0.622' },
    ],
    description: 'NSVO 0.622 + Thomas 0.1135766 + yield',
  },
  {
    date: '2026-01-19',
    closingAum: '32.374430',
    purpose: 'transaction',
    transactions: [
      { type: 'Deposit / Top-up', investor: 'TEST Kyle', amount: '3.9998' },
      { type: 'Withdrawal', investor: 'TEST Danielle', amount: '0.12' },
    ],
    description: 'Kyle re-entry 3.9998 + Danielle -0.12 + yield',
  },
  {
    date: '2026-01-23',
    closingAum: '36.240200',
    purpose: 'transaction',
    transactions: [{ type: 'Withdrawal', investor: 'TEST Kyle', amount: '3.9998', fullExit: true }],
    description: 'Kyle full exit 3.9998 BTC + yield',
  },
  {
    date: '2026-01-30',
    closingAum: null,
    purpose: undefined,
    transactions: [{ type: 'Deposit / Top-up', investor: 'TEST Thomas', amount: '0.14207' }],
    description: 'No yield — Thomas top-up 0.14207 BTC',
  },
  {
    date: '2026-01-31',
    closingAum: '32.407932',
    purpose: 'reporting',
    transactions: [],
    description: 'Pure yield',
  },
  {
    date: '2026-02-03',
    closingAum: null,
    purpose: undefined,
    transactions: [{ type: 'Deposit / Top-up', investor: 'TEST Thomas', amount: '0.60672' }],
    description: 'No yield — Thomas top-up 0.60672 BTC',
  },
  {
    date: '2026-02-06',
    closingAum: '33.133401',
    purpose: 'transaction',
    transactions: [{ type: 'Deposit / Top-up', investor: 'TEST NSVO', amount: '0.1773' }],
    description: 'NSVO top-up 0.1773 BTC + yield',
  },
  {
    date: '2026-02-12',
    closingAum: '33.252700',
    purpose: 'transaction',
    transactions: [
      { type: 'Deposit / Top-up', investor: 'TEST Jose', amount: '2.766' },
      { type: 'First Investment', investor: 'TEST ALOK', amount: '6' },
    ],
    description: 'Jose 2.766 + ALOK 6 BTC first investment + yield',
  },
  {
    date: '2026-02-13',
    closingAum: null,
    purpose: undefined,
    transactions: [
      { type: 'Deposit / Top-up', investor: 'TEST Thomas', amount: '0.656' },
      { type: 'Withdrawal', investor: 'TEST Danielle', amount: '4.2999', fullExit: true },
    ],
    description: 'No yield — Thomas 0.656 + Danielle full exit',
  },
  {
    date: '2026-02-24',
    closingAum: '38.408509',
    purpose: 'transaction',
    transactions: [{ type: 'Deposit / Top-up', investor: 'TEST Thomas', amount: '0.15103283' }],
    description: 'Thomas top-up 0.15103283 BTC + yield',
  },
  {
    date: '2026-02-28',
    closingAum: null,
    purpose: undefined,
    transactions: [],
    description: 'No yield — end of period',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getInvestorId(investorLabel) {
  // Extract base investor name (e.g., 'TEST Jose' from 'TEST Jose Molla')
  const baseLabel = Object.keys(INVESTOR_MAP).find(
    k => investorLabel.includes(k) || k.includes(investorLabel.split(' ').slice(0, 2).join(' '))
  );

  if (baseLabel && INVESTOR_MAP[baseLabel]) {
    return INVESTOR_MAP[baseLabel];
  }

  throw new Error(`Unknown investor: ${investorLabel}`);
}

function mapTxType(typeStr) {
  // Map E2E type names to DB enum values
  if (typeStr === 'First Investment' || typeStr === 'Deposit / Top-up') {
    return 'DEPOSIT';
  }
  if (typeStr === 'Withdrawal') {
    return 'WITHDRAWAL';
  }
  throw new Error(`Unknown transaction type: ${typeStr}`);
}

async function purgeFundData() {
  console.log(`\n[PURGE] Skipped — purge via MCP SQL before running this script`);
  console.log(`[PURGE] Run: DELETE FROM ... WHERE fund_id = '${FUND_ID}'`);
}

async function applyTransaction(client, epochIdx, investorLabel, txData) {
  const investorId = getInvestorId(investorLabel);
  const txType = mapTxType(txData.type);
  let amount = parseFloat(txData.amount);
  const date = EPOCHS[epochIdx].date;

  // For full exits: use actual current balance instead of hardcoded amount
  if (txData.fullExit && txType === 'WITHDRAWAL') {
    const { data: pos } = await client
      .from('investor_positions')
      .select('current_value')
      .eq('fund_id', FUND_ID)
      .eq('investor_id', investorId)
      .single();
    if (pos && parseFloat(pos.current_value) > 0) {
      amount = parseFloat(pos.current_value);
      console.log(`  [full-exit] ${investorLabel}: using actual balance ${amount}`);
    }
  }

  const { data, error } = await client.rpc('apply_investor_transaction', {
    p_fund_id: FUND_ID,
    p_investor_id: investorId,
    p_tx_type: txType,
    p_amount: amount,
    p_tx_date: date,
    p_reference_id: `sql-replay-epoch${epochIdx + 1}-${investorLabel}`,
    p_admin_id: ADMIN_ID,
    p_notes: `SQL replay epoch ${epochIdx + 1}`,
    p_purpose: 'transaction',
    p_distribution_id: null,
  });

  if (error) {
    throw new Error(
      `apply_investor_transaction failed for epoch ${epochIdx + 1}, ` +
        `investor ${investorLabel}: ${error.message}`
    );
  }

  console.log(
    `  ✓ ${txType} ${amount} BTC from ${investorLabel} (epoch ${epochIdx + 1})`
  );
  return data;
}

async function applyYield(client, epochIdx, closingAum, purpose) {
  const date = EPOCHS[epochIdx].date;

  const { data, error } = await client.rpc('apply_segmented_yield_distribution_v5', {
    p_fund_id: FUND_ID,
    p_period_end: date,
    p_recorded_aum: parseFloat(closingAum),
    p_admin_id: ADMIN_ID,
    p_purpose: purpose || 'reporting',
  });

  if (error) {
    throw new Error(
      `apply_segmented_yield_distribution_v5 failed for epoch ${epochIdx + 1}: ${error.message}`
    );
  }

  console.log(
    `  ✓ Yield distribution: AUM=${closingAum} BTC, purpose=${purpose} (epoch ${epochIdx + 1})`
  );
  return data;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('========================================');
  console.log('BTC Yield Fund SQL Replay');
  console.log('========================================');
  console.log(`Fund ID: ${FUND_ID}`);
  console.log(`Admin ID: ${ADMIN_ID}`);
  console.log(`Total epochs: ${EPOCHS.length}`);

  try {
    // STEP 1: Purge existing data
    await purgeFundData(client);

    // STEP 2: Process each epoch
    let yieldCount = 0;
    let txCount = 0;

    for (let i = 0; i < EPOCHS.length; i++) {
      const epoch = EPOCHS[i];
      console.log(
        `\n[EPOCH ${i + 1}] ${epoch.date} — ${epoch.description}`
      );

      // If yield BEFORE transactions
      if (epoch.closingAum !== null && !epoch.yieldAfterTx) {
        await applyYield(client, i, epoch.closingAum, epoch.purpose);
        yieldCount++;
      }

      // Process all transactions
      for (const tx of epoch.transactions) {
        await applyTransaction(client, i, tx.investor, tx);
        txCount++;
      }

      // If yield AFTER transactions
      if (epoch.closingAum !== null && epoch.yieldAfterTx) {
        await applyYield(client, i, epoch.closingAum, epoch.purpose);
        yieldCount++;
      }
    }

    // STEP 3: Verification & Summary
    console.log('\n========================================');
    console.log('Replay Complete — Fetching Summary');
    console.log('========================================');

    // Fetch distributions
    const { data: distributions, error: distError } = await client
      .from('yield_distributions')
      .select('id, effective_date, closing_aum, investor_count')
      .eq('fund_id', FUND_ID)
      .order('effective_date');

    if (distError) throw new Error(`Failed to fetch distributions: ${distError.message}`);

    // Fetch transactions
    const { data: transactions, error: txError } = await client
      .from('transactions_v2')
      .select('id, tx_date, type, amount, investor_id')
      .eq('fund_id', FUND_ID)
      .order('tx_date');

    if (txError) throw new Error(`Failed to fetch transactions: ${txError.message}`);

    // Fetch positions
    const { data: positions, error: posError } = await client
      .from('investor_positions')
      .select('investor_id, current_value, cumulative_yield_earned')
      .eq('fund_id', FUND_ID);

    if (posError) throw new Error(`Failed to fetch positions: ${posError.message}`);

    console.log(`\nDistributions created: ${distributions.length}`);
    console.log(`Transactions recorded: ${transactions.length}`);
    console.log(`Active investor positions: ${positions.length}`);

    // Print sample distributions
    if (distributions.length > 0) {
      console.log('\nSample distributions (first 3):');
      for (const d of distributions.slice(0, 3)) {
        console.log(
          `  ${d.effective_date}: AUM=${d.closing_aum} BTC, investors=${d.investor_count}`
        );
      }
      console.log('  ...');
      for (const d of distributions.slice(-2)) {
        console.log(
          `  ${d.effective_date}: AUM=${d.closing_aum} BTC, investors=${d.investor_count}`
        );
      }
    }

    // Print sample transactions
    if (transactions.length > 0) {
      console.log('\nSample transactions (first 3):');
      for (const t of transactions.slice(0, 3)) {
        console.log(`  ${t.tx_date}: ${t.type} ${t.amount} BTC`);
      }
      console.log('  ...');
      for (const t of transactions.slice(-2)) {
        console.log(`  ${t.tx_date}: ${t.type} ${t.amount} BTC`);
      }
    }

    // Print sample positions
    if (positions.length > 0) {
      console.log('\nSample positions (first 3):');
      for (const p of positions.slice(0, 3)) {
        const investor = Object.entries(INVESTOR_MAP).find(
          ([_, id]) => id === p.investor_id
        );
        console.log(
          `  ${investor?.[0] || p.investor_id}: current=${p.current_value} BTC, earned=${p.cumulative_yield_earned} BTC`
        );
      }
      if (positions.length > 3) {
        console.log('  ...');
        for (const p of positions.slice(-1)) {
          const investor = Object.entries(INVESTOR_MAP).find(
            ([_, id]) => id === p.investor_id
          );
          console.log(
            `  ${investor?.[0] || p.investor_id}: current=${p.current_value} BTC, earned=${p.cumulative_yield_earned} BTC`
          );
        }
      }
    }

    console.log('\n========================================');
    console.log('✓ Replay Successful');
    console.log('========================================');
    console.log(`Epochs processed: ${EPOCHS.length}`);
    console.log(`Yield distributions: ${yieldCount}`);
    console.log(`Transactions: ${txCount}`);
    console.log(`Total DB records created: ${distributions.length + transactions.length}`);
  } catch (err) {
    console.error('\n✗ Replay Failed');
    console.error(err.message);
    process.exit(1);
  }
}

main();
