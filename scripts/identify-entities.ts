import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Listing all funds...");
  const { data: funds, error: fundError } = await supabase
    .from("funds")
    .select("id, name, code, asset, fund_class");

  if (fundError) {
    console.error("Error fetching funds:", fundError);
  } else {
    console.log("Funds found:", funds);
  }

  console.log("\nListing top 10 profiles...");
  const { data: profiles, error: profError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role, account_type")
    .limit(10);

  if (profError) {
    console.error("Error fetching profiles:", profError);
  } else {
    console.log("Profiles found:", profiles);
  }

  console.log("\nSearching for XRP asset in assets table...");
  const { data: assets, error: assetError } = await supabase
    .from("assets")
    .select("*")
    .eq("symbol", "XRP");

  if (assetError) {
    console.error("Error fetching assets:", assetError);
  } else {
    console.log("Assets found:", assets);
  }

  console.log("\nChecking for INDIGO FEES account explicitly...");
  const { data: feesAccount, error: feesError } = await supabase
    .from("profiles")
    .select("*")
    .ilike("first_name", "%INDIGO%")
    .limit(5);

  if (feesError) {
    console.log("Could not find by name, checking ID 169bb053-36cb-4f6e-93ea-831f0dfeaf1d...");
    const { data: feesById } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", "169bb053-36cb-4f6e-93ea-831f0dfeaf1d")
      .maybeSingle();
    console.log("Fees by ID:", feesById);
  } else {
    console.log("Fees accounts by name:", feesAccount);
  }
}

main().catch(console.error);
