import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: solFund } = await supabase.from("funds").select("id").eq("asset", "SOL").single();
  
  const { data, error } = await supabase.rpc("preview_segmented_yield_distribution_v5", {
    p_fund_id: solFund.id,
    p_period_end: "2025-10-31",
    p_recorded_aum: 1600,
    p_purpose: "reporting"
  });
  
  if (error) {
    console.error("RPC Error:", error);
    return;
  }
  
  console.log("Allocations:", JSON.stringify(data.allocations, null, 2));
}

run();
