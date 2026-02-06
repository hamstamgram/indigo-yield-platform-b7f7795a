import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load usage
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const supabaseUrl = process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey!);

async function verifyLedgerDrive() {
  console.log("🧪 Starting Ledger-Driven Architecture Verification...");

  // 1. Pick a random investor and fund
  const { data: positions } = await supabase
    .from("investor_positions")
    .select("investor_id, fund_id, current_value")
    .limit(1);

  if (!positions || positions.length === 0) {
    console.error("❌ No positions found to test");
    process.exit(1);
  }

  const testPos = positions[0];
  console.log(`📋 Testing with Investor: ${testPos.investor_id}, Fund: ${testPos.fund_id}`);
  console.log(`   Initial Balance: ${testPos.current_value}`);

  // 2. Apply a Transaction (ADJUSTMENT) via RPC
  const amount = 100;
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "apply_transaction_with_crystallization",
    {
      p_investor_id: testPos.investor_id,
      p_fund_id: testPos.fund_id,
      p_tx_type: "ADJUSTMENT",
      p_amount: amount,
      p_tx_date: new Date().toISOString().split("T")[0],
      p_reference_id: `TEST-LEDGER-${Date.now()}`,
      p_notes: "Verification test for Ledger-Driven Trigger",
      p_purpose: "transaction",
    }
  );

  if (rpcError) {
    console.error("❌ RPC Failed:", rpcError);
    process.exit(1);
  }

  console.log("✅ RPC Success:", rpcResult);

  // 3. Verify Position Updated via Trigger
  const { data: newPos } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("investor_id", testPos.investor_id)
    .eq("fund_id", testPos.fund_id)
    .single();

  const expected = Number(testPos.current_value) + amount;
  const actual = Number(newPos?.current_value);

  console.log(`   New Balance: ${actual}`);
  console.log(`   Expected:   ${expected}`);

  if (Math.abs(actual - expected) < 0.001) {
    console.log("🎉 SUCCESS: Trigger correctly updated position!");
  } else {
    console.error("❌ FAILURE: Position did not update correctly.");
    process.exit(1);
  }

  // 4. Cleanup (Void the transaction)
  // To test void trigger logic
  const txId = rpcResult.tx_id;
  console.log("🔄 Testing Void Logic...");

  const { error: voidError } = await supabase
    .from("transactions_v2")
    .update({ is_voided: true })
    .eq("id", txId);

  if (voidError) console.error("Error voiding:", voidError);

  const { data: finalPos } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("investor_id", testPos.investor_id)
    .eq("fund_id", testPos.fund_id)
    .single();

  console.log(`   Final Balance (After Void): ${finalPos?.current_value}`);
  if (Math.abs(Number(finalPos?.current_value) - Number(testPos.current_value)) < 0.001) {
    console.log("🎉 SUCCESS: Void Logic correctly reversed position!");
  } else {
    console.error("❌ FAILURE: Void logic failed.");
  }
}

verifyLedgerDrive();
