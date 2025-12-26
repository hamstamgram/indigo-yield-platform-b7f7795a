import { useState } from "react";
import { Withdrawal } from "@/types/withdrawal";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { invalidateAfterWithdrawal } from "@/utils/cacheInvalidation";

interface RouteToFeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: Withdrawal | null;
  onSuccess?: () => void;
}

export function RouteToFeesDialog({
  open,
  onOpenChange,
  withdrawal,
  onSuccess,
}: RouteToFeesDialogProps) {
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!withdrawal) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("route_withdrawal_to_fees", {
        p_withdrawal_id: withdrawal.id,
        p_admin_notes: adminNotes || null,
      });

      if (error) {
        console.error("Route to fees error:", error);
        toast.error(error.message || "Failed to route withdrawal to INDIGO FEES");
        return;
      }

      const result = data as { success: boolean; already_routed?: boolean; message: string };
      
      if (result.already_routed) {
        toast.info(result.message);
      } else {
        toast.success("Withdrawal routed to INDIGO FEES successfully");
      }

      // Use centralized cache invalidation
      invalidateAfterWithdrawal(queryClient, withdrawal.investor_id, withdrawal.fund_id, withdrawal.id);

      onOpenChange(false);
      setAdminNotes("");
      onSuccess?.();
    } catch (err) {
      console.error("Route to fees exception:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!withdrawal) return null;

  const amount = withdrawal.processed_amount || withdrawal.requested_amount;
  const asset = withdrawal.asset || withdrawal.fund_class || "UNITS";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Route to INDIGO FEES
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-3">
            <p>
              This will create <strong>admin-only</strong> internal transactions to route this withdrawal to the INDIGO FEES account.
            </p>
            <div className="bg-muted rounded-md p-3 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Investor:</span>{" "}
                <span className="font-medium">{withdrawal.investor_name}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Amount:</span>{" "}
                <span className="font-medium">
                  {amount.toLocaleString()} {asset.toUpperCase()}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Fund:</span>{" "}
                <span className="font-medium">{withdrawal.fund_name || withdrawal.fund_code}</span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              This creates paired INTERNAL_WITHDRAWAL and INTERNAL_CREDIT transactions that are hidden from investors.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
          <Textarea
            id="admin-notes"
            placeholder="Add any notes for audit purposes..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={2}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              "Route to INDIGO FEES"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
