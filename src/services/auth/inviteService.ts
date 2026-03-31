/**
 * Invite Service
 * Handles investor and admin invitation operations via platform_invites
 */

import { supabase } from "@/integrations/supabase/client";
import type { InviteDetails, UserMetadata } from "./types";

/**
 * Verify investor/admin invite token using the platform_invites table
 */
export async function verifyInvestorInvite(inviteCode: string): Promise<InviteDetails> {
  const { data, error } = await supabase
    .from("platform_invites")
    .select("email, expires_at, status")
    .eq("invite_code", inviteCode)
    .single();

  if (error || !data) {
    throw new Error("Invalid or expired invitation code");
  }

  if (data.status !== "pending") {
    throw new Error(`This invitation has already been ${data.status}`);
  }

  if (new Date(data.expires_at) < new Date()) {
    throw new Error("This invitation has expired");
  }

  return {
    email: data.email,
    expires_at: data.expires_at,
    used: false,
  };
}

/**
 * Legacy wrapper for admin invites (uses same table)
 */
export async function verifyAdminInvite(inviteCode: string): Promise<InviteDetails> {
  return verifyInvestorInvite(inviteCode);
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
  // 1. Final verification of code
  await verifyInvestorInvite(inviteCode);

  // 2. Sign up the user in Supabase Auth
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: metadata?.first_name,
        last_name: metadata?.last_name,
        onboarding_source: "platform_invite",
      },
    },
  });

  if (signUpError) throw signUpError;
  if (!signUpData.user) throw new Error("Failed to create user account");

  // 3. Mark invite as accepted
  const { error: updateError } = await supabase
    .from("platform_invites")
    .update({ 
      status: "accepted", 
      accepted_at: new Date().toISOString() 
    })
    .eq("invite_code", inviteCode);

  if (updateError) {
    console.error("Failed to update invite status:", updateError);
  }

  return signUpData.user.id;
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
  return acceptInvestorInvite(inviteCode, email, password, metadata);
}

/**
 * Polling function to wait for profile creation after signup
 */
export async function waitForProfile(userId: string, maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) return true;

    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
  }
  return false;
}
