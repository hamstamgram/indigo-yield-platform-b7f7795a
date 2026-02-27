/**
 * Full financial data wipe script.
 * Keeps: profiles, investor_fee_schedule, ib_commission_schedule
 * Wipes: all transaction, position, yield, allocation, and AUM data
 *
 * Uses:
 * - Authenticated admin client for RPCs (void_transaction, void_yield_distribution)
 * - Service role client for direct table reads/deletes
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k';

const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

// Batch concurrent RPCs to avoid flooding the DB
async function batchedRpc(items, fn, batchSize = 1) {
  let done = 0;
  let errors = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(fn));
    for (const r of results) {
      if (r.status === 'fulfilled') done++;
      else { errors++; console.log('    Error:', r.reason); }
    }
    process.stdout.write(`\r    Progress: ${Math.min(i + batchSize, items.length)}/${items.length} (${errors} errors)   `);
  }
  console.log();
  return { done, errors };
}

async function directDelete(table, filter = {}) {
  let q = serviceClient.from(table).delete();
  // Always need at least one filter for PostgREST DELETE — use a universal one
  // (is_voided if exists, else investor_id/id neq impossibleUUID)
  q = q.neq('id', '00000000-0000-0000-0000-000000000000');
  const { error, count } = await q;
  if (error) {
    console.log(`  ${table}: DELETE error — ${error.message}`);
    return false;
  }
  console.log(`  ${table}: deleted`);
  return true;
}

async function directDeleteByInvestorId(table) {
  const { error } = await serviceClient
    .from(table)
    .delete()
    .not('investor_id', 'is', null);
  if (error) {
    console.log(`  ${table}: DELETE error — ${error.message}`);
    return false;
  }
  console.log(`  ${table}: deleted`);
  return true;
}

async function countRows(table) {
  const { count, error } = await serviceClient
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) return `ERROR(${error.message})`;
  return count;
}

async function main() {
  console.log('=== FULL FINANCIAL DATA WIPE ===\n');

  // ── Step 0: Sign in as admin ──────────────────────────────────────────────
  console.log('Step 0: Authenticating as admin...');
  const { data: authData, error: authErr } = await anonClient.auth.signInWithPassword({
    email: 'adriel@indigo.fund',
    password: 'TestAdmin2026!',
  });
  if (authErr) {
    console.error('Auth failed:', authErr.message);
    process.exit(1);
  }
  const ADMIN_ID = authData.user.id;
  console.log(`  Signed in as ${authData.user.email} (${ADMIN_ID})\n`);

  // ── Step 1: Set system_mode = backfill ───────────────────────────────────
  console.log('Step 1: Setting system_mode = backfill...');
  const { error: modeErr } = await serviceClient
    .from('system_config')
    .update({ value: '"backfill"' })
    .eq('key', 'system_mode');
  if (modeErr) console.log(`  Note: ${modeErr.message}`);
  else console.log('  OK\n');

  // ── Step 2: Fetch and void all non-voided yield distributions ─────────────
  console.log('Step 2: Voiding yield distributions...');
  const { data: allYds, error: ydsErr } = await serviceClient
    .from('yield_distributions')
    .select('id, status')
    .eq('is_voided', false);
  if (ydsErr) {
    console.error('  Fetch error:', ydsErr.message);
  } else {
    console.log(`  Found ${allYds.length} non-voided yield distributions`);
    if (allYds.length > 0) {
      await batchedRpc(allYds, async (yd) => {
        const { error } = await anonClient.rpc('void_yield_distribution', {
          p_admin_id: ADMIN_ID,
          p_distribution_id: yd.id,
          p_reason: 'full wipe',
          p_void_crystals: true,
        });
        if (error) throw new Error(`${yd.id}: ${error.message}`);
      });
    }
  }
  console.log();

  // ── Step 3: Void all remaining non-voided transactions ───────────────────
  console.log('Step 3: Voiding transactions...');
  const { data: allTxs, error: txsErr } = await serviceClient
    .from('transactions_v2')
    .select('id, type, amount')
    .eq('is_voided', false);
  if (txsErr) {
    console.error('  Fetch error:', txsErr.message);
  } else {
    console.log(`  Found ${allTxs.length} non-voided transactions`);
    if (allTxs.length > 0) {
      await batchedRpc(allTxs, async (tx) => {
        const { error } = await anonClient.rpc('void_transaction', {
          p_admin_id: ADMIN_ID,
          p_transaction_id: tx.id,
          p_reason: 'full wipe',
        });
        if (error) throw new Error(`${tx.id}(${tx.type}): ${error.message}`);
      });
    }
  }
  console.log();

  // ── Step 4: Delete voided records and non-trigger-protected tables ─────────
  console.log('Step 4: Deleting financial records...');

  // Tables with id column (easy delete-all)
  const idTables = [
    'ib_allocations',
    'fee_allocations',
    'yield_allocations',
    'investor_yield_events',
    'withdrawal_requests',
    'fund_daily_aum',
    'ib_commission_ledger',
  ];
  for (const table of idTables) {
    const { error } = await serviceClient
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.log(`  ${table}: ${error.message}`);
    else console.log(`  ${table}: deleted`);
  }

  // investor_positions: composite PK (investor_id, fund_id) — no id column
  console.log('  Deleting investor_positions...');
  const { error: ipErr } = await serviceClient
    .from('investor_positions')
    .delete()
    .not('investor_id', 'is', null);
  if (ipErr) console.log(`  investor_positions: ${ipErr.message}`);
  else console.log('  investor_positions: deleted');

  // yield_distributions: try delete now that all are voided
  console.log('  Deleting yield_distributions...');
  const { error: ydDelErr } = await serviceClient
    .from('yield_distributions')
    .delete()
    .eq('is_voided', true);
  if (ydDelErr) console.log(`  yield_distributions: ${ydDelErr.message} (rows left as voided)`);
  else console.log('  yield_distributions: deleted');

  // transactions_v2: try delete now that all are voided
  console.log('  Deleting transactions_v2...');
  const { error: txDelErr } = await serviceClient
    .from('transactions_v2')
    .delete()
    .eq('is_voided', true);
  if (txDelErr) console.log(`  transactions_v2: ${txDelErr.message} (rows left as voided)`);
  else console.log('  transactions_v2: deleted');

  // statement_periods if any
  console.log('  Deleting statement_periods...');
  const { error: spErr } = await serviceClient
    .from('statement_periods')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (spErr) console.log(`  statement_periods: ${spErr.message}`);
  else console.log('  statement_periods: deleted');

  console.log();

  // ── Step 5: Restore system_mode = live ───────────────────────────────────
  console.log('Step 5: Restoring system_mode = live...');
  const { error: restoreErr } = await serviceClient
    .from('system_config')
    .update({ value: '"live"' })
    .eq('key', 'system_mode');
  if (restoreErr) console.log(`  Error: ${restoreErr.message}`);
  else console.log('  OK\n');

  // ── Step 6: Verify final counts ───────────────────────────────────────────
  console.log('Step 6: Final counts...');

  const wipedTables = [
    'transactions_v2',
    'yield_distributions',
    'investor_positions',
    'yield_allocations',
    'fee_allocations',
    'ib_allocations',
    'investor_yield_events',
    'fund_daily_aum',
    'withdrawal_requests',
    'statement_periods',
  ];
  const keptTables = ['profiles', 'investor_fee_schedule', 'ib_commission_schedule'];

  console.log('\n  [WIPED - should be 0]');
  for (const t of wipedTables) {
    const c = await countRows(t);
    const flag = (typeof c === 'number' && c > 0) ? ' WARN: NOT EMPTY' : '';
    console.log(`  ${t.padEnd(35)} ${String(c).padStart(6)}${flag}`);
  }

  console.log('\n  [KEPT - should have data]');
  for (const t of keptTables) {
    const c = await countRows(t);
    console.log(`  ${t.padEnd(35)} ${String(c).padStart(6)}`);
  }

  console.log('\n=== WIPE COMPLETE ===');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
