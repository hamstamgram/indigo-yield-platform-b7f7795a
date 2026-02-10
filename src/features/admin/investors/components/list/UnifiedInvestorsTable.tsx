import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHead,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { User, Users, ExternalLink, Plus } from "lucide-react";
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
  const navigate = useNavigate();

  return (
    <Table className="text-xs">
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          <SortableTableHead
            column="lastName"
            currentSort={sortConfig}
            onSort={onSort}
            className="whitespace-nowrap"
          >
            Investor
          </SortableTableHead>
          <SortableTableHead
            column="fundsHeldCount"
            currentSort={sortConfig}
            onSort={onSort}
            className="text-center whitespace-nowrap"
          >
            Status
          </SortableTableHead>
          <SortableTableHead
            column="fundsHeldCount"
            currentSort={sortConfig}
            onSort={onSort}
            className="text-center whitespace-nowrap"
          >
            Funds
          </SortableTableHead>
          <SortableTableHead
            column="lastActivityDate"
            currentSort={sortConfig}
            onSort={onSort}
            className="whitespace-nowrap"
          >
            Activity
          </SortableTableHead>
          <SortableTableHead
            column="pendingWithdrawals"
            currentSort={sortConfig}
            onSort={onSort}
            className="text-center whitespace-nowrap"
          >
            Pend. WD
          </SortableTableHead>
          <SortableTableHead
            column="lastReportPeriod"
            currentSort={sortConfig}
            onSort={onSort}
            className="whitespace-nowrap"
          >
            Report
          </SortableTableHead>
          <SortableTableHead
            column="createdAt"
            currentSort={sortConfig}
            onSort={onSort}
            className="whitespace-nowrap"
          >
            Joined
          </SortableTableHead>
          <SortableTableHead
            column="ibParentName"
            currentSort={sortConfig}
            onSort={onSort}
            className="whitespace-nowrap"
          >
            IB
          </SortableTableHead>
          <TableHead className="w-[60px] text-right whitespace-nowrap">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {investors.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
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
              <TableCell className="py-1.5">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                      investor.isSystemAccount ? "bg-amber-500/10" : "bg-primary/10"
                    )}
                  >
                    <User
                      className={cn(
                        "h-3 w-3",
                        investor.isSystemAccount ? "text-amber-600" : "text-primary"
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-medium truncate max-w-[130px]">
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
                    <p className="text-muted-foreground truncate max-w-[130px]">{investor.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center py-1.5">
                <Badge
                  variant={investor.fundsHeldCount > 0 ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {investor.fundsHeldCount > 0 ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-center font-mono tabular-nums py-1.5">
                {investor.fundsHeldCount}
              </TableCell>
              <TableCell className="text-muted-foreground py-1.5 whitespace-nowrap">
                {investor.lastActivityDate
                  ? format(new Date(investor.lastActivityDate), "MMM d, yy HH:mm")
                  : "—"}
              </TableCell>
              <TableCell className="text-center py-1.5">
                {investor.pendingWithdrawals > 0 ? (
                  <Badge variant="destructive" className="text-xs">
                    {investor.pendingWithdrawals}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground truncate max-w-[80px] py-1.5">
                {investor.lastReportPeriod || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap py-1.5">
                {investor.createdAt ? format(new Date(investor.createdAt), "MMM d, yy") : "—"}
              </TableCell>
              <TableCell className="py-1.5">
                {investor.ibParentName ? (
                  <Badge variant="outline" className="text-xs truncate max-w-[110px]">
                    <Users className="h-3 w-3 mr-1" />
                    {investor.ibParentName}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right py-1.5">
                <div
                  className="flex items-center justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => navigate(`/admin/investors/${investor.id}`)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open workspace</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => navigate(`/admin/transactions/new`)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>New transaction</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
