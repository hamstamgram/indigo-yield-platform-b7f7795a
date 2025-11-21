#!/usr/bin/env node
/**
 * Admin Password Reset Script
 * Bypasses rate limits using service role key
 *
 * Usage: node scripts/admin-reset-password.js <email> <new-password>
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://nkfimvovosdehmyyjubn.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  console.log("\nGet your service role key from:");
  console.log("https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/api");
  process.exit(1);
}

const [, , email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error("❌ Usage: node scripts/admin-reset-password.js <email> <new-password>");
  console.log("\nExample:");
  console.log("  node scripts/admin-reset-password.js hammadou@indigo.fund NewSecurePass123!");
  process.exit(1);
}

// Create admin client with service role key (bypasses RLS and rate limits)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetPassword() {
  try {
    console.log(`🔄 Resetting password for: ${email}`);

    // Get user by email
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    const user = users.users.find((u) => u.email === email);

    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    console.log(`✅ Found user: ${user.id}`);

    // Update password using admin API (bypasses rate limits)
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }

    console.log("✅ Password reset successfully!");
    console.log(`\n📧 User can now login with:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log("\n⚠️  Make sure to save this password securely!");
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

resetPassword();
