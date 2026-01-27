import * as React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { TableHead } from "./table";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/hooks";

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  column: string;
  currentSort: { column: string; direction: SortDirection };
  onSort: (column: string) => void;
  children: React.ReactNode;
}

export function SortableTableHead({
  column,
  currentSort,
  onSort,
  children,
  className,
  ...props
}: SortableTableHeadProps) {
  const isActive = currentSort.column === column;
  const direction = isActive ? currentSort.direction : null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSort(column);
    }
  };

  const ariaSort = direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";

  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      onClick={() => onSort(column)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="columnheader"
      aria-sort={ariaSort}
      {...props}
    >
      <div className="flex items-center gap-1">
        <span>{children}</span>
        <span className="ml-auto" aria-hidden="true">
          {direction === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : direction === "desc" ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4 opacity-30" />
          )}
        </span>
      </div>
    </TableHead>
  );
}
