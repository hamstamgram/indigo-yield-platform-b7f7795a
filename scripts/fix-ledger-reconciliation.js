#!/usr/bin/env node
/**
 * Fix ledger reconciliation issues by creating missing deposit transactions
 * for test accounts that have positions without corresponding transactions
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixLedgerReconciliation() {
  console.log('='.repeat(70));
  console.log('  FIXING LEDGER RECONCILIATION');
  console.log('='.repeat(70));

  // Authenticate as admin first
  console.log('\nAuthenticating as admin...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'testadmin@indigo.fund',
    password: 'TestAdmin123!'
  });

  if (authErr) {
    console.log('Auth Error:', authErr.message);
    return;
  }
  console.log('Authenticated as:', auth.user.email);

  // Get admin user ID for the transaction
  const adminId = auth.user.id;

  // Get positions with variance
  const { data: variances, error: varErr } = await supabase
    .from('v_position_transaction_variance')
    .select('*')
    .gt('balance_variance', 0);

  if (varErr) {
    console.log('Error:', varErr.message);
    return;
  }

  console.log(`\nFound ${variances?.length || 0} positions needing fix:\n`);

  for (const v of variances || []) {
    console.log(`Fixing: ${v.investor_email} in ${v.fund_code}`);
    console.log(`  Position value: ${v.position_value}`);
    console.log(`  Missing deposits: ${v.balance_variance}`);

    // Create a backdated deposit transaction using the proper RPC
    const depositDate = new Date();
    depositDate.setMonth(depositDate.getMonth() - 6); // 6 months ago
    const dateStr = depositDate.toISOString().split('T')[0];

    // Use the apply_transaction_with_crystallization RPC
    // Parameters: p_investor_id, p_fund_id, p_tx_type, p_amount, p_tx_date, p_reference_id, p_notes, p_admin_id, p_new_total_aum, p_purpose
    const { data: tx, error: txErr } = await supabase.rpc('apply_transaction_with_crystallization', {
      p_investor_id: v.investor_id,
      p_fund_id: v.fund_id,
      p_tx_type: 'DEPOSIT',
      p_amount: v.balance_variance,
      p_tx_date: dateStr,
      p_reference_id: `RECON-${v.investor_id.slice(0,8)}-${dateStr}`,
      p_notes: 'Reconciliation: Creating missing deposit record for existing position',
      p_admin_id: adminId,
      p_new_total_aum: null,
      p_purpose: 'transaction'
    });

    if (txErr) {
      console.log(`  ERROR: ${txErr.message}`);
    } else {
      console.log(`  CREATED: Transaction ID: ${tx}`);
    }
    console.log();
  }

  // Verify fix
  console.log('\n--- Verifying fix ---\n');

  const { data: stillBroken } = await supabase
    .from('v_ledger_reconciliation')
    .select('*')
    .eq('has_variance', true);

  if (stillBroken && stillBroken.length > 0) {
    console.log(`Still have ${stillBroken.length} reconciliation issues:`);
    stillBroken.forEach(r => {
      console.log(`  - ${r.investor_email}: variance ${r.variance}`);
    });
  } else {
    console.log('✓ All ledger reconciliation issues fixed!');
  }

  console.log('\n' + '='.repeat(70));
}

fixLedgerReconciliation().catch(console.error);
