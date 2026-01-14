/**
 * RejectDialog - Dialog for rejecting an approval request
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
import { XCircle, AlertTriangle } from "lucide-react";
import { useApprovalMutations } from "@/hooks/admin/useApprovals";
import type { PendingApproval } from "@/types/domains/approval";

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approval: PendingApproval | null;
  onSuccess: () => void;
}

export function RejectDialog({ open, onOpenChange, approval, onSuccess }: RejectDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { rejectRequest, isRejecting } = useApprovalMutations();

  const handleReject = async () => {
    if (!approval) return;

    // Validate reason length
    if (reason.trim().length < 10) {
      setError("Please provide a reason with at least 10 characters.");
      return;
    }

    setError(null);

    const result = await rejectRequest({
      approvalId: approval.approval_id,
      reason: reason.trim(),
    });

    if (result.success) {
      setReason("");
      onSuccess();
    }
  };

  const handleClose = () => {
    setReason("");
    setError(null);
    onOpenChange(false);
  };

  if (!approval) return null;

  const isOwnRequest = false; // Could be passed as prop if needed

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            {isOwnRequest ? "Cancel Request" : "Reject Request"}
          </DialogTitle>
          <DialogDescription>
            {isOwnRequest
              ? "You are cancelling your own approval request."
              : "You are rejecting this approval request."}
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
          </div>

          {/* Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {isOwnRequest
                ? "This will cancel the approval request. The operation will not proceed."
                : "The requester will be notified that their request was rejected."}
            </AlertDescription>
          </Alert>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Rejection Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder={
                isOwnRequest
                  ? "Why are you cancelling this request?"
                  : "Please explain why this request is being rejected..."
              }
              rows={3}
              className={error ? "border-red-500" : ""}
            />
            <div className="flex justify-between text-xs">
              <span className={error ? "text-red-500" : "text-muted-foreground"}>
                {error || "Minimum 10 characters required"}
              </span>
              <span className="text-muted-foreground">{reason.length} characters</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={reason.trim().length < 10 || isRejecting}
          >
            <XCircle className="h-4 w-4 mr-2" />
            {isRejecting ? "Processing..." : isOwnRequest ? "Cancel Request" : "Reject Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
