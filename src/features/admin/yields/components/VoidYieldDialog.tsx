/**
 * Void Yield Dialog
 * Confirmation dialog for voiding yield records with impact preview
 */

import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Trash2, Users, FileX } from "lucide-react";
import { logError } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Textarea,
  Label,
  Checkbox,
  Badge,
} from "@/components/ui";
import { format } from "date-fns";
import type { YieldRecord } from "@/services/admin";
import { getYieldVoidImpact } from "@/services/admin/yields/yieldManagementService";
import { FormattedNumber } from "@/components/common/FormattedNumber";

interface VoidYieldDialogProps {
  record: YieldRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  isPending?: boolean;
}

interface VoidImpact {
  success: boolean;
  error?: string;
  transactions_to_void?: number;
  affected_investors?: Array<{
    investor_id: string;
    investor_name: string;
    current_position: number;
    yield_amount: number;
    fee_amount: number;
  }>;
  affected_investor_count?: number;
}

export function VoidYieldDialog({
  record,
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: VoidYieldDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [impact, setImpact] = useState<VoidImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  const isValid = reason.trim().length >= 5 && confirmed;

  // Fetch impact preview when dialog opens
  useEffect(() => {
    if (open && record?.id) {
      setLoadingImpact(true);
      getYieldVoidImpact(record.id)
        .then(setImpact)
        .catch((err) => {
          logError("VoidYieldDialog.getYieldVoidImpact", err, { recordId: record.id });
          setImpact(null);
        })
        .finally(() => setLoadingImpact(false));
    } else {
      setImpact(null);
    }
  }, [open, record?.id]);

  const handleConfirm = async () => {
    if (!isValid) return;
    await onConfirm(reason.trim());
    setReason("");
    setConfirmed(false);
    setImpact(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
      setConfirmed(false);
      setImpact(null);
    }
    onOpenChange(newOpen);
  };

  if (!record) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Void Yield Record
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You are about to void this yield record. This will cascade void all related yield
              transactions and recalculate affected investor positions.
            </p>

            <div className="bg-muted rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fund:</span>
                <span className="font-medium">{record.fund_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">
                  {format(new Date(record.aum_date), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">AUM:</span>
                <span className="font-medium">
                  <FormattedNumber
                    value={record.total_aum}
                    asset={record.fund_asset || ""}
                    type="aum"
                  />
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Purpose:</span>
                <Badge variant="outline" className="text-xs">
                  {record.purpose}
                </Badge>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* Impact Preview */}
          {loadingImpact ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading impact preview...</span>
            </div>
          ) : impact?.success &&
            ((impact.transactions_to_void ?? 0) > 0 ||
              (impact.affected_investor_count ?? 0) > 0) ? (
            <div className="space-y-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
              <div className="text-sm font-medium flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Cascade Impact
              </div>

              {(impact.transactions_to_void ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <FileX className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{impact.transactions_to_void}</strong> transaction(s) will be voided
                  </span>
                </div>
              )}

              {(impact.affected_investor_count ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{impact.affected_investor_count}</strong> investor(s) will have
                    positions recalculated
                  </span>
                </div>
              )}

              {impact.affected_investors && impact.affected_investors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto">
                  <div className="text-xs text-muted-foreground mb-1">Affected investors:</div>
                  <div className="space-y-1">
                    {impact.affected_investors.slice(0, 5).map((inv) => (
                      <div key={inv.investor_id} className="text-xs flex justify-between">
                        <span>{inv.investor_name}</span>
                        <FormattedNumber
                          value={-(inv.yield_amount - inv.fee_amount)}
                          type="number"
                          className="text-destructive"
                        />
                      </div>
                    ))}
                    {impact.affected_investors.length > 5 && (
                      <div className="text-xs text-muted-foreground">
                        ...and {impact.affected_investors.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="void-reason">
              Reason for voiding <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="void-reason"
              placeholder="Explain why this record needs to be voided (min 5 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {reason.length > 0 && reason.length < 5 && (
              <p className="text-xs text-destructive">Reason must be at least 5 characters</p>
            )}
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirm-void"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <label htmlFor="confirm-void" className="text-sm leading-tight cursor-pointer">
              I understand this action will cascade void all related yield transactions and
              recalculate affected investor positions.
            </label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={!isValid || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Voiding...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Void Record
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
