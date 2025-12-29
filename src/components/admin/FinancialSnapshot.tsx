import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown, Radio, AlertCircle, RefreshCw, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useFundAUM, type FundAUMData } from "@/hooks";
import { useHistoricalFlowData, useFundComposition } from "@/hooks/data/useDashboardMetrics";
import { formatAUM } from "@/utils/formatters";
import { toast } from "sonner";
import { TruncatedText } from "@/components/ui/truncated-text";

type SortColumn = "investor_name" | "email" | "balance" | "ownership_pct";
type SortDirection = "asc" | "desc";

export const FinancialSnapshot: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("balance");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Use unified AUM hook - single source of truth
  const { funds, isLoading: loadingAUM, isError, error, refetch, lastUpdated } = useFundAUM();

  // Use hooks for flow data and composition
  const { data: flowData = new Map(), isLoading: loadingFlows } = useHistoricalFlowData(date);
  const { data: compositionData = [], isLoading: loadingComp } = useFundComposition(selectedFundId);

  // Show error toast on fetch failure
  useEffect(() => {
    if (isError && error) {
      toast.error("Failed to load fund data", {
        description: "Please try again or contact support if the issue persists.",
      });
    }
  }, [isError, error]);

  // Reset selection on date change
  useEffect(() => {
    setSelectedFundId(null);
  }, [date]);

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

  const selectedFund = funds.find((f) => f.id === selectedFundId);
  const selectedFlows = selectedFundId ? flowData.get(selectedFundId) : null;

  const handleCloseDrawer = () => {
    setSelectedFundId(null);
  };

  return (
    <div className="space-y-8">
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Fund Financials
          </h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            {date && format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? (
              <>
                <span>Live AUM with daily flows.</span>
                {lastUpdated && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Radio className="h-2 w-2 text-green-500 animate-pulse" />
                    Live
                  </Badge>
                )}
              </>
            ) : (
              <span>Historical AUM and flows for {date ? format(date, 'PPP') : 'selected date'}.</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Flows for:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
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

      {/* Loading State */}
      {loadingAUM && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted rounded mb-4" />
                <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                  <div className="h-6 bg-muted rounded" />
                  <div className="h-6 bg-muted rounded" />
                  <div className="h-6 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && !loadingAUM && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load Fund Data</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              There was an error fetching fund information. This may be a temporary issue.
            </p>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State - No Active Funds */}
      {!loadingAUM && !isError && funds.filter(f => f.status === 'active').length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Active Funds</h3>
            <p className="text-muted-foreground text-center max-w-md">
              There are no active funds configured yet. Create a fund to start tracking AUM.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Snapshot Cards Grid - Using unified AUM data */}
      {!loadingAUM && !isError && funds.filter(f => f.status === 'active').length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {funds.filter(f => f.status === 'active').map((fund) => {
            const flows = flowData.get(fund.id);
            return (
              <Card
                key={fund.id}
                className={cn(
                  "hover:shadow-md transition-all cursor-pointer border-l-4",
                  selectedFundId === fund.id ? "ring-2 ring-primary shadow-lg" : "",
                  "border-l-primary"
                )}
                onClick={() => setSelectedFundId(fund.id)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <CryptoIcon symbol={fund.asset} className="h-10 w-10" />
                    <div>
                      <CardTitle className="text-lg font-bold">{fund.asset} Fund</CardTitle>
                      <p className="text-xs text-muted-foreground">{fund.name}</p>
                    </div>
                  </div>
                  {selectedFundId === fund.id && <Badge className="bg-primary">Selected</Badge>}
                </CardHeader>
                <CardContent>
                  {/* Main AUM - Historical or Live based on date */}
                  <div className="mt-4 mb-6">
                    {(() => {
                      const isToday = date && format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      const displayAUM = isToday ? fund.latest_aum : (flows?.aum ?? fund.latest_aum);
                      return (
                        <>
                          <div className="text-2xl font-bold text-foreground">
                            {formatAUM(displayAUM, fund.asset)}{" "}
                            <span className="text-sm text-muted-foreground font-normal">{fund.asset}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                              {isToday ? 'Total AUM' : 'AUM on Date'}
                            </p>
                            {isToday && (
                              <Badge variant="outline" className="text-xs">
                                {fund.investor_count} investors
                              </Badge>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Daily Flows Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
                    {/* Inflows */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Deposits</p>
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        +{formatAUM(flows?.daily_inflows || 0, fund.asset)}
                      </p>
                    </div>

                    {/* Outflows */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Withdrawals</p>
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                        -{formatAUM(flows?.daily_outflows || 0, fund.asset)}
                      </p>
                    </div>

                    {/* Net Flow */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Net Flow</p>
                      <p
                        className={cn(
                          "text-sm font-bold",
                          (flows?.net_flow_24h || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {(flows?.net_flow_24h || 0) > 0 ? "+" : ""}
                        {formatAUM(flows?.net_flow_24h || 0, fund.asset)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Investor Composition Drawer */}
      <Sheet open={!!selectedFundId} onOpenChange={(open) => !open && handleCloseDrawer()}>
        <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              {selectedFund && <CryptoIcon symbol={selectedFund.asset} className="h-8 w-8" />}
              <div>
                <SheetTitle className="text-xl">
                  {selectedFund?.name || "Fund"} - Investor Composition
                </SheetTitle>
                <SheetDescription>
                  Live ownership breakdown
                </SheetDescription>
              </div>
            </div>
            {selectedFund && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {formatAUM(selectedFund.latest_aum, selectedFund.asset)}{" "}
                  <span className="text-sm text-muted-foreground font-normal">{selectedFund.asset}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">Total Fund Size</p>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Radio className="h-2 w-2 text-green-500 animate-pulse" />
                    Live
                  </Badge>
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
                {loadingComp ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : sortedCompositionData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No investors found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCompositionData.map((investor, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        <TruncatedText text={investor.investor_name} maxLength={20} />
                      </TableCell>
                      <TableCell>
                        <TruncatedText text={investor.email} maxLength={25} />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {selectedFund && formatAUM(investor.balance, selectedFund.asset)}
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
    </div>
  );
};
