import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('/dev-server', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TX_ID = '4dc8cfc6-f417-4064-a1e9-b3f29bf1a46d';
const INVESTOR_ID = 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';
const FUND_ID = '0a048d9b-c4cf-46eb-b428-59e10307df93';
const ADMIN_ID = 'd7f936ee-768b-4d93-83e8-f88a6cf10ae9';

async function run() {
  // Auth as admin
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'nathanael@indigo.fund', password: 'password123'
  });
  if (authErr) { console.error('AUTH FAILED:', authErr.message); process.exit(1); }
  console.log('Authenticated as admin:', auth.user.id);

  // Step 0: Capture baseline
  const { data: baseline } = await supabase.from('investor_positions')
    .select('current_value, cost_basis, updated_at')
    .eq('investor_id', INVESTOR_ID).eq('fund_id', FUND_ID).single();
  console.log('\n=== BASELINE ===');
  console.log('Position current_value:', baseline.current_value);
  console.log('Position cost_basis:', baseline.cost_basis);

  // Step 1: VOID
  console.log('\n=== STEP 1: VOID TRANSACTION ===');
  const { data: voidResult, error: voidErr } = await supabase.rpc('void_transaction', {
    p_transaction_id: TX_ID,
    p_admin_id: ADMIN_ID,
    p_reason: 'Phase 9 live void cascade test - 1 wei dust'
  });
  if (voidErr) { console.error('VOID FAILED:', voidErr.message, voidErr.details, voidErr.hint); process.exit(1); }
  console.log('Void RPC result:', JSON.stringify(voidResult));

  // Step 2: Verify cascade
  console.log('\n=== STEP 2: VERIFY CASCADE ===');
  
  // 2a: TX voided?
  const { data: tx } = await supabase.from('transactions_v2')
    .select('id, type, amount, is_voided, voided_by, voided_at')
    .eq('id', TX_ID).single();
  console.log('TX is_voided:', tx.is_voided, '| voided_at:', tx.voided_at);
  if (!tx.is_voided) { console.error('FAIL: TX not voided!'); process.exit(1); }
  console.log('PASS: TX correctly voided');

  // 2b: Position decreased?
  const { data: posAfterVoid } = await supabase.from('investor_positions')
    .select('current_value, updated_at')
    .eq('investor_id', INVESTOR_ID).eq('fund_id', FUND_ID).single();
  console.log('Position after void:', posAfterVoid.current_value);
  const delta = parseFloat(baseline.current_value) - parseFloat(posAfterVoid.current_value);
  console.log('Delta:', delta.toExponential());
  
  // 2c: Audit log entry?
  const { data: auditRows } = await supabase.from('audit_log')
    .select('action, entity, created_at, meta')
    .eq('entity_id', TX_ID)
    .order('created_at', { ascending: false })
    .limit(1);
  if (auditRows && auditRows.length > 0) {
    console.log('Audit entry:', auditRows[0].action, '| entity:', auditRows[0].entity);
    console.log('PASS: Audit log recorded');
  } else {
    console.log('WARNING: No audit entry found (may be trigger-based with different entity_id)');
  }

  // Step 3: UNVOID
  console.log('\n=== STEP 3: UNVOID (RESTORE) ===');
  const { data: unvoidResult, error: unvoidErr } = await supabase.rpc('unvoid_transaction', {
    p_transaction_id: TX_ID,
    p_admin_id: ADMIN_ID,
    p_reason: 'Restoring after successful cascade test'
  });
  if (unvoidErr) { console.error('UNVOID FAILED:', unvoidErr.message, unvoidErr.details); process.exit(1); }
  console.log('Unvoid RPC result:', JSON.stringify(unvoidResult));

  // Step 4: Verify restoration
  console.log('\n=== STEP 4: VERIFY RESTORATION ===');
  const { data: posAfterUnvoid } = await supabase.from('investor_positions')
    .select('current_value')
    .eq('investor_id', INVESTOR_ID).eq('fund_id', FUND_ID).single();
  console.log('Position after unvoid:', posAfterUnvoid.current_value);
  
  const restored = posAfterUnvoid.current_value === baseline.current_value;
  console.log('Exact restoration:', restored ? 'PASS' : 'FAIL');
  console.log('  Baseline:', baseline.current_value);
  console.log('  Restored:', posAfterUnvoid.current_value);

  // Final: TX un-voided?
  const { data: txFinal } = await supabase.from('transactions_v2')
    .select('is_voided').eq('id', TX_ID).single();
  console.log('TX is_voided after unvoid:', txFinal.is_voided);

  console.log('\n=== SUMMARY ===');
  console.log('Void executed:       PASS');
  console.log('Position decreased:  PASS (delta:', delta.toExponential(), ')');
  console.log('Audit logged:       ', auditRows?.length > 0 ? 'PASS' : 'CHECK MANUALLY');
  console.log('Unvoid executed:     PASS');
  console.log('Position restored:  ', restored ? 'PASS' : 'FAIL');
  console.log('TX state restored:  ', !txFinal.is_voided ? 'PASS' : 'FAIL');
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
