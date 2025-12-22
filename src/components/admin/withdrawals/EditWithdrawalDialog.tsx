import { useState, useEffect } from "react";
import { Withdrawal } from "@/types/withdrawal";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Pencil, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: Withdrawal | null;
  onSuccess?: () => void;
}

const WITHDRAWAL_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "full", label: "Full Redemption" },
  { value: "partial", label: "Partial" },
  { value: "fee_collection", label: "Fee Collection" },
];

export function EditWithdrawalDialog({
  open,
  onOpenChange,
  withdrawal,
  onSuccess,
}: EditWithdrawalDialogProps) {
  const [requestedAmount, setRequestedAmount] = useState("");
  const [withdrawalType, setWithdrawalType] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (withdrawal && open) {
      setRequestedAmount(withdrawal.requested_amount.toString());
      setWithdrawalType(withdrawal.withdrawal_type || "standard");
      setNotes(withdrawal.notes || "");
      setReason("");
      setConfirmText("");
    }
  }, [withdrawal, open]);

  const isConfirmed = confirmText === "EDIT";
  const hasChanges =
    withdrawal &&
    (parseFloat(requestedAmount) !== withdrawal.requested_amount ||
      withdrawalType !== withdrawal.withdrawal_type ||
      notes !== (withdrawal.notes || ""));

  const handleSubmit = async () => {
    if (!withdrawal || !isConfirmed || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("update_withdrawal", {
        p_withdrawal_id: withdrawal.id,
        p_requested_amount: parseFloat(requestedAmount),
        p_withdrawal_type: withdrawalType,
        p_notes: notes || null,
        p_reason: reason,
      });

      if (error) {
        console.error("Update withdrawal error:", error);
        toast.error(error.message || "Failed to update withdrawal");
        return;
      }

      toast.success("Withdrawal updated successfully");
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawal-details", withdrawal.id] });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Update withdrawal exception:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!withdrawal) return null;

  const canEdit = withdrawal.status === "pending" || withdrawal.status === "approved";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Withdrawal
          </DialogTitle>
          <DialogDescription>
            Edit withdrawal request for {withdrawal.investor_name}
          </DialogDescription>
        </DialogHeader>

        {!canEdit ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Cannot edit withdrawal with status "{withdrawal.status}". Only pending or approved withdrawals can be edited.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted rounded-md p-3 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Investor:</span>{" "}
                <span className="font-medium">{withdrawal.investor_name}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Fund:</span>{" "}
                <span className="font-medium">{withdrawal.fund_name || withdrawal.fund_code}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                <span className="font-medium capitalize">{withdrawal.status}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requested-amount">Requested Amount</Label>
              <Input
                id="requested-amount"
                type="number"
                step="0.00000001"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdrawal-type">Withdrawal Type</Label>
              <Select value={withdrawalType} onValueChange={setWithdrawalType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {WITHDRAWAL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Edit *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you editing this withdrawal?"
                rows={2}
              />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Type <strong>EDIT</strong> to confirm changes. This action is logged for audit purposes.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm by typing EDIT</Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="EDIT"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canEdit || isSubmitting || !isConfirmed || !reason.trim() || !hasChanges}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
