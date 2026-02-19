import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("==============================================");
  console.log("   Triggering Production Grand Simulation");
  console.log("==============================================");

  // 1. Authenticate as Admin
  console.log("Authenticating as QA Admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "qa.admin@indigo.fund",
    password: "QaTest2026!",
  });

  if (authError || !authData.session) {
    console.error("Auth failed:", authError?.message);
    process.exit(1);
  }

  const token = authData.session.access_token;
  console.log("Authentication successful.");

  // 2. Invoke Edge Function
  console.log("\nInvoking Edge Function: grand-simulation...");
  console.log(`URL: ${supabaseUrl}/functions/v1/grand-simulation`);

  const response = await fetch(`${supabaseUrl}/functions/v1/grand-simulation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const result = await response.json();

  console.log("\n==============================================");
  console.log("              Simulation Result");
  console.log("==============================================");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
