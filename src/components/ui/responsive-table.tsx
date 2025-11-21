import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "./loading-skeletons";

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  mobileLabel?: string;
  priority?: "high" | "medium" | "low"; // For mobile visibility
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  stickyHeader?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  mobileCardView?: boolean;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string | number;
  className?: string;
  containerClassName?: string;
}

/**
 * Responsive table that switches to card view on mobile
 */
export function ResponsiveTable<T>({
  data,
  columns,
  loading = false,
  emptyState,
  stickyHeader = false,
  striped = true,
  hoverable = true,
  mobileCardView = true,
  onRowClick,
  keyExtractor,
  className,
  containerClassName,
}: ResponsiveTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [expandedCards, setExpandedCards] = useState<Set<string | number>>(new Set());

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const column = columns.find((col) => col.key === sortConfig.key);
      if (!column) return 0;

      const aVal = column.accessor(a);
      const bVal = column.accessor(b);

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (aVal > bVal) comparison = 1;
      if (aVal < bVal) comparison = -1;

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [data, sortConfig, columns]);

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
  };

  // Toggle card expansion on mobile
  const toggleCardExpansion = (id: string | number) => {
    setExpandedCards((current) => {
      const newSet = new Set(current);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Render loading state
  if (loading) {
    return <TableSkeleton rows={5} columns={columns.length} />;
  }

  // Render empty state
  if (!data || data.length === 0) {
    if (emptyState) {
      return <>{emptyState}</>;
    }
    return <div className="text-center py-12 text-gray-500">No data available</div>;
  }

  // Get high priority columns for mobile
  const highPriorityColumns = columns.filter((col) => col.priority === "high");
  const otherColumns = columns.filter((col) => col.priority !== "high");

  return (
    <div className={cn("w-full", containerClassName)}>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className={cn("w-full", className)}>
          <thead
            className={cn(
              "bg-gray-50 border-b border-gray-200",
              stickyHeader && "sticky top-0 z-10"
            )}
          >
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    column.sortable && "cursor-pointer select-none hover:bg-gray-100"
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div
                    className={cn(
                      "flex items-center",
                      column.align === "center" && "justify-center",
                      column.align === "right" && "justify-end"
                    )}
                  >
                    <span>{column.header}</span>
                    {column.sortable && (
                      <span className="ml-2">
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 text-gray-400" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row, index) => {
              const key = keyExtractor(row);
              return (
                <tr
                  key={key}
                  className={cn(
                    striped && index % 2 === 1 && "bg-gray-50",
                    hoverable && "hover:bg-gray-100 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={`${key}-${column.key}`}
                      className={cn(
                        "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right"
                      )}
                    >
                      {column.accessor(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      {mobileCardView && (
        <div className="lg:hidden space-y-4">
          {sortedData.map((row) => {
            const key = keyExtractor(row);
            const isExpanded = expandedCards.has(key);

            return (
              <div
                key={key}
                className={cn(
                  "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden",
                  onRowClick && "cursor-pointer"
                )}
              >
                {/* Card Header - Always visible */}
                <div className="p-4" onClick={() => onRowClick?.(row)}>
                  {/* High priority items */}
                  <div className="space-y-2">
                    {highPriorityColumns.map((column) => (
                      <div key={column.key} className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          {column.mobileLabel || column.header}
                        </span>
                        <span className="text-sm text-gray-900">{column.accessor(row)}</span>
                      </div>
                    ))}
                  </div>

                  {otherColumns.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCardExpansion(key);
                      }}
                    >
                      {isExpanded ? "Show Less" : "Show More"}
                      {isExpanded ? (
                        <ChevronUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Expandable content */}
                {isExpanded && otherColumns.length > 0 && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                    <div className="space-y-2 mt-3">
                      {otherColumns.map((column) => (
                        <div key={column.key} className="flex justify-between">
                          <span className="text-sm font-medium text-gray-500">
                            {column.mobileLabel || column.header}
                          </span>
                          <span className="text-sm text-gray-900">{column.accessor(row)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Responsive table with pagination
 */
export interface PaginatedTableProps<T> extends ResponsiveTableProps<T> {
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
}

export function PaginatedResponsiveTable<T>({
  data,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  totalItems,
  ...tableProps
}: PaginatedTableProps<T>) {
  const totalPages = Math.ceil((totalItems || data.length) / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  }, [data, currentPage, pageSize]);

  return (
    <div>
      <ResponsiveTable {...tableProps} data={paginatedData} />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>

          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, totalItems || data.length)}
                </span>{" "}
                of <span className="font-medium">{totalItems || data.length}</span> results
              </p>
            </div>

            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-r-none"
                >
                  Previous
                </Button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange?.(page)}
                      className="rounded-none"
                    >
                      {page}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-l-none"
                >
                  Next
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResponsiveTable;
