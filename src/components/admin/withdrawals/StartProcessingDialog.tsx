import { useState, useEffect } from "react";
import { Withdrawal } from "@/types/domains";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Button, Input, Label, Textarea,
} from "@/components/ui";
import { withdrawalService } from "@/services";
import { toast } from "sonner";
import { Loader2, Play } from "lucide-react";

interface StartProcessingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: Withdrawal;
  onSuccess: () => void;
}

export function StartProcessingDialog({
  open,
  onOpenChange,
  withdrawal,
  onSuccess,
}: StartProcessingDialogProps) {
  const [txHash, setTxHash] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setTxHash("");
      setAdminNotes("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await withdrawalService.markAsProcessing(withdrawal.id, txHash || undefined, adminNotes || undefined);
      toast.success("Withdrawal marked as processing");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error starting processing:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start processing");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-600" />
            Start Processing Withdrawal
          </DialogTitle>
          <DialogDescription>
            Mark this approved withdrawal as processing for {withdrawal.investor_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Investor</Label>
                <p className="text-sm text-muted-foreground">{withdrawal.investor_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Processed Amount</Label>
                <p className="text-sm text-muted-foreground">
                  {(withdrawal.processed_amount || withdrawal.requested_amount).toLocaleString()}{" "}
                  {(withdrawal.fund_class || "UNITS").toUpperCase()}
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="txHash">Transaction Hash (Optional)</Label>
              <Input
                id="txHash"
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Blockchain transaction hash if available
              </p>
            </div>
            <div>
              <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about processing..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Processing
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
