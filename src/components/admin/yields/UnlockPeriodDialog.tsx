/**
 * Unlock Period Dialog
 * Allows super admins to unlock a locked period for yield corrections
 */

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Button, Textarea, Label,
} from "@/components/ui";
import { Loader2, Unlock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { snapshotService } from "@/services/operations/snapshotService";
import { useAuth } from "@/services/auth";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS, YIELD_RELATED_KEYS } from "@/constants/queryKeys";

interface UnlockPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fundId: string;
  fundName: string;
  periodId: string;
  periodLabel: string; // e.g., "November 2025"
  onSuccess?: () => void;
}

export function UnlockPeriodDialog({
  open,
  onOpenChange,
  fundId,
  fundName,
  periodId,
  periodLabel,
  onSuccess,
}: UnlockPeriodDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleUnlock = async () => {
    if (!user || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await snapshotService.unlockPeriodSnapshot(
        fundId,
        periodId,
        user.id,
        reason.trim()
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to unlock period");
      }

      toast.success(`Period unlocked: ${fundName} - ${periodLabel}`);

      // Invalidate relevant queries
      YIELD_RELATED_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.funds });
      queryClient.invalidateQueries({ queryKey: ["fund-period-snapshots"] });

      setReason("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unlock period");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-amber-600" />
            Unlock Period
          </DialogTitle>
          <DialogDescription>
            Unlock <strong>{fundName}</strong> for <strong>{periodLabel}</strong> to allow yield modifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium">Super Admin Action</p>
              <p className="mt-1">
                Unlocking allows yield modifications for this period. This action is logged for audit purposes.
              </p>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="unlock-reason">Reason for unlocking *</Label>
            <Textarea
              id="unlock-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Need to correct yield distribution for November..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be recorded in the audit log.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUnlock}
            disabled={!reason.trim() || isSubmitting}
            variant="destructive"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Unlock Period
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
