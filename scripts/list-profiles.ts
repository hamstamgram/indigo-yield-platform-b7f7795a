import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, account_type, is_admin")
    .limit(20);

  if (error) {
    console.error("Error fetching profiles:", error);
  } else {
    console.log("Profiles found:", profiles);
  }
}

main().catch(console.error);
