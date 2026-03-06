import { supabase } from "./src/integrations/supabase/client";

async function run() {
  console.log("Authenticating...");
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: "qa.admin@indigo.fund",
    password: "TestAdmin2026!",
  });
  if (authError) {
    console.error("Auth failed:", authError);
    return;
  }

  console.log("Fetching a fund and an investor...");
  const { data: fund } = await supabase.from("funds").select("id, asset").limit(1).single();
  const { data: profile } = await supabase.from("profiles").select("id").limit(1).single();

  if (!fund || !profile) {
    console.error("Missing data");
    return;
  }

  console.log("Attempting to create deposit by hitting RPC directly...");
  const { data, error } = await supabase.rpc("apply_transaction_with_crystallization", {
    p_fund_id: fund.id,
    p_investor_id: profile.id,
    p_tx_type: "DEPOSIT",
    p_amount: 1000,
    p_tx_date: new Date().toISOString().split("T")[0],
    p_reference_id: `QA-${Date.now()}`,
  });

  if (error) {
    console.error("Deposit RPC Error Detail:", error);
  } else {
    console.log("Success!", data);
  }
}

run().catch(console.error);
