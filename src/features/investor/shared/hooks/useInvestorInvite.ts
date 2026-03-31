import { useState } from "react";
import { useToast } from "@/hooks";
import { supabase } from "@/integrations/supabase/client";
import { inviteService } from "@/services/shared";
import { logWarn, logError } from "@/lib/logger";

interface InvestorInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export const useInvestorInvite = (onSuccess?: () => void) => {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  /**
   * Create an invite for an existing investor profile
   * @param investor - The investor profile to send the invite to
   */
  const createInvite = async (investor: InvestorInfo) => {
    try {
      setIsSending(true);

      // Generate a cryptographically secure invite code
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const inviteCode = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Invite expires in 7 days

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
        ? `${investor.firstName}${investor.lastName ? ' ' + investor.lastName : ''}` 
        : '';
      
      try {
        const { error: emailError } = await supabase.functions.invoke("send-notification-email", {
          body: {
            to: investor.email,
            subject: "You're Invited to Join Indigo Yield",
            template: "welcome", // Use established welcome template
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
        // Don't fail the invite creation if email fails
      }

      if (onSuccess) {
        onSuccess();
      }

      toast({
        title: "Investor Invite Sent",
        description: `An invitation email has been sent to ${investor.email}.`,
      });

      return true;
    } catch (error) {
      logError("createInvestorInvite", error, { investorId: investor.id, email: investor.email });
      toast({
        title: "Error",
        description: "Failed to create invitation. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return {
    createInvite,
    isSending,
  };
};
