/**
 * Report Bulk Action Toolbar
 * Floating toolbar that appears when reports are selected.
 * Shows selection count and available bulk actions.
 */

import { Button, Badge } from "@/components/ui";
import { Send, X } from "lucide-react";

interface ReportBulkActionToolbarProps {
  selectedCount: number;
  sendableCount: number;
  onSendSelected: () => void;
  onClear: () => void;
}

export function ReportBulkActionToolbar({
  selectedCount,
  sendableCount,
  onSendSelected,
  onClear,
}: ReportBulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
      <Badge variant="secondary" className="text-xs">
        {selectedCount} selected
      </Badge>

      <div className="flex items-center gap-2 ml-auto">
        {sendableCount > 0 && (
          <Button size="sm" onClick={onSendSelected} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Send {sendableCount} Email{sendableCount !== 1 ? "s" : ""}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          className="gap-1.5 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
    </div>
  );
}
