import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc("get_table_info", {
    p_table_name: "fund_yield_snapshots",
  });

  if (error) {
    // If RPC doesn't exist, try another one or raw query if possible via a generic RPC
    console.log("RPC get_table_info failed, trying raw query via existing RPC (if any)...");

    // Many Supabase projects have a 'exec_sql' or similar for admins
    const { data: cols, error: sqlErr } = await supabase.rpc("get_columns_v2", {
      p_table: "fund_yield_snapshots",
    });

    if (sqlErr) {
      console.error("SQL RPC failed:", sqlErr.message);
      // Last resort: check if we can find any other table's columns to verify the RPC name
    } else {
      console.log("Columns:", cols);
    }
  } else {
    console.log("Table info:", data);
  }
}

main().catch(console.error);
