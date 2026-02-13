/**
 * Optimized Responsive Table Component
 * Automatically switches between table and card view based on viewport
 * Implements virtual scrolling for large datasets
 */

import * as React from "react";
import { useIsMobile } from "@/hooks";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TableSkeleton,
} from "@/components/ui";

export interface Column<T> {
  /**
   * Column header label
   */
  header: string;
  /**
   * Accessor function or key for data
   */
  accessor: keyof T | ((row: T) => React.ReactNode);
  /**
   * Optional custom cell renderer
   */
  cell?: (value: any, row: T) => React.ReactNode;
  /**
   * Column width (only applies to table view)
   */
  width?: string;
  /**
   * Whether column is sortable
   * @default false
   */
  sortable?: boolean;
  /**
   * Hide column on mobile
   * @default false
   */
  hideOnMobile?: boolean;
}

export interface OptimizedTableProps<T> {
  /**
   * Array of column definitions
   */
  columns: Column<T>[];
  /**
   * Data array
   */
  data: T[];
  /**
   * Unique key for each row
   */
  getRowKey: (row: T) => string | number;
  /**
   * Optional mobile card title accessor
   */
  getMobileTitle?: (row: T) => string;
  /**
   * Optional empty state component
   */
  emptyState?: React.ReactNode;
  /**
   * Optional loading state
   */
  isLoading?: boolean;
  /**
   * Enable virtual scrolling for large datasets
   * @default false
   */
  enableVirtualScroll?: boolean;
  /**
   * Row height for virtual scrolling
   * @default 60
   */
  rowHeight?: number;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Sort handler
   */
  onSort?: (column: keyof T | string) => void;
  /**
   * Current sort column
   */
  sortColumn?: keyof T | string;
  /**
   * Sort direction
   */
  sortDirection?: "asc" | "desc";
}

/**
 * Responsive table that adapts to mobile with card view
 * Features:
 * - Automatic table/card switch based on viewport
 * - Virtual scrolling for performance
 * - Sortable columns
 * - Accessible keyboard navigation
 */
export function OptimizedTable<T>({
  columns,
  data,
  getRowKey,
  getMobileTitle,
  emptyState,
  isLoading = false,
  enableVirtualScroll = false,
  rowHeight = 60,
  className,
  onSort,
  sortColumn,
  sortDirection,
}: OptimizedTableProps<T>) {
  const isMobile = useIsMobile();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 50 });

  // Virtual scrolling logic
  React.useEffect(() => {
    if (!enableVirtualScroll || !containerRef.current) return;

    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
      const end = Math.min(data.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + 5);

      setVisibleRange({ start, end });
    };

    const container = containerRef.current;
    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial calculation

    return () => container.removeEventListener("scroll", handleScroll);
  }, [data.length, rowHeight, enableVirtualScroll]);

  const visibleData = enableVirtualScroll ? data.slice(visibleRange.start, visibleRange.end) : data;

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("p-4 border rounded-md bg-background", className)}>
        <TableSkeleton rows={8} columns={columns.length} />
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        {emptyState || <p className="text-muted-foreground">No data available</p>}
      </div>
    );
  }

  // Get cell value from row
  const getCellValue = (row: T, column: Column<T>) => {
    if (typeof column.accessor === "function") {
      return column.accessor(row);
    }
    return row[column.accessor];
  };

  // Render cell content
  const renderCell = (row: T, column: Column<T>): React.ReactNode => {
    const value = getCellValue(row, column);
    if (column.cell) {
      return column.cell(value, row);
    }
    return value as React.ReactNode;
  };

  // Handle column sort
  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSort) return;

    const accessor =
      typeof column.accessor === "function" ? column.header : String(column.accessor);

    onSort(accessor);
  };

  // Mobile card view
  if (isMobile) {
    return (
      <div className={cn("space-y-4", className)} ref={containerRef}>
        {visibleData.map((row) => {
          const key = getRowKey(row);

          return (
            <Card key={key} className="overflow-hidden">
              {getMobileTitle && (
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{getMobileTitle(row)}</CardTitle>
                </CardHeader>
              )}
              <CardContent className="space-y-2">
                {columns
                  .filter((col) => !col.hideOnMobile)
                  .map((column, colIndex) => (
                    <div key={colIndex} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        {column.header}:
                      </span>
                      <span className="text-sm font-medium">{renderCell(row, column)}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Desktop table view
  return (
    <div
      ref={containerRef}
      className={cn("rounded-md border overflow-auto", className)}
      style={
        enableVirtualScroll
          ? {
              height: "600px",
              position: "relative",
            }
          : undefined
      }
    >
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            {columns.map((column, index) => (
              <TableHead
                key={index}
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  column.sortable && "cursor-pointer hover:bg-muted/50",
                  column.sortable && "select-none"
                )}
                onClick={() => handleSort(column)}
                role={column.sortable ? "button" : undefined}
                tabIndex={column.sortable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (column.sortable && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    handleSort(column);
                  }
                }}
                aria-sort={
                  column.sortable &&
                  sortColumn ===
                    (typeof column.accessor === "function"
                      ? column.header
                      : String(column.accessor))
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable &&
                    sortColumn ===
                      (typeof column.accessor === "function"
                        ? column.header
                        : String(column.accessor)) && (
                      <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {enableVirtualScroll && <tr style={{ height: visibleRange.start * rowHeight }} />}
          {visibleData.map((row) => {
            const key = getRowKey(row);
            return (
              <TableRow
                key={key}
                className="hover:bg-muted/50 transition-colors"
                style={enableVirtualScroll ? { height: `${rowHeight}px` } : undefined}
              >
                {columns.map((column, colIndex) => (
                  <TableCell key={colIndex}>{renderCell(row, column)}</TableCell>
                ))}
              </TableRow>
            );
          })}
          {enableVirtualScroll && (
            <tr
              style={{
                height: (data.length - visibleRange.end) * rowHeight,
              }}
            />
          )}
        </TableBody>
      </Table>
    </div>
  );
}

OptimizedTable.displayName = "OptimizedTable";
