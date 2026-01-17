#!/usr/bin/env node
/**
 * Check ledger reconciliation and position variance
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkLedger() {
  console.log('='.repeat(70));
  console.log('  LEDGER RECONCILIATION CHECK');
  console.log('='.repeat(70));

  // Check ledger reconciliation view
  const { data: ledger, error: ledgerErr } = await supabase
    .from('v_ledger_reconciliation')
    .select('*');

  if (ledgerErr) {
    console.log('Ledger Error:', ledgerErr.message);
    return;
  }

  console.log('\n=== LEDGER RECONCILIATION ===');
  console.log(`Found ${ledger?.length || 0} rows:\n`);

  if (ledger && ledger.length > 0) {
    ledger.forEach((row, i) => {
      console.log(`Row ${i+1}:`);
      Object.keys(row).forEach(k => {
        console.log(`  ${k}: ${row[k]}`);
      });
      console.log();
    });
  } else {
    console.log('  No discrepancies found!');
  }

  // Check position transaction variance
  const { data: variance, error: varErr } = await supabase
    .from('v_position_transaction_variance')
    .select('*');

  console.log('\n=== POSITION TRANSACTION VARIANCE ===');
  console.log(`Found ${variance?.length || 0} rows:\n`);

  if (variance && variance.length > 0) {
    variance.forEach((row, i) => {
      console.log(`Variance ${i+1}:`);
      Object.keys(row).forEach(k => {
        console.log(`  ${k}: ${row[k]}`);
      });
      console.log();
    });
  } else {
    console.log('  No variance found!');
  }

  // Check crystallization gaps
  const { data: gaps } = await supabase
    .from('v_crystallization_gaps')
    .select('*');

  console.log('\n=== CRYSTALLIZATION GAPS ===');
  console.log(`Found ${gaps?.length || 0} rows:\n`);

  if (gaps && gaps.length > 0) {
    gaps.forEach((row, i) => {
      console.log(`Gap ${i+1}:`);
      Object.keys(row).forEach(k => {
        console.log(`  ${k}: ${row[k]}`);
      });
      console.log();
    });
  }

  console.log('\n' + '='.repeat(70));
}

checkLedger().catch(console.error);
