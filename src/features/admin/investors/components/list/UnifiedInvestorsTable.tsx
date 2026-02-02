import React from "react";
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui";
import { User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { EnrichedInvestor } from "@/hooks/data";

interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

interface UnifiedInvestorsTableProps {
  investors: EnrichedInvestor[];
  sortedData: EnrichedInvestor[];
  sortConfig: SortConfig;
  selectedInvestorId: string | null;
  hasFilters: boolean;
  onSort: (column: string) => void;
  onRowClick: (investor: EnrichedInvestor) => void;
}

export const UnifiedInvestorsTable: React.FC<UnifiedInvestorsTableProps> = ({
  investors,
  sortedData,
  sortConfig,
  selectedInvestorId,
  hasFilters,
  onSort,
  onRowClick,
}) => {
  return (
    <Table>
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          <SortableTableHead
            column="lastName"
            currentSort={sortConfig}
            onSort={onSort}
            className="w-[250px]"
          >
            Investor
          </SortableTableHead>
          <SortableTableHead
            column="fundsHeldCount"
            currentSort={sortConfig}
            onSort={onSort}
            className="w-[80px] text-center"
          >
            Status
          </SortableTableHead>
          <SortableTableHead
            column="fundsHeldCount"
            currentSort={sortConfig}
            onSort={onSort}
            className="w-[70px] text-center"
          >
            Funds
          </SortableTableHead>
          <SortableTableHead
            column="lastActivityDate"
            currentSort={sortConfig}
            onSort={onSort}
            className="w-[100px]"
          >
            Last Activity
          </SortableTableHead>
          <SortableTableHead
            column="pendingWithdrawals"
            currentSort={sortConfig}
            onSort={onSort}
            className="w-[90px] text-center"
          >
            Pending WD
          </SortableTableHead>
          <SortableTableHead
            column="lastReportPeriod"
            currentSort={sortConfig}
            onSort={onSort}
            className="w-[100px]"
          >
            Last Report
          </SortableTableHead>
          <SortableTableHead
            column="ibParentName"
            currentSort={sortConfig}
            onSort={onSort}
            className="w-[120px]"
          >
            IB Parent
          </SortableTableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {investors.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
              {hasFilters ? "No investors match your filters" : "No investors found"}
            </TableCell>
          </TableRow>
        ) : (
          sortedData.map((investor) => (
            <TableRow
              key={investor.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                selectedInvestorId === investor.id && "bg-primary/5 border-l-2 border-l-primary"
              )}
              onClick={() => onRowClick(investor)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      investor.isSystemAccount ? "bg-amber-500/10" : "bg-primary/10"
                    )}
                  >
                    <User
                      className={cn(
                        "h-4 w-4",
                        investor.isSystemAccount ? "text-amber-600" : "text-primary"
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium truncate">
                        {investor.firstName} {investor.lastName}
                      </p>
                      {investor.isSystemAccount && (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1 shrink-0 border-amber-500 text-amber-600"
                        >
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{investor.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={investor.fundsHeldCount > 0 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {investor.fundsHeldCount > 0 ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-center font-mono text-sm">
                {investor.fundsHeldCount}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {investor.lastActivityDate
                  ? format(new Date(investor.lastActivityDate), "MMM d, yy HH:mm")
                  : "—"}
              </TableCell>
              <TableCell className="text-center">
                {investor.pendingWithdrawals > 0 ? (
                  <Badge variant="destructive" className="text-xs">
                    {investor.pendingWithdrawals}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground truncate max-w-[100px]">
                {investor.lastReportPeriod || "—"}
              </TableCell>
              <TableCell>
                {investor.ibParentName ? (
                  <Badge variant="outline" className="text-xs truncate max-w-[110px]">
                    <Users className="h-3 w-3 mr-1" />
                    {investor.ibParentName}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
