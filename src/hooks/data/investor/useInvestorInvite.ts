import { useState } from "react";
import { useToast } from "@/hooks";
import { supabase } from "@/integrations/supabase/client";
import { inviteService } from "@/services/shared";

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

      // Store invite in the database linked to the investor profile
      await inviteService.createInvestorInvite({
        email: investor.email,
        inviteCode,
        createdBy: user?.id,
        expiresAt: expiresAt.toISOString(),
        investorId: investor.id,
      });

      // Send invite email
      const inviteUrl = `${window.location.origin}/investor-invite?code=${inviteCode}`;
      const investorName = investor.firstName 
        ? `${investor.firstName}${investor.lastName ? ' ' + investor.lastName : ''}` 
        : '';
      
      try {
        const { error: emailError } = await supabase.functions.invoke("send-email", {
          body: {
            to: investor.email,
            subject: "You're Invited to Join Indigo Yield Platform",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #4F46E5;">Welcome to Indigo Yield</h1>
                ${investorName ? `<p>Hello ${investorName},</p>` : ''}
                <p>You've been invited to join the Indigo Yield investment platform.</p>
                <p>Click the button below to create your account:</p>
                <a href="${inviteUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                  Accept Invitation
                </a>
                <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
                <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
              </div>
            `,
            email_type: "investor_invite",
          },
        });

        if (emailError) {
          console.warn("Failed to send invite email:", emailError);
        }
      } catch (emailErr) {
        console.warn("Email sending error:", emailErr);
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
      console.error("Error creating invite:", error);
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
