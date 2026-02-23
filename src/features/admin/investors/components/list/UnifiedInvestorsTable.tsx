import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  SortableTableHead,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { User, Users, ExternalLink, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useVirtualizer } from "@tanstack/react-virtual";
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

const GRID_TEMPLATE = "minmax(200px, 1.5fr) 100px 80px 140px 100px 100px 120px 140px 80px";

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
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // height + margin
    overscan: 10,
  });

  return (
    <div className="rounded-lg border border-white/5 bg-background/50 backdrop-blur-sm overflow-hidden flex flex-col h-full min-h-[500px]">
      {/* Table Header */}
      <div
        className="grid items-center px-4 py-3 border-b border-white/10 bg-muted/20 z-20 sticky top-0"
        style={{ gridTemplateColumns: GRID_TEMPLATE }}
      >
        <SortableTableHead
          column="lastName"
          currentSort={sortConfig}
          onSort={onSort}
          className="text-muted-foreground/70 uppercase tracking-wider text-[10px] bg-transparent border-none p-0 h-auto"
        >
          Investor
        </SortableTableHead>
        <SortableTableHead
          column="fundsHeldCount"
          currentSort={sortConfig}
          onSort={onSort}
          className="text-center text-muted-foreground/70 uppercase tracking-wider text-[10px] bg-transparent border-none p-0 h-auto"
        >
          Status
        </SortableTableHead>
        <SortableTableHead
          column="fundsHeldCount"
          currentSort={sortConfig}
          onSort={onSort}
          className="text-center text-muted-foreground/70 uppercase tracking-wider text-[10px] bg-transparent border-none p-0 h-auto"
        >
          Funds
        </SortableTableHead>
        <SortableTableHead
          column="lastActivityDate"
          currentSort={sortConfig}
          onSort={onSort}
          className="text-muted-foreground/70 uppercase tracking-wider text-[10px] bg-transparent border-none p-0 h-auto"
        >
          Activity
        </SortableTableHead>
        <SortableTableHead
          column="pendingWithdrawals"
          currentSort={sortConfig}
          onSort={onSort}
          className="text-center text-muted-foreground/70 uppercase tracking-wider text-[10px] bg-transparent border-none p-0 h-auto"
        >
          Pend. WD
        </SortableTableHead>
        <SortableTableHead
          column="lastReportPeriod"
          currentSort={sortConfig}
          onSort={onSort}
          className="text-muted-foreground/70 uppercase tracking-wider text-[10px] bg-transparent border-none p-0 h-auto"
        >
          Report
        </SortableTableHead>
        <SortableTableHead
          column="createdAt"
          currentSort={sortConfig}
          onSort={onSort}
          className="text-muted-foreground/70 uppercase tracking-wider text-[10px] bg-transparent border-none p-0 h-auto"
        >
          Joined
        </SortableTableHead>
        <SortableTableHead
          column="ibParentName"
          currentSort={sortConfig}
          onSort={onSort}
          className="text-muted-foreground/70 uppercase tracking-wider text-[10px] bg-transparent border-none p-0 h-auto"
        >
          IB
        </SortableTableHead>
        <div className="text-right text-muted-foreground/70 uppercase tracking-wider text-[10px] font-medium pr-4">
          Actions
        </div>
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-white/10"
      >
        {sortedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Users className="h-12 w-12 opacity-10 mb-4" />
            <p>{hasFilters ? "No investors match your filters" : "No investors found"}</p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const investor = sortedData[virtualRow.index];
              return (
                <div
                  key={investor.id}
                  className={cn(
                    "absolute top-0 left-0 w-full grid items-center px-4 transition-all duration-200 group cursor-pointer border-b border-white/[0.02]",
                    "hover:bg-white/[0.03]",
                    selectedInvestorId === investor.id &&
                      "bg-primary/[0.03] ring-inset ring-1 ring-primary/40"
                  )}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns: GRID_TEMPLATE,
                  }}
                  onClick={() => onRowClick(investor)}
                >
                  {/* Investor info */}
                  <div className="flex items-center gap-2.5 min-w-0">
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
                        <p className="font-semibold text-white/90 truncate">
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
                      <p className="text-[10px] text-muted-foreground/70 truncate font-mono">
                        {investor.email}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex justify-center">
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
                  </div>

                  {/* Funds */}
                  <div className="text-center font-mono tabular-nums text-white/70">
                    {investor.fundsHeldCount}
                  </div>

                  {/* Activity */}
                  <div className="text-muted-foreground/80 whitespace-nowrap font-mono text-[10px]">
                    {investor.lastActivityDate
                      ? format(new Date(investor.lastActivityDate), "MMM d, HH:mm")
                      : "—"}
                  </div>

                  {/* Pending WD */}
                  <div className="flex justify-center">
                    {investor.pendingWithdrawals > 0 ? (
                      <Badge className="text-[10px] bg-rose-500/20 text-rose-500 border-rose-500/30">
                        {investor.pendingWithdrawals}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </div>

                  {/* Report */}
                  <div className="text-muted-foreground/80 truncate font-mono text-[10px]">
                    {investor.lastReportPeriod || "—"}
                  </div>

                  {/* Joined */}
                  <div className="text-muted-foreground/80 whitespace-nowrap font-mono text-[10px]">
                    {investor.createdAt ? format(new Date(investor.createdAt), "MMM d, yy") : "—"}
                  </div>

                  {/* IB */}
                  <div className="min-w-0">
                    {investor.ibParentName ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] truncate max-w-full border-primary/20 bg-primary/5 text-primary/80"
                      >
                        <Users className="h-3 w-3 mr-1 opacity-70 shrink-0" />
                        <span className="truncate">{investor.ibParentName}</span>
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="text-right flex items-center justify-end gap-1 px-4">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/investors/${investor.id}`);
                            }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/transactions/new`);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">New transaction</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
