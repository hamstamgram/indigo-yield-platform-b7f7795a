/**
 * Yield Actions Column
 * Action buttons for yield record table rows
 */

import { useState } from "react";
import { MoreHorizontal, Trash2, Users, Eye, Undo2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";

interface YieldActionsColumnProps {
  record: any;
  canEdit: boolean;
  onVoid: (record: any) => void;
  onRestore?: (record: any) => void;
  onViewHistory: (record: any) => void;
  isExpanded: boolean;
  isVoided?: boolean;
}

export function YieldActionsColumn({
  record,
  canEdit,
  onVoid,
  onRestore,
  onViewHistory,
  isExpanded,
  isVoided = false,
}: YieldActionsColumnProps) {
  const [open, setOpen] = useState(false);

  if (isVoided) {
    return (
      <div className="flex items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isExpanded ? "secondary" : "ghost"}
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory(record);
              }}
              className={isExpanded ? "bg-muted text-primary" : ""}
            >
              <Users className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isExpanded ? "Hide Investors" : "View Investors"}</TooltipContent>
        </Tooltip>
        {onRestore && canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(record);
                }}
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Restore Distribution
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Quick action buttons */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isExpanded ? "secondary" : "ghost"}
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onViewHistory(record);
            }}
            className={isExpanded ? "bg-muted text-primary" : ""}
          >
            <Users className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isExpanded ? "Hide Investors" : "View Investors"}</TooltipContent>
      </Tooltip>

      {canEdit && (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onVoid(record);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Void Distribution
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
