import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdmin() {
  const email = "admin@test.indigo.com";
  const password = "testpassword123";

  console.log(`Creating admin user: ${email}`);

  // 1. Check if user exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers.users.find((u) => u.email === email);

  let userId;

  if (existingUser) {
    console.log("User already exists, updating password...");
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, { password });
    if (error) throw error;
    userId = existingUser.id;
  } else {
    console.log("Creating new user...");
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  }

  console.log(`User ID: ${userId}`);

  // 2. Ensure profile exists and has admin role
  // Check if profile exists
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (profile) {
    console.log("Profile exists, updating role to admin...");
    await supabase.from("profiles").update({ role: "admin" }).eq("id", userId);
  } else {
    console.log("Profile missing, creating admin profile...");
    await supabase.from("profiles").insert({
      id: userId,
      email: email,
      first_name: "Test",
      last_name: "Admin",
      role: "admin",
    });
  }

  console.log("✅ Admin user ready.");
}

createAdmin().catch((e) => {
  console.error(e);
  process.exit(1);
});
