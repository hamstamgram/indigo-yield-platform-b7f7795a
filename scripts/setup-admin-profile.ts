import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Signing in to get UID...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "qa.admin@indigo.fund",
    password: "QaTest2026!",
  });

  if (authError || !authData.user) {
    console.error("Auth failed:", authError?.message);
    return;
  }

  const uid = authData.user.id;
  console.log(`UID for qa.admin: ${uid}`);

  console.log("Creating profile...");
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: uid,
    email: "qa.admin@indigo.fund",
    is_admin: true,
    status: "active",
  });

  if (profileError) {
    console.error("Profile creation failed:", profileError.message);
  } else {
    console.log("Profile created/updated.");
  }

  console.log("Assigning admin role...");
  const { error: roleError } = await supabase.from("user_roles").upsert({
    user_id: uid,
    role: "admin",
  });

  if (roleError) {
    console.error("Role assignment failed:", roleError.message);
  } else {
    console.log("Admin role assigned.");
  }
}

main().catch(console.error);
