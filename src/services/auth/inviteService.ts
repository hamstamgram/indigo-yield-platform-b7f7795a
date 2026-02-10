/**
 * Invite Service
 * Handles investor and admin invitation operations
 */

import { supabase } from "@/integrations/supabase/client";
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
 * NOTE: investor_invites table was dropped
 */
export async function verifyInvestorInvite(_inviteCode: string): Promise<InviteDetails> {
  throw new Error("Investor invites feature has been removed");
}

/**
 * Verify admin invite token
 * NOTE: admin_invites table was dropped
 */
export async function verifyAdminInvite(_inviteCode: string): Promise<InviteDetails> {
  throw new Error("Admin invites feature has been removed");
}

/**
 * Accept investor invitation and create account
 * NOTE: investor_invites table was dropped
 */
export async function acceptInvestorInvite(
  _inviteCode: string,
  _email: string,
  _password: string,
  _metadata?: UserMetadata
): Promise<string> {
  throw new Error("Investor invites feature has been removed");
}

/**
 * Accept admin invitation and create account
 * NOTE: admin_invites table was dropped
 */
export async function acceptAdminInvite(
  _inviteCode: string,
  _email: string,
  _password: string,
  _metadata?: UserMetadata
): Promise<string> {
  throw new Error("Admin invites feature has been removed");
}
