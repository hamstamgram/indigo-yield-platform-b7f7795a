import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { useInvestorInvite } from "@/hooks/useInvestorInvite";

interface InvestorInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface InviteInvestorDialogProps {
  investor: InvestorInfo;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

/**
 * Dialog to send an invite to an existing investor profile.
 * Must be used with a specific investor - invites are now linked to profiles.
 */
const InviteInvestorDialog: React.FC<InviteInvestorDialogProps> = ({
  investor,
  trigger,
  onSuccess,
}) => {
  const [open, setOpen] = useState(false);
  const { createInvite, isSending } = useInvestorInvite(onSuccess);

  const investorName = investor.firstName
    ? `${investor.firstName}${investor.lastName ? ' ' + investor.lastName : ''}`
    : investor.email;

  const handleSendInvite = async () => {
    const success = await createInvite(investor);
    if (success) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Send Invite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Investor Invitation</DialogTitle>
          <DialogDescription>
            Send an invitation email to <strong>{investorName}</strong> at{" "}
            <strong>{investor.email}</strong>. They will be able to set up their
            account and access their investor dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              The invitation will be linked to this investor profile. When they
              accept and create their account, they will automatically have
              access to their portfolio data.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={handleSendInvite} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteInvestorDialog;
