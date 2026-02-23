import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostic() {
  console.log("--- RPC Diagnostic: get_active_funds_summary ---");
  const { data, error } = await supabase.rpc("get_active_funds_summary");

  if (error) {
    console.error("RPC Error:", error);
    return;
  }

  console.log(`Found ${data.length} funds`);
  data.forEach((f, i) => {
    console.log(`[${i}] ID: ${f.id} | Name: ${f.name} | Code: ${f.code} | Asset: ${f.asset}`);
  });
  console.log("--- End Diagnostic ---");
}

diagnostic();
