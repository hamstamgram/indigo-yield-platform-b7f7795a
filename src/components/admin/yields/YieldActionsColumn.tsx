/**
 * Yield Actions Column
 * Action buttons for yield record table rows
 */

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, History, Eye, RefreshCw } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
  Button,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui";
import { YieldRecord } from "@/services/admin/recordedYieldsService";

interface YieldActionsColumnProps {
  record: YieldRecord;
  canEdit: boolean;
  onEdit: (record: YieldRecord) => void;
  onVoid: (record: YieldRecord) => void;
  onViewHistory: (record: YieldRecord) => void;
  onCorrect: (record: YieldRecord) => void;
  isVoided?: boolean;
}

export function YieldActionsColumn({
  record,
  canEdit,
  onEdit,
  onVoid,
  onViewHistory,
  onCorrect,
  isVoided = false,
}: YieldActionsColumnProps) {
  const [open, setOpen] = useState(false);

  if (isVoided) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" disabled>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Record is voided</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Quick action buttons */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewHistory(record)}
            >
              <History className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View history</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {canEdit && (
        <>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onCorrect(record)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Correct yield</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* More actions dropdown */}
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  setOpen(false);
                  onEdit(record);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit AUM
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setOpen(false);
                  onVoid(record);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Void Record
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}
