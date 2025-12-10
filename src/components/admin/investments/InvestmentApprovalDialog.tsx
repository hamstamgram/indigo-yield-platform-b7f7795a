// @ts-nocheck
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { investmentService } from "@/services/investmentService";
import { toast } from "sonner";
import type { Investment } from "@/types/investment";

interface InvestmentApprovalDialogProps {
  investment: Investment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InvestmentApprovalDialog({
  investment,
  open,
  onOpenChange,
  onSuccess,
}: InvestmentApprovalDialogProps) {
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [mode, setMode] = useState<"approve" | "reject">("approve");

  if (!investment) return null;

  const handleApprove = async () => {
    if (!shares || Number(shares) <= 0) {
      toast.error("Please enter a valid number of shares");
      return;
    }

    setLoading(true);
    try {
      await investmentService.approveInvestment(investment.id, Number(shares));
      toast.success("Investment approved successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error approving investment:", error);
      toast.error(error.message || "Failed to approve investment");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setLoading(true);
    try {
      await investmentService.rejectInvestment(investment.id, rejectionReason);
      toast.success("Investment rejected");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error rejecting investment:", error);
      toast.error(error.message || "Failed to reject investment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "approve" ? "Approve Investment" : "Reject Investment"}
          </DialogTitle>
          <DialogDescription>
            Investment from {investment.investor_name} for $
            {Number(investment.amount).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Fund:</div>
            <div className="font-medium">{investment.fund_name}</div>
            <div className="text-muted-foreground">Amount:</div>
            <div className="font-medium">${Number(investment.amount).toLocaleString()}</div>
            <div className="text-muted-foreground">Date:</div>
            <div className="font-medium">
              {new Date(investment.investment_date).toLocaleDateString()}
            </div>
            <div className="text-muted-foreground">Type:</div>
            <div className="font-medium capitalize">{investment.transaction_type}</div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={mode === "approve" ? "primary" : "outline"}
              onClick={() => setMode("approve")}
              className="flex-1"
            >
              Approve
            </Button>
            <Button
              variant={mode === "reject" ? "destructive" : "outline"}
              onClick={() => setMode("reject")}
              className="flex-1"
            >
              Reject
            </Button>
          </div>

          {mode === "approve" ? (
            <div className="space-y-2">
              <Label htmlFor="shares">Number of Shares</Label>
              <Input
                id="shares"
                type="number"
                step="0.0001"
                placeholder="Enter shares to allocate"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Shares will be allocated based on the fund's NAV at investment date
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="Provide a reason for rejecting this investment..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          {mode === "approve" ? (
            <Button onClick={handleApprove} disabled={loading}>
              {loading ? "Approving..." : "Approve Investment"}
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleReject} disabled={loading}>
              {loading ? "Rejecting..." : "Reject Investment"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// @ts-nocheck
