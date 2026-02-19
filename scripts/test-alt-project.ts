import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = "https://noekumitbfoxhsndwypz.supabase.co";
const supabaseKey = process.env.VITE_PORTFOLIO_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log(`Checking project: ${supabaseUrl}`);
  const { data: funds, error } = await supabase.from("funds").select("id, code, name").limit(5);

  if (error) {
    console.error("Error (likely due to RLS or wrong key):", error.message);
  } else {
    console.log(
      "Funds found (meaning this is a valid project and funds table is readable):",
      funds
    );
  }
}

main().catch(console.error);
