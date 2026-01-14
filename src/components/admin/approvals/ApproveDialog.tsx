/**
 * ApproveDialog - Confirmation dialog for approving a request
 */

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
import { CheckCircle2, Shield, AlertTriangle } from "lucide-react";
import { useApprovalMutations } from "@/hooks/admin/useApprovals";
import type { PendingApproval } from "@/types/domains/approval";

interface ApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approval: PendingApproval | null;
  onSuccess: () => void;
}

export function ApproveDialog({ open, onOpenChange, approval, onSuccess }: ApproveDialogProps) {
  const [notes, setNotes] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const { approveRequest, isApproving } = useApprovalMutations();

  const handleApprove = async () => {
    if (!approval) return;

    if (confirmText !== "APPROVE") {
      return;
    }

    const result = await approveRequest({
      approvalId: approval.approval_id,
      notes: notes || undefined,
    });

    if (result.success) {
      setNotes("");
      setConfirmText("");
      onSuccess();
    }
  };

  const handleClose = () => {
    setNotes("");
    setConfirmText("");
    onOpenChange(false);
  };

  if (!approval) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Approve Request
          </DialogTitle>
          <DialogDescription>
            You are providing second-person authorization for this operation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Request Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Action:</span>
              <span className="font-medium">{approval.action_description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requester:</span>
              <span>{approval.requester_name}</span>
            </div>
            {approval.actual_value && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">
                  $
                  {approval.actual_value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reason:</span>
              <span className="text-right max-w-[200px]">{approval.reason}</span>
            </div>
          </div>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              By approving, you confirm that you have reviewed this request and authorize the
              operation to proceed. This action will be logged with cryptographic verification.
            </AlertDescription>
          </Alert>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Approval Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this approval..."
              rows={2}
            />
          </div>

          {/* Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <span className="font-mono font-bold">APPROVE</span> to confirm
            </Label>
            <input
              id="confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border rounded-md font-mono text-center"
              placeholder="APPROVE"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={confirmText !== "APPROVE" || isApproving}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isApproving ? "Approving..." : "Approve Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
