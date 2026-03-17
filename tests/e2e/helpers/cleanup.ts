import { createClient } from "@supabase/supabase-js";
import { QA_FUND, QA_ADMIN } from "./qa-fund";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://nkfimvovosdehmyyjubn.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg";

/**
 * Clean all test data from the QA Test Fund only.
 * Does NOT touch real funds (XRP, BTC, SOL, ETH, USDT).
 * Call in afterAll hooks.
 */
export async function cleanupQAFund(): Promise<void> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: QA_ADMIN.email,
      password: QA_ADMIN.password,
    });
    if (authError) {
      console.log("[cleanup] Auth failed:", authError.message);
      return;
    }

    // Call reset_platform_data won't work (it resets everything).
    // Instead, void and delete only QA fund data via direct queries.
    const fundId = QA_FUND.id;

    // Delete in FK-safe order (children first)
    await supabase.from("yield_allocations").delete().eq("fund_id", fundId);
    await supabase.from("fee_allocations").delete().eq("fund_id", fundId);
    await supabase.from("ib_commission_ledger").delete().eq("fund_id", fundId);
    await supabase.from("platform_fee_ledger").delete().eq("fund_id", fundId);

    // Clear distribution_id before deleting distributions
    await supabase
      .from("transactions_v2")
      .update({ distribution_id: null } as any)
      .eq("fund_id", fundId)
      .not("distribution_id", "is", null);

    await supabase.from("yield_distributions").delete().eq("fund_id", fundId);
    await supabase.from("withdrawal_requests").delete().eq("fund_id", fundId);
    await supabase.from("transactions_v2").delete().eq("fund_id", fundId);
    await supabase.from("investor_positions").delete().eq("fund_id", fundId);
    await supabase.from("fund_daily_aum").delete().eq("fund_id", fundId);

    // Also deprecate any test funds created by tests (safety net)
    const testPatterns = [
      "E2E_Test_Fund_%",
      "Expert Neg Fund %",
      "FeesComp Fund %",
      "Dust Fund %",
      "Zero Fund %",
      "Void Fund %",
    ];
    for (const pattern of testPatterns) {
      await supabase.from("funds").update({ status: "deprecated" }).like("name", pattern);
    }

    console.log("[cleanup] QA fund data cleaned");
  } catch (e) {
    console.log("[cleanup] Error (non-fatal):", (e as Error).message);
  }
}

/** Legacy alias */
export const cleanupTestData = cleanupQAFund;
