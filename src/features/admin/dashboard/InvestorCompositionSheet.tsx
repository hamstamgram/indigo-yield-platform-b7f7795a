import React, { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Radio, Info } from "lucide-react";
import {
  Badge,
  TruncatedText,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatAUM } from "@/utils/formatters";
import type { FundAUMData } from "@/hooks";

type SortColumn = "investor_name" | "email" | "balance" | "ownership_pct";
type SortDirection = "asc" | "desc";

interface CompositionItem {
  investor_name: string;
  email: string;
  balance: number;
  ownership_pct: number;
}

interface InvestorCompositionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fund?: FundAUMData;
  compositionData: CompositionItem[];
  isLoading: boolean;
}

export const InvestorCompositionSheet: React.FC<InvestorCompositionSheetProps> = ({
  open,
  onOpenChange,
  fund,
  compositionData,
  isLoading,
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>("balance");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Handle column sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection(column === "balance" || column === "ownership_pct" ? "desc" : "asc");
    }
  };

  // Get sort icon for column header
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  // Sorted composition data
  const sortedData = useMemo(() => {
    if (!compositionData.length) return [];

    return [...compositionData].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "investor_name":
          comparison = a.investor_name.localeCompare(b.investor_name);
          break;
        case "email":
          comparison = a.email.localeCompare(b.email);
          break;
        case "balance":
          comparison = a.balance - b.balance;
          break;
        case "ownership_pct":
          comparison = a.ownership_pct - b.ownership_pct;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [compositionData, sortColumn, sortDirection]);

  // Calculate investor-only total from composition data
  const investorTotal = useMemo(() => {
    return compositionData.reduce((sum, item) => sum + item.balance, 0);
  }, [compositionData]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            {fund && <CryptoIcon symbol={fund.asset} className="h-8 w-8" />}
            <div>
              <SheetTitle className="text-xl">
                {fund?.name || "Fund"} - Investor Composition
              </SheetTitle>
              <SheetDescription>Investor-only ownership breakdown</SheetDescription>
            </div>
          </div>
          {fund && (
            <div className="mt-4 space-y-3">
              {/* Total Fund AUM */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {formatAUM(fund.latest_aum, fund.asset)}{" "}
                  <span className="text-sm text-muted-foreground font-normal">{fund.asset}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">Total Fund AUM</p>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Radio className="h-2 w-2 text-green-500 animate-pulse" />
                    Live
                  </Badge>
                </div>
              </div>

              {/* Investor Total with Explanation */}
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      {formatAUM(investorTotal, fund.asset)}{" "}
                      <span className="text-sm text-muted-foreground font-normal">
                        {fund.asset}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        Investor Holdings ({compositionData.length} investors)
                      </p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[280px]">
                            <p className="text-xs">
                              This total shows investor holdings only. The difference from Total
                              Fund AUM represents platform fees and IB allocations which are held in
                              internal accounts.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  {fund.latest_aum > 0 && (
                    <div className="text-right">
                      <div className="text-sm font-mono font-medium text-indigo-400">
                        {((investorTotal / fund.latest_aum) * 100).toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">of Fund AUM</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("investor_name")}
                >
                  <div className="flex items-center">
                    Investor
                    {getSortIcon("investor_name")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort("email")}
                >
                  <div className="flex items-center">
                    Email
                    {getSortIcon("email")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none text-right"
                  onClick={() => handleSort("balance")}
                >
                  <div className="flex items-center justify-end">
                    Balance
                    {getSortIcon("balance")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none text-right"
                  onClick={() => handleSort("ownership_pct")}
                >
                  <div className="flex items-center justify-end">
                    Ownership
                    {getSortIcon("ownership_pct")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No investors found
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((investor, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      <TruncatedText text={investor.investor_name} maxLength={20} />
                    </TableCell>
                    <TableCell>
                      <TruncatedText text={investor.email} maxLength={25} />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {fund && formatAUM(investor.balance, fund.asset)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {investor.ownership_pct.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  );
};
