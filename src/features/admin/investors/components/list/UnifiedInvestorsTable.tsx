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
    <Table className="text-xs border-separate border-spacing-y-1.5 px-2">
      <TableHeader className="sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <TableRow className="border-none hover:bg-transparent">
          <SortableTableHead
            column="lastName"
            currentSort={sortConfig}
            onSort={onSort}
            className="whitespace-nowrap text-muted-foreground/70 uppercase tracking-wider text-[10px]"
          >
            Investor
          </SortableTableHead>
          <SortableTableHead
            column="fundsHeldCount"
            currentSort={sortConfig}
            onSort={onSort}
            className="text-center whitespace-nowrap text-muted-foreground/70 uppercase tracking-wider text-[10px]"
          >
            Status
          </SortableTableHead>
          <SortableTableHead
            column="fundsHeldCount"
            currentSort={sortConfig}
            onSort={onSort}
            className="text-center whitespace-nowrap text-muted-foreground/70 uppercase tracking-wider text-[10px]"
          >
            Funds
          </SortableTableHead>
          <SortableTableHead
            column="lastActivityDate"
            currentSort={sortConfig}
            onSort={onSort}
            className="whitespace-nowrap text-muted-foreground/70 uppercase tracking-wider text-[10px]"
          >
            Activity
          </SortableTableHead>
          <SortableTableHead
            column="pendingWithdrawals"
            currentSort={sortConfig}
            onSort={onSort}
            className="text-center whitespace-nowrap text-muted-foreground/70 uppercase tracking-wider text-[10px]"
          >
            Pend. WD
          </SortableTableHead>
          <SortableTableHead
            column="lastReportPeriod"
            currentSort={sortConfig}
            onSort={onSort}
            className="whitespace-nowrap text-muted-foreground/70 uppercase tracking-wider text-[10px]"
          >
            Report
          </SortableTableHead>
          <SortableTableHead
            column="createdAt"
            currentSort={sortConfig}
            onSort={onSort}
            className="whitespace-nowrap text-muted-foreground/70 uppercase tracking-wider text-[10px]"
          >
            Joined
          </SortableTableHead>
          <SortableTableHead
            column="ibParentName"
            currentSort={sortConfig}
            onSort={onSort}
            className="whitespace-nowrap text-muted-foreground/70 uppercase tracking-wider text-[10px]"
          >
            IB
          </SortableTableHead>
          <TableHead className="w-[60px] text-right whitespace-nowrap text-muted-foreground/70 uppercase tracking-wider text-[10px]">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {investors.length === 0 ? (
          <TableRow className="glass-card">
            <TableCell colSpan={9} className="text-center py-12 text-muted-foreground bg-muted/5">
              {hasFilters ? "No investors match your filters" : "No investors found"}
            </TableCell>
          </TableRow>
        ) : (
          sortedData.map((investor) => (
            <TableRow
              key={investor.id}
              className={cn(
                "cursor-pointer transition-all duration-200 group relative",
                "glass-card hover:bg-white/[0.03] border-none mb-2",
                selectedInvestorId === investor.id && "ring-1 ring-primary/40 bg-primary/[0.03]"
              )}
              onClick={() => onRowClick(investor)}
            >
              <TableCell className="py-2.5 rounded-l-lg pl-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border border-white/5",
                      investor.isSystemAccount
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-white/90 truncate max-w-[130px]">
                        {investor.firstName} {investor.lastName}
                      </p>
                      {investor.isSystemAccount && (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1.5 shrink-0 border-amber-500/50 text-amber-500 bg-amber-500/5"
                        >
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 truncate max-w-[130px] font-mono">
                      {investor.email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center py-2.5">
                <Badge
                  variant={investor.fundsHeldCount > 0 ? "default" : "secondary"}
                  className={cn(
                    "text-[9px] px-2 py-0 h-4 uppercase tracking-tighter font-bold",
                    investor.fundsHeldCount > 0
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-muted/10 text-muted-foreground border-muted/20"
                  )}
                >
                  {investor.fundsHeldCount > 0 ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-center font-mono tabular-nums py-2.5 text-white/70">
                {investor.fundsHeldCount}
              </TableCell>
              <TableCell className="text-muted-foreground/80 py-2.5 whitespace-nowrap font-mono text-[10px]">
                {investor.lastActivityDate
                  ? format(new Date(investor.lastActivityDate), "MMM d, HH:mm")
                  : "—"}
              </TableCell>
              <TableCell className="text-center py-2.5">
                {investor.pendingWithdrawals > 0 ? (
                  <Badge className="text-[10px] bg-rose-500/20 text-rose-500 border-rose-500/30 hover:bg-rose-500/30 transition-colors">
                    {investor.pendingWithdrawals}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground/80 truncate max-w-[80px] py-2.5 font-mono text-[10px]">
                {investor.lastReportPeriod || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground/80 whitespace-nowrap py-2.5 font-mono text-[10px]">
                {investor.createdAt ? format(new Date(investor.createdAt), "MMM d, yy") : "—"}
              </TableCell>
              <TableCell className="py-2.5">
                {investor.ibParentName ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] truncate max-w-[110px] border-primary/20 bg-primary/5 text-primary/80"
                  >
                    <Users className="h-3 w-3 mr-1 opacity-70" />
                    {investor.ibParentName}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </TableCell>
              <TableCell className="text-right py-2.5 rounded-r-lg pr-4">
                <div
                  className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-all"
                        onClick={() => navigate(`/admin/investors/${investor.id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Open workspace</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-emerald-500/20 hover:text-emerald-500 transition-all"
                        onClick={() => navigate(`/admin/transactions/new`)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">New transaction</TooltipContent>
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
