/**
 * Correction History Dialog
 * Dialog showing correction history for a yield record
 */

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
} from "@/components/ui";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { FinancialValue } from "@/components/common/FinancialValue";
import type { RecordedYieldRecord, CorrectionHistoryItem } from "@/hooks";

interface CorrectionHistoryDialogProps {
  record: RecordedYieldRecord | null;
  history: CorrectionHistoryItem[];
  isLoading: boolean;
  onClose: () => void;
}

export function CorrectionHistoryDialog({
  record,
  history,
  isLoading,
  onClose,
}: CorrectionHistoryDialogProps) {
  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Correction History
          </DialogTitle>
          <DialogDescription>
            {record?.fund_name} - {record?.aum_date} ({record?.purpose})
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No corrections for this record</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((c: CorrectionHistoryItem) => (
                <div key={c.correction_id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                      >
                        {c.status}
                      </Badge>
                      <span className="text-sm font-medium">
                        {format(new Date(c.applied_at), "MMM d, yyyy HH:mm")}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      by {c.applied_by_name || "System"}
                    </span>
                  </div>

                  {c.reason && <p className="text-sm text-muted-foreground italic">"{c.reason}"</p>}

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Old AUM</p>
                      <FinancialValue value={c.old_aum || 0} asset={record?.fund_asset} />
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">New AUM</p>
                      <FinancialValue value={c.new_aum || 0} asset={record?.fund_asset} />
                    </div>
                    <div
                      className={`rounded-lg p-3 ${(c.delta_aum || 0) >= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}
                    >
                      <p className="text-xs text-muted-foreground mb-1">Delta</p>
                      <FinancialValue
                        value={c.delta_aum || 0}
                        asset={record?.fund_asset}
                        prefix={(c.delta_aum || 0) > 0 ? "+" : ""}
                        colorize
                      />
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Affected {c.investors_affected} investor{c.investors_affected !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
