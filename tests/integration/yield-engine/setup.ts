/**
 * Integration Test Setup for Yield Engine
 *
 * Connects to local Supabase instance for testing yield RPCs.
 * Uses service role key for full database access.
 */

import { beforeAll, afterAll, vi } from "vitest";
import { supabase, cleanupAllTestData } from "./helpers/supabase-client";

// Set test environment
process.env.NODE_ENV = "test";

beforeAll(async () => {
  // Verify connection to local Supabase
  const { data, error } = await supabase.from("funds").select("count").limit(1);
  if (error) {
    console.error("Failed to connect to local Supabase:", error.message);
    throw new Error("Cannot connect to local Supabase. Ensure `supabase start` is running.");
  }
  console.log("Connected to local Supabase for integration tests");
});

afterAll(async () => {
  // Clean up any remaining test data
  await cleanupAllTestData();
  console.log("Integration test cleanup complete");
});

// Suppress console during tests unless DEBUG is set
if (!process.env.DEBUG) {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
}
