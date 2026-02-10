import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function TablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  className,
}: TablePaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages <= 1) return null;

  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalCount);

  return (
    <div className={cn("flex items-center justify-between pt-3", className)}>
      <p className="text-xs text-muted-foreground">
        {from}&ndash;{to} of {totalCount}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground px-2 tabular-nums">
          {page + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default TablePagination;
