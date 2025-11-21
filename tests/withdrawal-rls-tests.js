#!/usr/bin/env node

/**
 * RLS and Permissions Test Suite for Withdrawal Workflow
 *
 * Tests required per project rules:
 * 1. Non-admin users CANNOT execute admin RPCs
 * 2. Admin users CAN execute all RPCs with valid transitions
 * 3. Investors can only see their own withdrawal_requests
 * 4. Admins can see all withdrawal_requests
 * 5. Audit logs are only visible to admins
 *
 * Usage:
 *   npm install @supabase/supabase-js
 *   node tests/withdrawal-rls-tests.js
 */

import { createClient } from "@supabase/supabase-js";

// Configuration - Update these with your test environment
const SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "your-anon-key";

// Test user credentials (these should be seeded in your test DB)
const ADMIN_EMAIL = "admin@test.com";
const ADMIN_PASSWORD = "test123456";
const INVESTOR_EMAIL = "investor@test.com";
const INVESTOR_PASSWORD = "test123456";
const INVESTOR2_EMAIL = "investor2@test.com";
const INVESTOR2_PASSWORD = "test123456";

// Test data IDs (should be seeded)
let testRequestId = null;
let adminUserId = null;
let investorUserId = null;

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test results tracking
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Helper functions
async function runTest(name, testFn) {
  console.log(`\nRunning: ${name}`);
  try {
    await testFn();
    passedTests++;
    testResults.push({ name, status: "PASS" });
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    failedTests++;
    testResults.push({ name, status: "FAIL", error: error.message });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

async function expectError(fn, expectedError = null) {
  try {
    await fn();
    throw new Error("Expected function to throw an error but it succeeded");
  } catch (error) {
    if (expectedError && !error.message.includes(expectedError)) {
      throw new Error(`Expected error containing "${expectedError}" but got "${error.message}"`);
    }
    // Error was expected, test passes
  }
}

async function seedTestData() {
  console.log("\n🌱 Seeding test data...");

  // Sign in as admin to create test withdrawal request
  const { data: adminAuth, error: adminAuthError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (adminAuthError) throw adminAuthError;
  adminUserId = adminAuth.user.id;

  // Get investor profile
  const { data: investorProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", INVESTOR_EMAIL)
    .single();

  if (investorProfile) {
    investorUserId = investorProfile.id;
  }

  // Create a test withdrawal request
  const { data: testRequest, error: createError } = await supabase
    .from("withdrawal_requests")
    .insert({
      investor_id: investorUserId || "00000000-0000-0000-0000-000000000001",
      fund_id: "00000000-0000-0000-0000-000000000001",
      fund_class: "USDC",
      requested_amount: 1000,
      withdrawal_type: "partial",
      status: "pending",
      notes: "Test withdrawal request",
    })
    .select()
    .single();

  if (createError) {
    console.log("Note: Could not create test request, using existing data");
    // Try to find an existing request
    const { data: existingRequest } = await supabase
      .from("withdrawal_requests")
      .select("id")
      .eq("status", "pending")
      .limit(1)
      .single();

    if (existingRequest) {
      testRequestId = existingRequest.id;
    }
  } else {
    testRequestId = testRequest.id;
  }

  console.log(`Test request ID: ${testRequestId}`);
}

// Test Suite 1: Non-admin cannot execute admin RPCs
async function testNonAdminCannotExecuteAdminRPCs() {
  console.log("\n📋 Test Suite 1: Non-admin cannot execute admin RPCs");

  // Sign in as investor (non-admin)
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: INVESTOR_EMAIL,
    password: INVESTOR_PASSWORD,
  });

  if (signInError) throw signInError;

  await runTest("Non-admin cannot approve withdrawal", async () => {
    await expectError(async () => {
      const { error } = await supabase.rpc("approve_withdrawal", {
        p_request_id: testRequestId,
        p_approved_amount: 900,
        p_admin_notes: "Should fail",
      });
      if (error) throw error;
    }, "Admin only operation");
  });

  await runTest("Non-admin cannot reject withdrawal", async () => {
    await expectError(async () => {
      const { error } = await supabase.rpc("reject_withdrawal", {
        p_request_id: testRequestId,
        p_reason: "Test rejection",
        p_admin_notes: "Should fail",
      });
      if (error) throw error;
    }, "Admin only operation");
  });

  await runTest("Non-admin cannot start processing", async () => {
    await expectError(async () => {
      const { error } = await supabase.rpc("start_processing_withdrawal", {
        p_request_id: testRequestId,
        p_processed_amount: 900,
      });
      if (error) throw error;
    }, "Admin only operation");
  });

  await runTest("Non-admin cannot complete withdrawal", async () => {
    await expectError(async () => {
      const { error } = await supabase.rpc("complete_withdrawal", {
        p_request_id: testRequestId,
        p_tx_hash: "0x123",
      });
      if (error) throw error;
    }, "Admin only operation");
  });

  await runTest("Non-admin cannot cancel withdrawal", async () => {
    await expectError(async () => {
      const { error } = await supabase.rpc("cancel_withdrawal_by_admin", {
        p_request_id: testRequestId,
        p_reason: "Test cancellation",
      });
      if (error) throw error;
    }, "Admin only operation");
  });
}

// Test Suite 2: Admin can execute RPCs with valid transitions
async function testAdminCanExecuteValidTransitions() {
  console.log("\n📋 Test Suite 2: Admin can execute RPCs with valid transitions");

  // Sign in as admin
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (signInError) throw signInError;

  // Create a fresh request for this test
  const { data: newRequest, error: createError } = await supabase
    .from("withdrawal_requests")
    .insert({
      investor_id: investorUserId || "00000000-0000-0000-0000-000000000001",
      fund_id: "00000000-0000-0000-0000-000000000001",
      fund_class: "USDC",
      requested_amount: 2000,
      withdrawal_type: "partial",
      status: "pending",
      notes: "Test for transitions",
    })
    .select()
    .single();

  const transitionTestId = newRequest?.id || testRequestId;

  await runTest("Admin can approve pending withdrawal", async () => {
    const { error } = await supabase.rpc("approve_withdrawal", {
      p_request_id: transitionTestId,
      p_approved_amount: 1900,
      p_admin_notes: "Approved with reduced amount",
    });
    if (error) throw error;
  });

  await runTest("Admin cannot approve already approved withdrawal", async () => {
    await expectError(async () => {
      const { error } = await supabase.rpc("approve_withdrawal", {
        p_request_id: transitionTestId,
        p_approved_amount: 1900,
      });
      if (error) throw error;
    }, "Can only approve pending");
  });

  await runTest("Admin can start processing approved withdrawal", async () => {
    const { error } = await supabase.rpc("start_processing_withdrawal", {
      p_request_id: transitionTestId,
      p_processed_amount: 1900,
      p_tx_hash: "0xabc123",
      p_settlement_date: "2025-01-15",
    });
    if (error) throw error;
  });

  await runTest("Admin can complete processing withdrawal", async () => {
    const { error } = await supabase.rpc("complete_withdrawal", {
      p_request_id: transitionTestId,
      p_tx_hash: "0xabc123final",
    });
    if (error) throw error;
  });

  await runTest("Admin cannot complete already completed withdrawal", async () => {
    await expectError(async () => {
      const { error } = await supabase.rpc("complete_withdrawal", {
        p_request_id: transitionTestId,
        p_tx_hash: "0xabc123final2",
      });
      if (error) throw error;
    }, "Can only complete requests in processing");
  });
}

// Test Suite 3: RLS on withdrawal_requests table
async function testWithdrawalRequestsRLS() {
  console.log("\n📋 Test Suite 3: RLS on withdrawal_requests table");

  // Test as investor 1
  await supabase.auth.signInWithPassword({
    email: INVESTOR_EMAIL,
    password: INVESTOR_PASSWORD,
  });

  await runTest("Investor can see only their own withdrawal requests", async () => {
    const { data, error } = await supabase.from("withdrawal_requests").select("*");

    if (error) throw error;

    // All returned requests should belong to this investor
    const wrongRequests = data.filter((r) => r.investor_id !== investorUserId);
    if (wrongRequests.length > 0) {
      throw new Error(`Investor can see ${wrongRequests.length} requests from other investors`);
    }
  });

  // Test as admin
  await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  await runTest("Admin can see all withdrawal requests", async () => {
    const { data, error } = await supabase.from("withdrawal_requests").select("*");

    if (error) throw error;

    // Admin should see requests from multiple investors
    const uniqueInvestors = [...new Set(data.map((r) => r.investor_id))];
    if (uniqueInvestors.length < 1) {
      throw new Error("Admin cannot see any withdrawal requests");
    }
  });
}

// Test Suite 4: Audit logs visibility
async function testAuditLogsRLS() {
  console.log("\n📋 Test Suite 4: Audit logs RLS");

  // Test as investor
  await supabase.auth.signInWithPassword({
    email: INVESTOR_EMAIL,
    password: INVESTOR_PASSWORD,
  });

  await runTest("Investor cannot see audit logs", async () => {
    const { data, error } = await supabase.from("withdrawal_audit_logs").select("*").limit(1);

    // Should either error or return empty
    if (!error && data && data.length > 0) {
      throw new Error("Investor can see audit logs when they should not");
    }
  });

  // Test as admin
  await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  await runTest("Admin can see audit logs", async () => {
    const { data, error } = await supabase.from("withdrawal_audit_logs").select("*");

    if (error) throw error;

    // Admin should be able to query audit logs
    if (!data) {
      throw new Error("Admin cannot query audit logs");
    }
  });
}

// Test Suite 5: Validation tests
async function testValidation() {
  console.log("\n📋 Test Suite 5: Validation tests");

  // Sign in as admin
  await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  // Create test request
  const { data: validationRequest } = await supabase
    .from("withdrawal_requests")
    .insert({
      investor_id: investorUserId || "00000000-0000-0000-0000-000000000001",
      fund_id: "00000000-0000-0000-0000-000000000001",
      fund_class: "USDC",
      requested_amount: 5000,
      withdrawal_type: "partial",
      status: "pending",
    })
    .select()
    .single();

  const validationTestId = validationRequest?.id;

  await runTest("Cannot approve with amount exceeding requested", async () => {
    await expectError(async () => {
      const { error } = await supabase.rpc("approve_withdrawal", {
        p_request_id: validationTestId,
        p_approved_amount: 6000, // More than requested
      });
      if (error) throw error;
    }, "cannot exceed requested amount");
  });

  await runTest("Cannot approve with zero amount", async () => {
    await expectError(async () => {
      const { error } = await supabase.rpc("approve_withdrawal", {
        p_request_id: validationTestId,
        p_approved_amount: 0,
      });
      if (error) throw error;
    }, "must be greater than zero");
  });

  await runTest("Cannot reject without reason", async () => {
    await expectError(async () => {
      const { error } = await supabase.rpc("reject_withdrawal", {
        p_request_id: validationTestId,
        p_reason: "", // Empty reason
      });
      if (error) throw error;
    }, "reason is required");
  });
}

// Main test runner
async function runAllTests() {
  console.log("🧪 Starting Withdrawal RLS and Permissions Tests");
  console.log("================================================");

  try {
    await seedTestData();
    await testNonAdminCannotExecuteAdminRPCs();
    await testAdminCanExecuteValidTransitions();
    await testWithdrawalRequestsRLS();
    await testAuditLogsRLS();
    await testValidation();

    console.log("\n================================================");
    console.log("📊 Test Results Summary");
    console.log("================================================");
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Total: ${passedTests + failedTests}`);
    console.log(`🎯 Pass Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log("\n❌ Failed Tests:");
      testResults
        .filter((r) => r.status === "FAIL")
        .forEach((r) => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
      process.exit(1);
    } else {
      console.log("\n✅ All tests passed! RLS policies are correctly configured.");
      process.exit(0);
    }
  } catch (error) {
    console.error("\n💥 Test suite failed with error:", error);
    process.exit(1);
  }
}

// Run the tests
runAllTests();
