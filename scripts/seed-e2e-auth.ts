import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function ensureE2EUsers() {
  console.log("Forcing E2E Test Credentials onto Database...");

  const users = [
    {
      email: "qa.admin@indigo.fund",
      password: "TestAdmin2026!",
      role: "admin",
      firstName: "QA",
      lastName: "Admin",
      is_admin: true,
      type: "investor",
    },
    {
      email: "alice@test.indigo.com",
      password: "Alice!Investor2026#Secure",
      role: "investor",
      firstName: "Alice",
      lastName: "Test",
      is_admin: false,
      type: "investor",
    },
    {
      email: "fees@indigo.fund",
      password: "SystemUser2026#Fees",
      role: "admin",
      firstName: "Indigo",
      lastName: "Fees Account",
      is_admin: true,
      type: "fees_account",
    },
  ];

  for (const u of users) {
    console.log(`Processing ${u.email}...`);

    // 1. Create or Update Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: `${u.firstName} ${u.lastName}` },
    });

    let userId = authData?.user?.id;

    if (authError && authError.message.includes("already been registered")) {
      console.log(`User exists. Updating password for ${u.email}...`);

      // Find user by email
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find((x) => x.email === u.email);

      if (existingUser) {
        userId = existingUser.id;
        await supabase.auth.admin.updateUserById(userId, { password: u.password });
        console.log("Password Force Updated.");
      }
    } else if (authError) {
      console.error("Auth Create Error:", authError.message);
      continue;
    } else {
      console.log("Auth User Created.");
    }

    if (!userId) continue;

    // 2. Ensure Profile exists with correct Role
    console.log(`Ensuring Profile roles... UserID: ${userId}`);
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email: u.email,
      first_name: u.firstName,
      last_name: u.lastName,
      role: u.role,
      is_admin: u.is_admin,
      status: "active",
      account_type: u.type,
    });

    if (profileError) {
      console.error("Profile Upsert Error:", profileError.message);
    } else {
      console.log("Profile Upserted.");
    }

    // 3. Ensure User Role exists
    if (u.is_admin) {
      console.log(`Ensuring Admin Role... UserID: ${userId}`);
      const { error: roleError } = await supabase.from("user_roles").upsert(
        {
          user_id: userId,
          role: "admin",
        },
        { onConflict: "user_id, role" }
      );

      if (roleError) {
        console.error("Role Upsert Error:", roleError.message);
      } else {
        console.log("Admin Role Upserted.");
      }
    }
  }

  // 4. Ensure Indigo Alpha Fund exists
  console.log("Ensuring Indigo Alpha Fund exists...");
  const { error: fundError } = await supabase.from("funds").upsert({
    id: "d290f1ee-6c54-4b01-90e6-d701748f0851",
    name: "Indigo Alpha Fund",
    code: "INDIGO01",
    asset: "USDT",
    fund_class: "USDT",
    status: "active",
  });

  if (fundError) {
    console.error("Fund Upsert Error:", fundError.message);
  } else {
    console.log("Indigo Alpha Fund Upserted.");
  }

  console.log("E2E Setup Script Finished!");
}

ensureE2EUsers();
