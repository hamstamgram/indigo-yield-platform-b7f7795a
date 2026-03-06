import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL as string,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
);

async function testAuth() {
  console.log("Testing Auth for: qa.admin@indigo.fund");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "qa.admin@indigo.fund",
    password: "TestAdmin2026!",
  });

  if (error) {
    console.error("Auth Failed:", error.message);
  } else {
    console.log("Auth Success! User ID:", data.user?.id);
    console.log("Fetching profile...");
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, role")
      .eq("id", data.user?.id)
      .single();
    console.log("Profile:", profile);
  }
}

testAuth();
