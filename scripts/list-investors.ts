import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Signing in as QA Admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "qa.admin@indigo.fund",
    password: "QaTest2026!",
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }
  console.log("Logged in as:", authData.user.id);

  const { data: investors, error } = await supabase
    .from("profiles")
    .select("id, email, is_admin")
    .limit(20);

  if (error) {
    console.error("Error fetching investors:", error);
  } else {
    console.log("Investors found:", investors);
  }
}

main().catch(console.error);
