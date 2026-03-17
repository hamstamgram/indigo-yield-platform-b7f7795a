import { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://nkfimvovosdehmyyjubn.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg";

const TEST_FUND_PATTERNS = [
  "E2E_Test_Fund_%",
  "Expert Neg Fund %",
  "FeesComp Fund %",
  "Dust Fund %",
  "Zero Fund %",
  "Void Fund %",
];

const TEST_PROFILE_PATTERNS = ["%@expert.com", "%@test.com", "%@test.indigo.com"];

/**
 * Cleanup test data created by E2E tests.
 * Call this in afterAll hooks to prevent test data pollution.
 */
export async function cleanupTestData(): Promise<void> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Login as admin to get elevated permissions
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_ADMIN_EMAIL || "adriel@indigo.fund",
      password: process.env.TEST_ADMIN_PASSWORD || "TestAdmin2026!",
    });
    if (authError) {
      console.log("[cleanup] Auth failed, skipping cleanup:", authError.message);
      return;
    }

    // Call the reset-safe cleanup: deprecate test funds (doesn't delete, just hides)
    const fundPatterns = TEST_FUND_PATTERNS.map((p) => `name LIKE '${p}'`).join(" OR ");
    const { error: fundError } = await supabase.rpc("execute_admin_sql", {
      p_sql: `UPDATE funds SET status = 'deprecated' WHERE ${fundPatterns}`,
    });

    if (fundError) {
      // RPC may not exist, try direct update
      for (const pattern of TEST_FUND_PATTERNS) {
        await supabase.from("funds").update({ status: "deprecated" }).like("name", pattern);
      }
    }

    console.log("[cleanup] Test funds deprecated");
  } catch (e) {
    console.log("[cleanup] Cleanup error (non-fatal):", (e as Error).message);
  }
}
