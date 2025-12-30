/**
 * Edit Yield Dialog
 * Dialog for editing yield record AUM values
 */

import { useState, useEffect } from "react";
import { Loader2, Pencil, ArrowRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Button, Input, Textarea, Label, Badge,
} from "@/components/ui";
import { format } from "date-fns";
import type { YieldRecord } from "@/services";
import { CryptoIcon } from "@/components/CryptoIcons";

interface EditYieldDialogProps {
  record: YieldRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (newAum: number, reason: string) => Promise<void>;
  isPending?: boolean;
}

export function EditYieldDialog({
  record,
  open,
  onOpenChange,
  onSave,
  isPending = false,
}: EditYieldDialogProps) {
  const [newAum, setNewAum] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (record && open) {
      setNewAum(record.total_aum.toString());
      setReason("");
    }
  }, [record, open]);

  const parsedNewAum = parseFloat(newAum);
  const isValidAum = !isNaN(parsedNewAum) && parsedNewAum > 0;
  const isValidReason = reason.trim().length >= 5;
  const hasChanged = record && parsedNewAum !== record.total_aum;
  const isValid = isValidAum && isValidReason && hasChanged;

  const handleSave = async () => {
    if (!isValid) return;
    await onSave(parsedNewAum, reason.trim());
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNewAum("");
      setReason("");
    }
    onOpenChange(newOpen);
  };

  if (!record) return null;

  const delta = isValidAum ? parsedNewAum - record.total_aum : 0;
  const deltaPercent = record.total_aum > 0 ? (delta / record.total_aum) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Yield Record
          </DialogTitle>
          <DialogDescription>
            Modify the AUM value for this record. All changes are logged for audit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Record Info */}
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <CryptoIcon symbol={record.fund_asset || ""} className="h-5 w-5" />
              <span className="font-medium">{record.fund_name}</span>
              <Badge variant="outline" className="ml-auto text-xs">
                {record.purpose}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(record.aum_date), "MMMM d, yyyy")}
            </div>
          </div>

          {/* Current vs New AUM */}
          <div className="space-y-2">
            <Label>AUM ({record.fund_asset})</Label>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Current</p>
                <p className="font-mono font-medium">
                  {record.total_aum.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div>
                <Input
                  type="number"
                  step="any"
                  value={newAum}
                  onChange={(e) => setNewAum(e.target.value)}
                  placeholder="New AUM"
                  className="font-mono text-center"
                />
              </div>
            </div>
          </div>

          {/* Delta Preview */}
          {hasChanged && isValidAum && (
            <div className={`rounded-lg p-3 ${delta >= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Change:</span>
                <span className={`font-mono font-medium ${delta >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                  {delta >= 0 ? "+" : ""}{delta.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                  {" "}
                  ({deltaPercent >= 0 ? "+" : ""}{deltaPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="edit-reason">
              Reason for change <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="edit-reason"
              placeholder="Explain why this AUM needs to be changed (min 5 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="resize-none"
            />
            {reason.length > 0 && reason.length < 5 && (
              <p className="text-xs text-destructive">
                Reason must be at least 5 characters
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
