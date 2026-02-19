import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc("get_table_columns", {
    p_table_name: "fund_yield_snapshots",
  });

  if (error) {
    // If RPC doesn't exist, try query
    console.log(
      "RPC get_table_columns failed, trying direct select (which might fail due to RLS/schema)..."
    );
    const { data: cols, error: queryErr } = await supabase
      .from("fund_yield_snapshots")
      .select("*")
      .limit(1);

    if (queryErr) {
      console.error("Query failed:", queryErr.message);
    } else {
      console.log("Columns present in data:", Object.keys(cols[0] || {}));
    }
  } else {
    console.log("Columns (via RPC):", data);
  }
}

main().catch(console.error);
