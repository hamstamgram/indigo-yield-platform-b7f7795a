import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: admin } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("email", "qa.admin@indigo.fund")
    .maybeSingle();

  if (!admin) {
    console.log("QA Admin profile not found.");
    return;
  }

  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", admin.id);

  console.log(`Roles for ${admin.email} (ID: ${admin.id}):`, roles || error);
}

main().catch(console.error);
