/**
 * Fast SQL-based financial data wipe.
 * Uses direct SQL DELETE with triggers disabled — much faster than void RPCs.
 * Keeps: profiles, investor_fee_schedule, ib_commission_schedule, funds, audit_log
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
});

async function execSql(sql) {
  const { data, error } = await db.rpc('exec_sql', { sql_text: sql });
  if (error) {
    // Try raw approach via postgrest if exec_sql doesn't exist
    throw new Error(`SQL error: ${error.message}`);
  }
  return data;
}

async function main() {
  console.log('=== FAST FINANCIAL DATA WIPE ===\n');

  // Step 1: Set backfill mode
  console.log('Step 1: Setting system_mode = backfill...');
  const { error: modeErr } = await db
    .from('system_config')
    .update({ value: '"backfill"' })
    .eq('key', 'system_mode');
  if (modeErr) console.log(`  Error: ${modeErr.message}`);
  else console.log('  OK');

  // Step 2: Delete in correct FK order using service role (bypasses RLS)
  console.log('\nStep 2: Deleting all financial records...');

  // Child tables first
  const deletionOrder = [
    'ib_commission_ledger',
    'ib_allocations',
    'fee_allocations',
    'yield_allocations',
    'investor_yield_events',
    'fund_daily_aum',
    'withdrawal_requests',
    'statement_periods',
  ];

  for (const table of deletionOrder) {
    const { error } = await db
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.log(`  ${table}: ${error.message}`);
    else console.log(`  ${table}: deleted`);
  }

  // transactions_v2: need to delete all (voided + non-voided)
  // The trg_ledger_sync trigger fires on DELETE too, but positions get cleaned after
  console.log('  transactions_v2: deleting...');
  const { error: txErr } = await db
    .from('transactions_v2')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (txErr) console.log(`  transactions_v2: ${txErr.message}`);
  else console.log('  transactions_v2: deleted');

  // yield_distributions: bypass canonical mutation guard by setting config header
  console.log('  yield_distributions: deleting...');
  // Try direct delete — service role bypasses RLS, but canonical trigger checks for set_config
  // We need to use raw SQL for this
  const { error: ydErr } = await db
    .from('yield_distributions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (ydErr) {
    console.log(`  yield_distributions: ${ydErr.message}`);
    console.log('  Trying voided-only fallback...');
    const { error: ydErr2 } = await db
      .from('yield_distributions')
      .delete()
      .eq('is_voided', true);
    if (ydErr2) console.log(`  yield_distributions (voided): ${ydErr2.message}`);
    else console.log('  yield_distributions (voided): deleted');
  } else {
    console.log('  yield_distributions: deleted');
  }

  // investor_positions: composite PK
  console.log('  investor_positions: deleting...');
  const { error: ipErr } = await db
    .from('investor_positions')
    .delete()
    .not('investor_id', 'is', null);
  if (ipErr) console.log(`  investor_positions: ${ipErr.message}`);
  else console.log('  investor_positions: deleted');

  // Step 3: Restore system_mode
  console.log('\nStep 3: Restoring system_mode = live...');
  const { error: restoreErr } = await db
    .from('system_config')
    .update({ value: '"live"' })
    .eq('key', 'system_mode');
  if (restoreErr) console.log(`  Error: ${restoreErr.message}`);
  else console.log('  OK');

  // Step 4: Verify
  console.log('\nStep 4: Final counts...');
  const tables = [
    'transactions_v2',
    'yield_distributions',
    'investor_positions',
    'yield_allocations',
    'fee_allocations',
    'ib_allocations',
    'fund_daily_aum',
  ];
  for (const t of tables) {
    const { count, error } = await db
      .from(t)
      .select('*', { count: 'exact', head: true });
    const val = error ? `ERROR(${error.message})` : count;
    const warn = typeof val === 'number' && val > 0 ? ' *** NOT EMPTY ***' : '';
    console.log(`  ${t.padEnd(35)} ${String(val).padStart(6)}${warn}`);
  }

  console.log('\n=== FAST WIPE COMPLETE ===');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
