import { useState } from "react";
import { useToast } from "@/hooks";
import { createInvestorInvite, type InvestorInviteParams } from "@/features/shared/services/investorInviteService";
import { logError } from "@/lib/logger";

export const useInvestorInvite = (onSuccess?: () => void) => {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const createInvite = async (investor: InvestorInviteParams) => {
    try {
      setIsSending(true);

      await createInvestorInvite(investor);

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
