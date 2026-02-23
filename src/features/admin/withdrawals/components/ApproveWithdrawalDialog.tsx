import { useState, useEffect, useRef, useMemo } from "react";
import { Withdrawal } from "@/types/domains";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { withdrawalService } from "@/services/investor";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { formatAssetAmount } from "@/utils/assets";
import { INVESTOR_DISPLAY_DECIMALS } from "@/types/asset";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Decimal from "decimal.js";

interface ApproveWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: Withdrawal;
  onSuccess: () => void;
}

/** Threshold above which dust triggers a warning (per asset) */
const DUST_WARN_THRESHOLDS: Record<string, number> = {
  BTC: 0.001,
  ETH: 0.01,
  USDT: 1,
  USDC: 1,
  EURC: 1,
};
const DEFAULT_DUST_WARN = 0.01;

export function ApproveWithdrawalDialog({
  open,
  onOpenChange,
  withdrawal,
  onSuccess,
}: ApproveWithdrawalDialogProps) {
  const [processedAmount, setProcessedAmount] = useState(withdrawal.requested_amount.toString());
  const [adminNotes, setAdminNotes] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Full exit / Route to INDIGO Fees state
  const [isFullExit, setIsFullExit] = useState(false);
  const [positionBalance, setPositionBalance] = useState<string | null>(null);
  const [loadingPosition, setLoadingPosition] = useState(false);

  const asset = withdrawal.asset || withdrawal.fund_class || "UNITS";

  // Determine if this withdrawal qualifies for full exit toggle
  // (requested amount >= 99% of position balance)
  const isFullExitEligible = useMemo(() => {
    if (!positionBalance) return false;
    const requested = new Decimal(withdrawal.requested_amount || 0);
    const balance = new Decimal(positionBalance);
    if (balance.isZero()) return false;
    return requested.div(balance).gte(0.99);
  }, [positionBalance, withdrawal.requested_amount]);

  // Calculate dust preview when full exit is enabled
  const dustPreview = useMemo(() => {
    if (!isFullExit || !positionBalance) return null;
    const balance = new Decimal(positionBalance);

    // Use the actual entered processedAmount for dust calculation
    // This allows admins to manually override the payout amount
    const sendAmount = new Decimal(processedAmount || 0);
    const dust = balance.minus(sendAmount);

    return {
      sendAmount: sendAmount.toString(),
      dustAmount: dust.isNegative() ? "0" : dust.toString(),
      fullBalance: balance.toString(),
    };
  }, [isFullExit, positionBalance, processedAmount]);

  // Check if dust exceeds warning threshold
  const isDustLarge = useMemo(() => {
    if (!dustPreview) return false;
    const dust = new Decimal(dustPreview.dustAmount);
    const threshold = DUST_WARN_THRESHOLDS[asset.toUpperCase()] ?? DEFAULT_DUST_WARN;
    return dust.gt(threshold);
  }, [dustPreview, asset]);

  // Load investor position balance when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingPosition(true);
    supabase
      .from("investor_positions")
      .select("current_value")
      .eq("investor_id", withdrawal.investor_id)
      .eq("fund_id", withdrawal.fund_id)
      .maybeSingle()
      .then(
        ({ data }) => {
          setPositionBalance(data?.current_value != null ? String(data.current_value) : null);
          setLoadingPosition(false);
        },
        () => {
          setLoadingPosition(false);
        }
      );
  }, [open, withdrawal.investor_id, withdrawal.fund_id]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setProcessedAmount(withdrawal.requested_amount.toString());
      setAdminNotes("");
      setConfirmText("");
      setIsFullExit(false);
    }
  }, [open, withdrawal.requested_amount]);

  // When full exit is toggled on, default processedAmount to truncated balance
  // We use a ref to track the previous isFullExit state to ensure we only default ONCE per toggle
  const prevIsFullExitRef = useRef(isFullExit);
  useEffect(() => {
    if (isFullExit && !prevIsFullExitRef.current && positionBalance) {
      const balance = new Decimal(positionBalance);
      const truncated = balance.toDecimalPlaces(INVESTOR_DISPLAY_DECIMALS, Decimal.ROUND_DOWN);
      setProcessedAmount(truncated.toString());
    } else if (!isFullExit && prevIsFullExitRef.current) {
      setProcessedAmount(withdrawal.requested_amount.toString());
    }
    prevIsFullExitRef.current = isFullExit;
  }, [isFullExit, positionBalance, withdrawal.requested_amount]);

  const isConfirmed = confirmText.toUpperCase() === "APPROVE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current) return;
    if (!isConfirmed) {
      toast.error("Please type APPROVE to confirm");
      return;
    }

    const amount = parseFloat(processedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await withdrawalService.approveAndComplete(
        withdrawal.id,
        processedAmount,
        undefined,
        adminNotes || undefined,
        isFullExit || undefined
      );
      const successMsg = isFullExit
        ? "Full exit completed. Dust routed to INDIGO Fees. Position deactivated."
        : "Withdrawal approved and completed. Ledger updated.";
      toast.success(successMsg);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      logError("withdrawal.approveAndComplete", error, { withdrawalId: withdrawal.id });
      const message = error instanceof Error ? error.message : "Failed to process withdrawal";
      toast.error(message);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Approve Withdrawal</DialogTitle>
          <DialogDescription>
            Approve and complete the withdrawal for {withdrawal.investor_name}. The investor&apos;s
            position will be reduced immediately.
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
                <Label className="text-sm font-medium">Fund</Label>
                <p className="text-sm text-muted-foreground">
                  {withdrawal.fund_name || withdrawal.fund_class || "N/A"}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Requested Amount</Label>
              <p className="text-sm text-muted-foreground">
                {formatAssetAmount(withdrawal.requested_amount, asset)}
              </p>
            </div>

            {/* Route to INDIGO Fees toggle - only for full exit eligible withdrawals */}
            {isFullExitEligible && !loadingPosition && (
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-3 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFullExit}
                    onChange={(e) => setIsFullExit(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-white">
                    Route to INDIGO Fees (Full Exit)
                  </span>
                </label>

                {isFullExit && dustPreview && (
                  <div className="space-y-2 pl-7 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Position balance</span>
                      <span className="font-mono text-white">
                        {formatAssetAmount(dustPreview.fullBalance, asset)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Send to investor</span>
                      <span className="font-mono text-emerald-400">
                        {formatAssetAmount(dustPreview.sendAmount, asset)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dust to INDIGO Fees</span>
                      <span className="font-mono text-amber-400">
                        {formatAssetAmount(dustPreview.dustAmount, asset)}
                      </span>
                    </div>
                    {new Decimal(dustPreview.dustAmount).isZero() && (
                      <p className="text-xs text-slate-500">
                        No dust - balance is already at {INVESTOR_DISPLAY_DECIMALS} decimals
                      </p>
                    )}
                    {isDustLarge && (
                      <Alert className="border-amber-500/50 bg-amber-950/30 mt-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <AlertDescription className="text-amber-300 text-xs">
                          Dust amount is unusually large. Please verify the position balance before
                          proceeding.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="processedAmount">
                {isFullExit ? "Final Payment Amount *" : "Processed Amount *"}
              </Label>
              <Input
                id="processedAmount"
                type="number"
                step="0.00000001"
                min="0"
                value={processedAmount}
                onChange={(e) => setProcessedAmount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isFullExit
                  ? "Adjust final payment. Remainder will route to INDIGO Fees."
                  : "Adjust if processing fees apply"}
              </p>
            </div>

            <div>
              <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={2}
              />
            </div>

            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>This action is irreversible</strong>
                <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                  <li>A WITHDRAWAL transaction will be created in the ledger</li>
                  <li>The investor&apos;s position will be reduced immediately</li>
                  {isFullExit && (
                    <>
                      <li>Accrued yield should be distributed before processing</li>
                      <li>Dust will be routed to INDIGO Fees account</li>
                      <li>The investor&apos;s position will be deactivated</li>
                    </>
                  )}
                </ul>
                <p className="mt-2 text-sm">
                  Type <strong>APPROVE</strong> below to confirm.
                </p>
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="confirmText">Type APPROVE to confirm *</Label>
              <Input
                id="confirmText"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="APPROVE"
                className={confirmText && !isConfirmed ? "border-destructive" : ""}
                required
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
            <Button type="submit" disabled={isSubmitting || !isConfirmed}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : isFullExit ? (
                "Approve Full Exit"
              ) : (
                "Approve & Complete"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
