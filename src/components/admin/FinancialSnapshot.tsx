import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, PieChart, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface FundSnapshot {
  fund_id: string;
  fund_name: string;
  asset_code: string;
  aum: number;
  daily_inflows: number;
  daily_outflows: number;
  net_flow_24h: number;
}

interface InvestorComposition {
  investor_name: string;
  email: string;
  balance: number;
  ownership_pct: number;
}

type SortColumn = "investor_name" | "email" | "balance" | "ownership_pct";
type SortDirection = "asc" | "desc";

const formatCrypto = (value: number, symbol: string) => {
  if (!value) value = 0;
  const decimals = symbol === "BTC" ? 8 : symbol === "ETH" ? 6 : 2;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const FinancialSnapshot: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [data, setData] = useState<FundSnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  // Composition State
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);
  const [compositionData, setCompositionData] = useState<InvestorComposition[]>([]);
  const [loadingComp, setLoadingComp] = useState(false);

  // Sorting State
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
    return sortDirection === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // Sorted composition data
  const sortedCompositionData = useMemo(() => {
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

  const fetchData = async (targetDate: Date) => {
    setLoading(true);
    try {
      const formattedDate = format(targetDate, "yyyy-MM-dd");
      console.log("Fetching snapshot for:", formattedDate);

      const { data: snapshot, error } = await supabase.rpc("get_historical_nav", {
        target_date: formattedDate,
      });

      if (error) throw error;
      setData(snapshot || []);

      // Reset selection on date change
      setSelectedFundId(null);
      setCompositionData([]);
    } catch (error) {
      console.error("Error fetching financial snapshot:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComposition = React.useCallback(
    async (fundId: string) => {
      if (!date) return;
      setLoadingComp(true);
      try {
        // Direct query to investor_positions with limit for performance
        const { data: positions, error } = await supabase
          .from("investor_positions")
          .select(`
            current_value,
            profile:profiles!investor_id(first_name, last_name, email)
          `)
          .eq("fund_id", fundId)
          .limit(100);

        if (error) throw error;

        // Calculate total for ownership percentage
        const totalValue = positions?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0;

        const comp: InvestorComposition[] = positions?.map((p: any) => ({
          investor_name:
            `${p.profile?.first_name || ""} ${p.profile?.last_name || ""}`.trim() ||
            p.profile?.email ||
            "Unknown",
          email: p.profile?.email || "",
          balance: p.current_value || 0,
          ownership_pct: totalValue > 0 ? ((p.current_value || 0) / totalValue) * 100 : 0,
        })) || [];

        setCompositionData(comp);
      } catch (error) {
        console.error("Error fetching composition", error);
      } finally {
        setLoadingComp(false);
      }
    },
    [date]
  );

  useEffect(() => {
    if (date) {
      fetchData(date);
    }
  }, [date]);

  useEffect(() => {
    if (selectedFundId) {
      fetchComposition(selectedFundId);
    }
  }, [selectedFundId, date, fetchComposition]);

  const selectedFund = data.find((f) => f.fund_id === selectedFundId);

  const handleCloseDrawer = () => {
    setSelectedFundId(null);
    setCompositionData([]);
  };

  return (
    <div className="space-y-8">
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Fund Financials
          </h2>
          <p className="text-muted-foreground">Historical snapshot of AUM and daily flows.</p>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Snapshot Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {data.map((fund) => (
          <Card
            key={fund.fund_id || fund.asset_code}
            className={cn(
              "hover:shadow-md transition-all cursor-pointer border-l-4",
              selectedFundId === fund.fund_id ? "ring-2 ring-primary shadow-lg" : "",
              "border-l-primary"
            )}
            onClick={() => setSelectedFundId(fund.fund_id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <CryptoIcon symbol={fund.asset_code} className="h-10 w-10" />
                <div>
                  <CardTitle className="text-lg font-bold">{fund.asset_code} Fund</CardTitle>
                  <p className="text-xs text-muted-foreground">{fund.fund_name}</p>
                </div>
              </div>
              {selectedFundId === fund.fund_id && <Badge className="bg-primary">Selected</Badge>}
            </CardHeader>
            <CardContent>
              {/* Main AUM */}
              <div className="mt-4 mb-6">
                <div className="text-2xl font-bold text-foreground">
                  {formatCrypto(fund.aum, fund.asset_code)}{" "}
                  <span className="text-sm text-muted-foreground font-normal">{fund.asset_code}</span>
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                  Total Assets Under Management
                </p>
              </div>

              {/* Daily Flows Grid */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
                {/* Inflows */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Deposits (24h)</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    +{formatCrypto(fund.daily_inflows, fund.asset_code)}
                  </p>
                </div>

                {/* Outflows */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Withdrawals (24h)</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    -{formatCrypto(fund.daily_outflows, fund.asset_code)}
                  </p>
                </div>

                {/* Net Flow */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Net Flow</p>
                  <p
                    className={cn(
                      "text-sm font-bold",
                      fund.net_flow_24h >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {fund.net_flow_24h > 0 ? "+" : ""}
                    {formatCrypto(fund.net_flow_24h, fund.asset_code)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Investor Composition Drawer */}
      <Sheet open={!!selectedFundId} onOpenChange={(open) => !open && handleCloseDrawer()}>
        <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              {selectedFund && <CryptoIcon symbol={selectedFund.asset_code} className="h-8 w-8" />}
              <div>
                <SheetTitle className="text-xl">
                  {selectedFund?.fund_name || "Fund"} - Investor Composition
                </SheetTitle>
                <SheetDescription>
                  Ownership breakdown as of {date ? format(date, "PPP") : ""}
                </SheetDescription>
              </div>
            </div>
            {selectedFund && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {formatCrypto(selectedFund.aum, selectedFund.asset_code)}{" "}
                  <span className="text-sm text-muted-foreground font-normal">{selectedFund.asset_code}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total Fund Size</p>
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
                    className="text-right cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("balance")}
                  >
                    <div className="flex items-center justify-end">
                      Balance
                      {getSortIcon("balance")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort("ownership_pct")}
                  >
                    <div className="flex items-center justify-end">
                      Share
                      {getSortIcon("ownership_pct")}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingComp ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      Loading data...
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCompositionData.map((investor, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-medium">{investor.investor_name}</div>
                        <div className="text-xs text-muted-foreground">{investor.email}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {selectedFund && formatCrypto(investor.balance, selectedFund.asset_code)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono">
                          {investor.ownership_pct.toFixed(2)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {sortedCompositionData.length === 0 && !loadingComp && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No investors found with a balance on this date.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
