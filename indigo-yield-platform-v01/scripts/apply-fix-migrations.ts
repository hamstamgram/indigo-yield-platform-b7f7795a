/**
 * Apply fix migrations for test failures
 * Run with: npx tsx scripts/apply-fix-migrations.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyMigrations() {
  console.log('Starting migration application...\n');

  // ========================================
  // MIGRATION 1: Backfill Balance Chain
  // ========================================
  console.log('=== MIGRATION 1: Backfill Balance Chain ===\n');

  console.log('Executing balance chain backfill via client...');

  // Set canonical RPC flag to allow direct updates
  const { error: rpcError } = await supabase.rpc('set_canonical_rpc');
  if (rpcError) {
    console.log('Note: set_canonical_rpc returned:', rpcError.message);
  } else {
    console.log('Canonical RPC flag set successfully');
  }

  // Try to call an existing function to test connectivity
  const { data: testData, error: testError } = await supabase
    .from('transactions_v2')
    .select('id, investor_id, fund_id, balance_before, balance_after')
    .limit(1);

  if (testError) {
    console.error('Database connection error:', testError);
    return;
  }
  console.log('Database connection successful\n');

  // Get all unique investor-fund combinations
  const { data: combinations, error: combError } = await supabase
    .from('transactions_v2')
    .select('investor_id, fund_id')
    .eq('is_voided', false)
    .limit(1000);

  if (combError) {
    console.error('Error fetching combinations:', combError);
    return;
  }

  // Get unique combinations
  const uniqueCombinations = new Map<string, { investor_id: string; fund_id: string }>();
  for (const row of combinations || []) {
    const key = `${row.investor_id}:${row.fund_id}`;
    if (!uniqueCombinations.has(key)) {
      uniqueCombinations.set(key, { investor_id: row.investor_id, fund_id: row.fund_id });
    }
  }

  console.log(`Found ${uniqueCombinations.size} unique investor-fund combinations\n`);

  let totalUpdated = 0;
  const negativeTypes = ['WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT'];

  for (const [key, combo] of uniqueCombinations) {
    // Get all transactions for this combination
    const { data: transactions, error: txError } = await supabase
      .from('transactions_v2')
      .select('id, type, amount, balance_before, balance_after, tx_date, created_at')
      .eq('investor_id', combo.investor_id)
      .eq('fund_id', combo.fund_id)
      .eq('is_voided', false)
      .order('tx_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (txError || !transactions) {
      console.error(`Error fetching transactions for ${key}:`, txError);
      continue;
    }

    let runningBalance = 0;
    let updatedCount = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const expectedAfter = negativeTypes.includes(tx.type)
        ? runningBalance - Math.abs(amount)
        : runningBalance + amount;

      const needsUpdate =
        Number(tx.balance_before) !== runningBalance ||
        Number(tx.balance_after) !== expectedAfter;

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('transactions_v2')
          .update({
            balance_before: runningBalance,
            balance_after: expectedAfter
          })
          .eq('id', tx.id);

        if (updateError) {
          console.error(`Error updating transaction ${tx.id}:`, updateError);
        } else {
          updatedCount++;
          totalUpdated++;
        }
      }

      runningBalance = expectedAfter;
    }

    if (updatedCount > 0) {
      console.log(`  ${key}: Updated ${updatedCount} transactions`);
    }
  }

  console.log(`\nBalance Chain Backfill Complete: ${totalUpdated} transactions updated\n`);

  // ========================================
  // MIGRATION 2: Backfill Yield Allocation Positions
  // ========================================
  console.log('=== MIGRATION 2: Backfill Yield Allocation Positions ===\n');

  // Get all yield distributions with allocations that have position_value_at_calc = 0
  const { data: distributions, error: distError } = await supabase
    .from('yield_distributions')
    .select('id, fund_id, effective_date, opening_aum, gross_yield_amount')
    .order('effective_date', { ascending: false });

  if (distError) {
    console.error('Error fetching distributions:', distError);
    return;
  }

  console.log(`Found ${distributions?.length || 0} yield distributions\n`);

  let totalAllocationsUpdated = 0;

  for (const dist of distributions || []) {
    // Get allocations for this distribution
    const { data: allocations, error: allocError } = await supabase
      .from('yield_allocations')
      .select('id, investor_id, position_value_at_calc, ownership_pct')
      .eq('distribution_id', dist.id);

    if (allocError || !allocations || allocations.length === 0) continue;

    // Check if any need updating
    const needsBackfill = allocations.some(a =>
      a.position_value_at_calc === null ||
      Number(a.position_value_at_calc) === 0 ||
      Number(a.ownership_pct) === 0
    );

    if (!needsBackfill) continue;

    console.log(`Processing distribution ${dist.id} (${dist.effective_date})...`);

    // Calculate position values for each investor at the effective date
    let totalPositionValue = 0;
    const positionValues: Map<string, number> = new Map();

    for (const alloc of allocations) {
      // Get transactions up to effective date
      const { data: txs, error: txError } = await supabase
        .from('transactions_v2')
        .select('type, amount')
        .eq('investor_id', alloc.investor_id)
        .eq('fund_id', dist.fund_id)
        .eq('is_voided', false)
        .lte('tx_date', dist.effective_date);

      if (txError) {
        console.error(`Error fetching transactions:`, txError);
        continue;
      }

      // Calculate position value
      let positionValue = 0;
      for (const tx of txs || []) {
        const amount = Number(tx.amount);
        if (negativeTypes.includes(tx.type)) {
          positionValue -= Math.abs(amount);
        } else {
          positionValue += amount;
        }
      }

      positionValues.set(alloc.id, positionValue);
      totalPositionValue += positionValue;
    }

    // Update allocations with calculated values
    for (const alloc of allocations) {
      const positionValue = positionValues.get(alloc.id) || 0;
      const ownershipPct = totalPositionValue > 0
        ? (positionValue / totalPositionValue) * 100
        : 0;

      const needsUpdate =
        Number(alloc.position_value_at_calc) !== positionValue ||
        Math.abs(Number(alloc.ownership_pct) - ownershipPct) > 0.0001;

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('yield_allocations')
          .update({
            position_value_at_calc: positionValue,
            ownership_pct: ownershipPct
          })
          .eq('id', alloc.id);

        if (updateError) {
          console.error(`Error updating allocation ${alloc.id}:`, updateError);
        } else {
          totalAllocationsUpdated++;
        }
      }
    }

    // Update distribution's opening_aum if needed
    if (totalPositionValue > 0 && Number(dist.opening_aum) !== totalPositionValue) {
      const { error: distUpdateError } = await supabase
        .from('yield_distributions')
        .update({
          opening_aum: totalPositionValue
        })
        .eq('id', dist.id);

      if (distUpdateError) {
        console.error(`Error updating distribution opening_aum:`, distUpdateError);
      } else {
        console.log(`  Updated opening_aum: ${dist.opening_aum} -> ${totalPositionValue}`);
      }
    }
  }

  console.log(`\nYield Allocation Backfill Complete: ${totalAllocationsUpdated} allocations updated\n`);

  // ========================================
  // Summary
  // ========================================
  console.log('=== MIGRATION SUMMARY ===');
  console.log(`Balance chain transactions updated: ${totalUpdated}`);
  console.log(`Yield allocations updated: ${totalAllocationsUpdated}`);
  console.log('\nMigrations complete!');
}

applyMigrations().catch(console.error);
