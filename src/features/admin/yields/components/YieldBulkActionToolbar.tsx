import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { Ban, Undo2, X } from "lucide-react";
import type { YieldSelectionSummary } from "../hooks/useYieldDistributionSelection";

interface YieldBulkActionToolbarProps {
  summary: YieldSelectionSummary;
  isSuperAdmin: boolean;
  onVoid: () => void;
  onRestore: () => void;
  onClear: () => void;
}

export function YieldBulkActionToolbar({
  summary,
  isSuperAdmin,
  onVoid,
  onRestore,
  onClear,
}: YieldBulkActionToolbarProps) {
  if (summary.count === 0) return null;

  const showVoidButton = !summary.allVoided;
  const showRestoreButton = !summary.noneVoided;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-lg border bg-background/95 backdrop-blur px-4 py-2 shadow-sm mb-4">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium text-white">{summary.count} selected</span>
      </div>

      <div className="flex items-center gap-2">
        {showVoidButton && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="destructive" size="sm" onClick={onVoid} disabled={!isSuperAdmin}>
                    <Ban className="h-4 w-4 mr-1.5" />
                    Void Selected
                  </Button>
                </span>
              </TooltipTrigger>
              {!isSuperAdmin && (
                <TooltipContent>Super admin access required for bulk operations</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}

        {showRestoreButton && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="outline" size="sm" onClick={onRestore} disabled={!isSuperAdmin}>
                    <Undo2 className="h-4 w-4 mr-1.5" />
                    Restore Selected
                  </Button>
                </span>
              </TooltipTrigger>
              {!isSuperAdmin && (
                <TooltipContent>Super admin access required for bulk operations</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground hover:text-white"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}
