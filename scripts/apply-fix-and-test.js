const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const fixSQL = `
CREATE OR REPLACE FUNCTION public.reconcile_investor_position(
  p_fund_id uuid,
  p_investor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_calculated_position numeric;
  v_stored_position numeric;
  v_deposits numeric;
  v_withdrawals numeric;
  v_yield numeric;
  v_diff numeric;
BEGIN
  -- SECURITY: Reconciliation is admin-only
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can reconcile positions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Calculate position from transactions
  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN abs(t.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'YIELD' THEN t.amount ELSE 0 END), 0)
  INTO v_deposits, v_withdrawals, v_yield
  FROM transactions_v2 t
  WHERE t.fund_id = p_fund_id
    AND t.investor_id = p_investor_id
    AND t.is_voided = false;

  v_calculated_position := v_deposits - v_withdrawals + v_yield;

  -- Get stored position (FIXED: use current_value)
  SELECT current_value INTO v_stored_position
  FROM investor_positions
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id;

  v_diff := COALESCE(v_calculated_position, 0) - COALESCE(v_stored_position, 0);

  -- Update if different (FIXED: use current_value)
  IF ABS(v_diff) > 0.01 THEN
    UPDATE investor_positions
    SET current_value = v_calculated_position,
        updated_at = now()
    WHERE fund_id = p_fund_id
      AND investor_id = p_investor_id;
  END IF;

  RETURN jsonb_build_object(
    'fund_id', p_fund_id,
    'investor_id', p_investor_id,
    'calculated_position', v_calculated_position,
    'stored_position', v_stored_position,
    'difference', v_diff,
    'deposits', v_deposits,
    'withdrawals', v_withdrawals,
    'yield', v_yield,
    'updated', ABS(v_diff) > 0.01
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reconcile_investor_position(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_investor_position(uuid, uuid) TO service_role;
`;

const results = [];

function log(test, success, message) {
  results.push({ test, success, message });
  const icon = success ? "✓" : "✗";
  console.log(`  ${icon} ${test}: ${message}`);
}

async function main() {
  console.log("═".repeat(70));
  console.log("  APPLYING FIX AND TESTING ADMIN FUNCTIONS");
  console.log("═".repeat(70));

  // Step 1: Apply the fix
  console.log("\n1. Applying reconcile_investor_position fix...");
  const { error: fixError } = await supabase.rpc('exec_sql', { sql: fixSQL }).maybeSingle();

  // If exec_sql doesn't exist, we'll use the REST API to run raw SQL
  if (fixError && fixError.message.includes('function') && fixError.message.includes('does not exist')) {
    console.log("   Note: exec_sql not available, fix must be applied via Supabase dashboard");
    console.log("   Please run the SQL from: /Users/mama/indigo-yield-platform-v01/supabase/migrations/20260117150000_fix_reconcile_investor_position.sql");
    console.log("\n   Continuing with tests to verify current state...\n");
  } else if (fixError) {
    console.log(`   Warning: ${fixError.message}`);
  } else {
    log("Apply Fix", true, "Function updated successfully");
  }

  // Step 2: Authenticate as admin
  console.log("\n2. Authenticating as admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "testadmin@indigo.fund",
    password: "TestAdmin123!"
  });

  if (authError) {
    log("Admin Auth", false, authError.message);
    return;
  }

  const adminId = authData.user.id;
  log("Admin Auth", true, `Logged in as ${authData.user.email} (${adminId.slice(0,8)}...)`);

  // Step 3: Get test fund
  console.log("\n3. Getting test fund...");
  const { data: fund, error: fundError } = await supabase
    .from("funds")
    .select("id, code, asset")
    .eq("status", "active")
    .eq("asset", "ETH")
    .single();

  if (fundError || !fund) {
    log("Get Fund", false, fundError?.message || "No ETH fund found");
    return;
  }
  log("Get Fund", true, `Using ${fund.code} (${fund.id.slice(0,8)}...)`);

  // Step 4: Get an investor for testing
  console.log("\n4. Getting test investor...");
  const { data: investor } = await supabase
    .from("investor_positions")
    .select("investor_id, current_value")
    .eq("fund_id", fund.id)
    .gt("current_value", 0)
    .limit(1)
    .single();

  const investorId = investor?.investor_id;
  if (investorId) {
    log("Get Investor", true, `Found investor with ${investor.current_value} value`);
  } else {
    log("Get Investor", false, "No investor with positions found");
  }

  // Step 5: Test admin functions
  console.log("\n5. Testing Admin Functions...\n");

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yieldDate = yesterday.toISOString().split("T")[0];

  // Test is_admin()
  const { data: isAdmin, error: isAdminErr } = await supabase.rpc("is_admin");
  log("is_admin()", !isAdminErr && isAdmin === true, isAdminErr?.message || `Returns: ${isAdmin}`);

  // Test preview_daily_yield_to_fund_v3
  const { data: previewYield, error: previewErr } = await supabase.rpc("preview_daily_yield_to_fund_v3", {
    p_fund_id: fund.id,
    p_yield_date: yieldDate,
    p_new_aum: 100,
    p_purpose: "reporting"
  });
  log("preview_daily_yield_to_fund_v3", !previewErr, previewErr?.message || `Preview returned ${typeof previewYield}`);

  // Test get_investor_position_as_of
  if (investorId) {
    const { data: positionAsOf, error: posErr } = await supabase.rpc("get_investor_position_as_of", {
      p_fund_id: fund.id,
      p_investor_id: investorId,
      p_as_of_date: yieldDate
    });
    log("get_investor_position_as_of", !posErr, posErr?.message || `Position data returned`);
  }

  // Test reconcile_investor_position (THE FIX)
  if (investorId) {
    const { data: reconcile, error: reconErr } = await supabase.rpc("reconcile_investor_position", {
      p_fund_id: fund.id,
      p_investor_id: investorId
    });
    log("reconcile_investor_position", !reconErr, reconErr?.message || `Reconciliation: ${JSON.stringify(reconcile)?.slice(0,60)}...`);
  }

  // Step 6: Test integrity views
  console.log("\n6. Testing Integrity Views...\n");

  const integrityViews = [
    "v_ledger_reconciliation",
    "v_position_transaction_variance",
    "v_yield_conservation_check",
    "v_yield_conservation_violations",
    "v_yield_allocation_violations",
    "v_missing_withdrawal_transactions",
    "v_transaction_distribution_orphans",
    "v_period_orphans",
    "v_crystallization_gaps"
  ];

  for (const view of integrityViews) {
    const { data, error } = await supabase.from(view).select("*").limit(5);
    log(view, !error, error?.message || `${data?.length || 0} rows returned`);
  }

  // Step 7: Test admin tables
  console.log("\n7. Testing Admin Tables...\n");

  const adminTables = [
    "funds",
    "transactions_v2",
    "investor_positions",
    "yield_distributions",
    "withdrawal_requests",
    "statement_periods"
  ];

  for (const table of adminTables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    log(`${table} access`, !error, error?.message || `${count} rows`);
  }

  // Summary
  console.log("\n" + "═".repeat(70));
  console.log("  SUMMARY");
  console.log("═".repeat(70));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.log("\n  Failed tests:");
    results.filter(r => !r.success).forEach(r => {
      console.log(`    - ${r.test}: ${r.message}`);
    });
  } else {
    console.log("\n  🎉 ALL TESTS PASSED!");
  }

  console.log("\n" + "═".repeat(70));
}

main().catch(console.error);
