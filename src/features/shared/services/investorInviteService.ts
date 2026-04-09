/**
 * Investor Invite Service
 * Handles creating invites and sending invite emails
 */

import { supabase } from "@/integrations/supabase/client";
import { logWarn, logError } from "@/lib/logger";

export interface InvestorInviteParams {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface InviteResult {
  success: boolean;
  error?: string;
}

/**
 * Create a platform invite record and send the invite email
 */
export async function createInvestorInvite(investor: InvestorInviteParams): Promise<InviteResult> {
  // Generate a cryptographically secure invite code
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const inviteCode = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Persist invite in database for audit trail
  const { error: inviteDbError } = await supabase.from("platform_invites").insert({
    email: investor.email,
    investor_id: investor.id,
    invite_code: inviteCode,
    expires_at: expiresAt.toISOString(),
    created_by: user?.id,
  });

  if (inviteDbError) {
    logError("createInvestorInvite.dbError", inviteDbError);
    // Continue anyway - email is the primary delivery
  }

  // Send invite email via notification service
  const inviteUrl = `${window.location.origin}/investor-invite?code=${inviteCode}`;
  const investorName = investor.firstName
    ? `${investor.firstName}${investor.lastName ? " " + investor.lastName : ""}`
    : "";

  try {
    const { error: emailError } = await supabase.functions.invoke("send-notification-email", {
      body: {
        to: investor.email,
        subject: "You're Invited to Join Indigo Yield",
        template: "welcome",
        data: {
          name: investorName || "Investor",
          loginLink: inviteUrl,
        },
      },
    });

    if (emailError) {
      logWarn("sendInvestorInviteEmail.apiError", { email: investor.email, error: emailError });
    }
  } catch (emailErr) {
    logWarn("sendInvestorInviteEmail.exception", { email: investor.email, error: emailErr });
  }

  return { success: true };
}
