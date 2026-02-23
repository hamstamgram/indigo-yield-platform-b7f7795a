import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Textarea,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { Undo2, Loader2, Info } from "lucide-react";
import type { DistributionRow } from "@/services/admin/yields/yieldDistributionsPageService";

interface BulkRestoreDistributionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  distributions: DistributionRow[];
  summary: { count: number };
  isPending: boolean;
  onConfirm: (reason: string) => void;
}

export function BulkRestoreDistributionsDialog({
  open,
  onOpenChange,
  distributions,
  summary,
  isPending,
  onConfirm,
}: BulkRestoreDistributionsDialogProps) {
  const [reason, setReason] = useState("");

  const handleClose = () => {
    setReason("");
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (reason.trim().length < 3) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Restore {summary.count} Distribution{summary.count !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            This will restore all selected voided yield distributions back to active status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <Alert className="border-emerald-500/50 bg-emerald-500/10">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-600" />
              <AlertDescription className="text-emerald-700 text-sm">
                Restored distributions will return to active status and recalculate affected
                investor positions.
              </AlertDescription>
            </div>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="bulk-restore-dist-reason">Reason for restoring *</Label>
            <Textarea
              id="bulk-restore-dist-reason"
              placeholder="Explain why these distributions are being restored..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 3 characters. Applied to all distributions in this batch.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || reason.trim().length < 3}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Restore All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
