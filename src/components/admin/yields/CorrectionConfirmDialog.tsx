/**
 * Correction Confirm Dialog
 * Requires typed confirmation before applying yield corrections
 */

import { useState } from "react";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Button, Input, Label, Textarea,
} from "@/components/ui";

interface CorrectionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMonthClosed: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: (confirmation: string) => void;
  isPending: boolean;
}

export function CorrectionConfirmDialog({
  open,
  onOpenChange,
  isMonthClosed,
  reason,
  onReasonChange,
  onConfirm,
  isPending,
}: CorrectionConfirmDialogProps) {
  const [confirmation, setConfirmation] = useState("");

  const requiredConfirmation = isMonthClosed
    ? "APPLY CLOSED MONTH CORRECTION"
    : "APPLY CORRECTION";

  const isValid = confirmation === requiredConfirmation && reason.trim().length >= 10;

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(confirmation);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirm Yield Correction
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              This action will create a <strong>new distribution version</strong> with delta 
              transactions to adjust investor positions.
            </span>
            {isMonthClosed && (
              <span className="block text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ This is a closed month correction requiring Super Admin approval.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Correction <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Explain why this correction is needed (minimum 10 characters)..."
              rows={3}
              className={reason.trim().length < 10 ? "border-destructive" : ""}
            />
            {reason.trim().length > 0 && reason.trim().length < 10 && (
              <p className="text-xs text-destructive">
                Reason must be at least 10 characters ({reason.trim().length}/10)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <code className="px-1 py-0.5 bg-muted rounded text-xs">{requiredConfirmation}</code> to confirm
            </Label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={requiredConfirmation}
              className={
                confirmation.length > 0 && confirmation !== requiredConfirmation
                  ? "border-destructive"
                  : confirmation === requiredConfirmation
                    ? "border-green-500"
                    : ""
              }
            />
            {confirmation === requiredConfirmation && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Confirmation matches
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Apply Correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
