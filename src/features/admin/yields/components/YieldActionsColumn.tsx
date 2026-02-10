/**
 * Yield Actions Column
 * Action buttons for yield record table rows
 */

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, History, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import type { YieldRecord } from "@/services/admin";

interface YieldActionsColumnProps {
  record: YieldRecord;
  canEdit: boolean;
  onEdit: (record: YieldRecord) => void;
  onVoid: (record: YieldRecord) => void;
  onViewHistory: (record: YieldRecord) => void;
  isVoided?: boolean;
}

export function YieldActionsColumn({
  record,
  canEdit,
  onEdit,
  onVoid,
  onViewHistory,
  isVoided = false,
}: YieldActionsColumnProps) {
  const [open, setOpen] = useState(false);

  if (isVoided) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" disabled>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Record is voided</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Quick action buttons */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={() => onViewHistory(record)}>
            <History className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View history</TooltipContent>
      </Tooltip>

      {canEdit && (
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
      )}
    </div>
  );
}
