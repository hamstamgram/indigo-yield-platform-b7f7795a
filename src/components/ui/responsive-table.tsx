import { ReactNode } from "react";
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { cn } from "@/lib/utils";

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
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  mobileCardRenderer,
  emptyMessage = "No data available",
  className,
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
              {columns.map((col, index) => (
                <TableHead key={index} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={keyExtractor(item)}>
                {columns.map((col, index) => (
                  <TableCell key={index} className={col.className}>
                    {col.cell ? col.cell(item) : (item[col.accessorKey as keyof T] as ReactNode)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {data.map((item) => (
          <div key={keyExtractor(item)}>
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
                      <span className="text-sm font-medium text-right flex-1 break-words">
                        {col.cell
                          ? col.cell(item)
                          : (item[col.accessorKey as keyof T] as ReactNode)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
