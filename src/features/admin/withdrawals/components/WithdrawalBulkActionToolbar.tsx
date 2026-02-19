/**
 * Withdrawal Bulk Action Toolbar
 * Sticky bar above withdrawals table when rows are selected
 */

import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { Trash2, X } from "lucide-react";
import { formatAssetValue } from "@/utils/formatters";
import type { WithdrawalSelectionSummary } from "../hooks/useWithdrawalSelection";

interface WithdrawalBulkActionToolbarProps {
  summary: WithdrawalSelectionSummary;
  isSuperAdmin: boolean;
  onDelete: () => void;
  onClear: () => void;
}

function formatAmountSummary(amountsByAsset: Record<string, string>): string {
  const entries = Object.entries(amountsByAsset);
  if (entries.length === 0) return "0";
  return entries
    .map(([asset, amount]) => `${formatAssetValue(parseFloat(amount), asset)} ${asset}`)
    .join(" + ");
}

export function WithdrawalBulkActionToolbar({
  summary,
  isSuperAdmin,
  onDelete,
  onClear,
}: WithdrawalBulkActionToolbarProps) {
  if (summary.count === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-lg border bg-background/95 backdrop-blur px-4 py-2 shadow-sm">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">{summary.count} selected</span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">
          Total: {formatAmountSummary(summary.amountsByAsset)}
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">
          {summary.investorCount} investor{summary.investorCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="destructive" size="sm" onClick={onDelete} disabled={!isSuperAdmin}>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete Selected
                </Button>
              </span>
            </TooltipTrigger>
            {!isSuperAdmin && (
              <TooltipContent>Super admin access required for bulk operations</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}
