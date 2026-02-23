import React, { ReactNode } from "react";
import { Card, CardContent } from "./card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { SortableTableHead } from "./sortable-table-head";
import { cn } from "@/lib/utils";
import type { SortConfig } from "@/hooks";

export interface ResponsiveTableColumn<T> {
  header: string | ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T) => ReactNode;
  className?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: ResponsiveTableColumn<T>[];
  keyExtractor: (item: T) => string | number;
  mobileCardRenderer?: (item: T) => ReactNode;
  emptyMessage?: string;
  className?: string;
  expandedRows?: Set<string | number>;
  expandedRowRenderer?: (item: T) => ReactNode;
  onRowClick?: (item: T) => void;
  currentSort?: SortConfig;
  onSort?: (column: string) => void;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  mobileCardRenderer,
  emptyMessage = "No data available",
  className,
  expandedRows,
  expandedRowRenderer,
  onRowClick,
  currentSort,
  onSort,
}: ResponsiveTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop View */}
      <div className="hidden md:block overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, index) => {
                const isSortable = !!onSort && !!col.accessorKey;
                const columnKey = String(col.accessorKey || "");

                if (isSortable && currentSort) {
                  return (
                    <SortableTableHead
                      key={index}
                      column={columnKey}
                      currentSort={currentSort}
                      onSort={onSort}
                      className={col.className}
                    >
                      {col.header}
                    </SortableTableHead>
                  );
                }

                return (
                  <TableHead key={index} className={col.className}>
                    {col.header}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => {
              const key = keyExtractor(item);
              const isExpanded = expandedRows?.has(key);

              return (
                <React.Fragment key={key}>
                  <TableRow
                    className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((col, index) => (
                      <TableCell key={index} className={col.className}>
                        {col.cell
                          ? col.cell(item)
                          : (item[col.accessorKey as keyof T] as ReactNode)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded && expandedRowRenderer && (
                    <TableRow className="bg-muted/5 hover:bg-muted/5 border-b shadow-inner">
                      <TableCell colSpan={columns.length} className="p-0 border-t-0">
                        {expandedRowRenderer(item)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {data.map((item) => {
          const key = keyExtractor(item);
          const isExpanded = expandedRows?.has(key);

          return (
            <div key={key} className="space-y-2">
              {mobileCardRenderer ? (
                mobileCardRenderer(item)
              ) : (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    {columns.map((col, index) => (
                      <div key={index} className="flex justify-between items-start gap-4">
                        <span className="font-medium text-sm text-muted-foreground w-1/3">
                          {col.header}:
                        </span>
                        <span className="text-sm font-medium text-right flex-1 break-words min-w-0">
                          {col.cell
                            ? col.cell(item)
                            : (item[col.accessorKey as keyof T] as ReactNode)}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {isExpanded && expandedRowRenderer && (
                <div className="pl-4 border-l-2 border-primary/20">{expandedRowRenderer(item)}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
