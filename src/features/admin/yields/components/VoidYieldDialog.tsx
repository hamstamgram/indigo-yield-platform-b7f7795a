/**
 * Void Yield Dialog
 * Confirmation dialog for voiding yield records
 * Note: Impact preview removed -- getYieldVoidImpact was deprecated (always returned empty).
 * The void flow works through void_yield_distribution RPC which handles cascade internally.
 */

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
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
import { FormattedNumber } from "@/components/common/FormattedNumber";

interface VoidYieldDialogProps {
  record: YieldRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  isPending?: boolean;
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

  const isValid = reason.trim().length >= 5 && confirmed;

  const handleConfirm = async () => {
    if (!isValid) return;
    await onConfirm(reason.trim());
    setReason("");
    setConfirmed(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
      setConfirmed(false);
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
