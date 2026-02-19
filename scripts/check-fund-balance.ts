import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const FUND_ID = "58f8bcad-56b0-4369-a6c6-34c5d4aaa961"; // Euro Yield Fund (IND-EURC)

async function main() {
  const { data: positions, error } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("fund_id", FUND_ID)
    .eq("is_active", true);

  if (error) {
    console.error("Error:", error);
    return;
  }

  const total = positions?.reduce((sum, p) => sum + Number(p.current_value), 0) || 0;
  console.log(`Total AUM for IND-EURC (${FUND_ID}): ${total}`);
  console.log(`Position count: ${positions?.length || 0}`);
}

main().catch(console.error);
