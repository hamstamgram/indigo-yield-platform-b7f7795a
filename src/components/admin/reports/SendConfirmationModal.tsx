import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Send, AlertTriangle, Clock, Mail, User, Calendar } from "lucide-react";
import { format } from "date-fns";

interface SendConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investorName: string;
  periodName: string;
  recipientEmails: string[];
  generatedAt?: string;
  isOutdated?: boolean;
  onConfirmSend: () => Promise<void>;
  isSending?: boolean;
}

export function SendConfirmationModal({
  open,
  onOpenChange,
  investorName,
  periodName,
  recipientEmails,
  generatedAt,
  isOutdated = false,
  onConfirmSend,
  isSending = false,
}: SendConfirmationModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  const handleSend = async () => {
    if (!confirmed || isOutdated) return;
    await onConfirmSend();
    setConfirmed(false);
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmed(false);
    }
    onOpenChange(open);
  };

  const noRecipients = recipientEmails.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Confirm Send Statement
          </DialogTitle>
          <DialogDescription>
            Review the details before sending this statement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Investor & Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                Investor
              </div>
              <p className="font-medium">{investorName}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Period
              </div>
              <p className="font-medium">{periodName}</p>
            </div>
          </div>

          {/* Generated timestamp */}
          {generatedAt && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last Generated
              </div>
              <p className="text-sm">{format(new Date(generatedAt), "PPp")}</p>
            </div>
          )}

          {/* Outdated warning */}
          {isOutdated && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Report is Out of Date</AlertTitle>
              <AlertDescription>
                The underlying data has changed since this report was generated.
                Please regenerate the report before sending.
              </AlertDescription>
            </Alert>
          )}

          {/* Recipients */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              Recipients ({recipientEmails.length})
            </div>
            {noRecipients ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Recipients Configured</AlertTitle>
                <AlertDescription>
                  This investor has no email addresses configured. Please add recipients
                  in the investor profile before sending.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-wrap gap-1">
                {recipientEmails.map((email, i) => (
                  <Badge key={i} variant="secondary" className="font-normal">
                    {email}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Confirmation checkbox */}
          {!isOutdated && !noRecipients && (
            <div className="flex items-start space-x-2 pt-2 border-t">
              <Checkbox
                id="confirm-send"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
                disabled={isSending}
              />
              <label
                htmlFor="confirm-send"
                className="text-sm leading-tight cursor-pointer"
              >
                I confirm this report is final for {periodName} and ready to be sent
                to {recipientEmails.length} recipient{recipientEmails.length !== 1 ? "s" : ""}
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!confirmed || isOutdated || noRecipients || isSending}
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
