/**
 * Supabase Client for Integration Tests
 *
 * Uses service role key for full access to local Supabase instance.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Local Supabase configuration
const SUPABASE_LOCAL_URL = "http://127.0.0.1:54321";
// Service role key from `supabase status` output (local dev only)
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export const supabase: SupabaseClient = createClient(
  SUPABASE_LOCAL_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Track created test data for cleanup
const testDataRegistry: {
  profiles: string[];
  funds: string[];
  transactions: string[];
  distributions: string[];
  positions: Array<{ investor_id: string; fund_id: string }>;
  aumRecords: string[];
} = {
  profiles: [],
  funds: [],
  transactions: [],
  distributions: [],
  positions: [],
  aumRecords: [],
};

export function registerTestProfile(id: string) {
  testDataRegistry.profiles.push(id);
}

export function registerTestFund(id: string) {
  testDataRegistry.funds.push(id);
}

export function registerTestTransaction(id: string) {
  testDataRegistry.transactions.push(id);
}

export function registerTestDistribution(id: string) {
  testDataRegistry.distributions.push(id);
}

export function registerTestPosition(investor_id: string, fund_id: string) {
  testDataRegistry.positions.push({ investor_id, fund_id });
}

export function registerTestAumRecord(id: string) {
  testDataRegistry.aumRecords.push(id);
}

/**
 * Clean up all test data created during tests.
 * Order matters due to foreign key constraints.
 */
export async function cleanupAllTestData(): Promise<void> {
  // 1. Delete transactions (references distributions, profiles, funds)
  if (testDataRegistry.transactions.length > 0) {
    await supabase.from("transactions_v2").delete().in("id", testDataRegistry.transactions);
  }

  // 2. Delete yield allocations (via distribution cascade)
  // 3. Delete fee allocations (via distribution cascade)
  // 4. Delete ib allocations (via distribution cascade)
  // 5. Delete distributions
  if (testDataRegistry.distributions.length > 0) {
    // Void distributions first (required for deletion)
    await supabase.rpc("set_config", {
      setting: "indigo.canonical_rpc",
      value: "true",
    });
    await supabase
      .from("yield_distributions")
      .update({ is_voided: true })
      .in("id", testDataRegistry.distributions);
    await supabase.from("yield_distributions").delete().in("id", testDataRegistry.distributions);
  }

  // 6. Delete investor positions
  for (const pos of testDataRegistry.positions) {
    await supabase
      .from("investor_positions")
      .delete()
      .eq("investor_id", pos.investor_id)
      .eq("fund_id", pos.fund_id);
  }

  // 7. Delete AUM records
  if (testDataRegistry.aumRecords.length > 0) {
    await supabase.from("fund_daily_aum").delete().in("id", testDataRegistry.aumRecords);
  }

  // 8. Delete funds (after positions and AUM)
  if (testDataRegistry.funds.length > 0) {
    await supabase.from("funds").delete().in("id", testDataRegistry.funds);
  }

  // 9. Delete profiles (before auth.users due to FK)
  if (testDataRegistry.profiles.length > 0) {
    await supabase.from("profiles").delete().in("id", testDataRegistry.profiles);
  }

  // 10. Delete auth.users last
  if (testDataRegistry.profiles.length > 0) {
    // Use RPC to delete from auth.users
    await supabase.rpc("test_cleanup_by_prefix", { p_prefix: "test_" });
  }

  // Clear registry
  testDataRegistry.profiles = [];
  testDataRegistry.funds = [];
  testDataRegistry.transactions = [];
  testDataRegistry.distributions = [];
  testDataRegistry.positions = [];
  testDataRegistry.aumRecords = [];
}

/**
 * Clear test data registry without deleting (for manual cleanup scenarios)
 */
export function clearTestRegistry(): void {
  testDataRegistry.profiles = [];
  testDataRegistry.funds = [];
  testDataRegistry.transactions = [];
  testDataRegistry.distributions = [];
  testDataRegistry.positions = [];
  testDataRegistry.aumRecords = [];
}
