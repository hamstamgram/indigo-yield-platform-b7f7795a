import React, { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Radio } from "lucide-react";
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
  account_type: string;
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
              <SheetDescription>Full fund ownership breakdown</SheetDescription>
            </div>
          </div>
          {fund && (
            <div className="mt-4 space-y-3">
              {/* Unified Live Fund AUM */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {formatAUM(investorTotal, fund.asset)}{" "}
                      <span className="text-sm text-muted-foreground font-normal">
                        {fund.asset}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        Live Fund AUM ({compositionData.length} active holdings)
                      </p>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Radio className="h-2 w-2 text-green-500 animate-pulse" />
                        Live
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="mt-6">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none whitespace-nowrap"
                  onClick={() => handleSort("investor_name")}
                >
                  <div className="flex items-center">
                    Investor
                    {getSortIcon("investor_name")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none whitespace-nowrap"
                  onClick={() => handleSort("email")}
                >
                  <div className="flex items-center">
                    Email
                    {getSortIcon("email")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none text-right whitespace-nowrap"
                  onClick={() => handleSort("balance")}
                >
                  <div className="flex items-center justify-end">
                    Balance
                    {getSortIcon("balance")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 select-none text-right whitespace-nowrap"
                  onClick={() => handleSort("ownership_pct")}
                >
                  <div className="flex items-center justify-end">
                    Own%
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
                    <TableCell className="font-medium py-1.5">
                      <div className="flex items-center gap-2">
                        <TruncatedText text={investor.investor_name} maxLength={18} />
                        {investor.account_type === "fees_account" && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-blue-950/30 text-blue-400 border-blue-800"
                          >
                            FEE
                          </Badge>
                        )}
                        {investor.account_type === "ib" && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-purple-950/30 text-purple-400 border-purple-800"
                          >
                            IB
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <TruncatedText text={investor.email} maxLength={22} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums py-1.5">
                      {fund && formatAUM(investor.balance, fund.asset)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums py-1.5">
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
