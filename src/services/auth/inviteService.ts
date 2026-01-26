/**
 * Invite Service
 * Handles investor and admin invitation operations
 */

import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import type { InviteDetails, UserMetadata } from "./types";

/**
 * Wait for profile to be created by database trigger
 */
export async function waitForProfile(userId: string, maxAttempts = 10): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profile) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

/**
 * Verify investor invite token
 */
export async function verifyInvestorInvite(inviteCode: string): Promise<InviteDetails> {
  const { data, error } = await supabase
    .from("investor_invites")
    .select("*")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Invalid invitation link");

  const inviteData = data as unknown as InviteDetails;

  if (inviteData.used) {
    throw new Error("This invitation has already been used");
  }

  const now = new Date();
  const expiryDate = new Date(inviteData.expires_at);
  if (now > expiryDate) {
    throw new Error("This invitation has expired");
  }

  return inviteData;
}

/**
 * Verify admin invite token
 */
export async function verifyAdminInvite(inviteCode: string): Promise<InviteDetails> {
  const { data, error } = await supabase
    .from("admin_invites")
    .select("*")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Invalid invitation link");

  if (data.used) {
    throw new Error("This invitation has already been used");
  }

  const now = new Date();
  const expiryDate = new Date(data.expires_at);
  if (now > expiryDate) {
    throw new Error("This invitation has expired");
  }

  return {
    email: data.email,
    used: data.used ?? false,
    expires_at: data.expires_at,
    intended_role: (data.intended_role as "admin" | "super_admin") || "admin",
  };
}

/**
 * Accept investor invitation and create account
 */
export async function acceptInvestorInvite(
  inviteCode: string,
  email: string,
  password: string,
  metadata?: UserMetadata
): Promise<string> {
  // 1. Sign up the user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
      data: metadata,
    },
  });

  if (signUpError) throw signUpError;

  const userId = signUpData.user?.id;
  if (!userId) throw new Error("User ID not returned from signup");

  // 2. Mark invite as used
  const { error: updateError } = await supabase
    .from("investor_invites")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("invite_code", inviteCode);

  if (updateError) throw updateError;

  // 3. Wait for profile to be created
  await waitForProfile(userId);

  // 4. Update profile with name
  if (metadata) {
    await supabase
      .from("profiles")
      .update({
        first_name: metadata.first_name,
        last_name: metadata.last_name,
      })
      .eq("id", userId);
  }

  return userId;
}

/**
 * Accept admin invitation and create account
 */
export async function acceptAdminInvite(
  inviteCode: string,
  email: string,
  password: string,
  metadata?: UserMetadata
): Promise<string> {
  // 1. Fetch invite to get intended_role
  const { data: invite, error: inviteError } = await supabase
    .from("admin_invites")
    .select("intended_role")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (inviteError) throw inviteError;
  if (!invite) throw new Error("Invite not found or has expired");

  const intendedRole = invite?.intended_role || "admin";

  // 2. Sign up the user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/admin`,
      data: metadata,
    },
  });

  if (signUpError) throw signUpError;

  const userId = signUpData.user?.id;
  if (!userId) throw new Error("User ID not returned from signup");

  // 3. Mark invite as used
  const { error: updateError } = await supabase
    .from("admin_invites")
    .update({ used: true })
    .eq("invite_code", inviteCode);

  if (updateError) throw updateError;

  // 4. Wait for profile to be created
  await waitForProfile(userId);

  // 5. Update profile with admin flag and name
  await supabase
    .from("profiles")
    .update({
      is_admin: true,
      first_name: metadata?.first_name,
      last_name: metadata?.last_name,
    })
    .eq("id", userId);

  // 6. Insert role using intended_role from invite
  const { error: roleError } = await db.insert("user_roles", {
    user_id: userId,
    role: intendedRole as "admin" | "ib" | "investor" | "moderator" | "super_admin" | "user",
  });

  if (roleError) throw new Error(roleError.userMessage);

  return userId;
}
