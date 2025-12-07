import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useInvestorInvite = (onSuccess?: () => void) => {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const createInvite = async (email: string) => {
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

      // Store or create invite in the database
      const { error: inviteError } = await supabase.from("investor_invites" as any).insert({
        email: email,
        invite_code: inviteCode,
        created_by: user?.id,
        expires_at: expiresAt.toISOString(),
      });

      if (inviteError) {
        console.error("Invite creation error:", inviteError);
        throw inviteError;
      }

      if (onSuccess) {
        onSuccess();
      }

      toast({
        title: "Investor Invite Created",
        description: `An invitation has been created for ${email}.`,
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
