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
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

interface BulkVoidDistributionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: { count: number };
  isPending: boolean;
  onConfirm: (reason: string) => void;
}

export function BulkVoidDistributionsDialog({
  open,
  onOpenChange,
  summary,
  isPending,
  onConfirm,
}: BulkVoidDistributionsDialogProps) {
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
            <Trash2 className="h-5 w-5 text-destructive" />
            Void {summary.count} Distribution{summary.count !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            This will void all selected yield distributions and reverse their effects on investor
            positions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <Alert className="border-destructive/50 bg-destructive/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive" />
              <AlertDescription className="text-destructive text-sm">
                Voided distributions will reverse all yield, fee, and IB allocations for the
                selected distributions. This action can be undone via restore.
              </AlertDescription>
            </div>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="bulk-void-dist-reason">Reason for voiding *</Label>
            <Textarea
              id="bulk-void-dist-reason"
              placeholder="Explain why these distributions are being voided..."
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
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || reason.trim().length < 3}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Void All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
