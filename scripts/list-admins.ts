import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: profileAdmins } = await supabase
    .from("profiles")
    .select("id, email, is_admin")
    .eq("is_admin", true)
    .limit(10);

  console.log("Admins by is_admin flag:", profileAdmins);

  const { data: roleAdmins } = await supabase
    .from("user_roles")
    .select("user_id, role, profiles(email)")
    .in("role", ["admin", "super_admin"])
    .limit(10);

  console.log("Admins by user_roles table:", roleAdmins);
}

main().catch(console.error);
