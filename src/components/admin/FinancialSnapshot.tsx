import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Radio, AlertCircle, RefreshCw, TrendingUp } from "lucide-react";
import {
  Card, CardContent, Badge, Button, Calendar,
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { useFundAUM } from "@/hooks";
import { useHistoricalFlowData, useFundComposition } from "@/hooks/data";
import { toast } from "sonner";
import { FundSnapshotCard } from "./dashboard/FundSnapshotCard";
import { InvestorCompositionSheet } from "./dashboard/InvestorCompositionSheet";

export const FinancialSnapshot: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);

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

  // Memoize filtered funds to avoid recalculating on every render
  const activeFunds = useMemo(() => 
    funds.filter((f) => f.status === 'active'),
    [funds]
  );

  const selectedFund = useMemo(() => 
    funds.find((f) => f.id === selectedFundId),
    [funds, selectedFundId]
  );

  // Memoize click handlers to prevent unnecessary re-renders of FundSnapshotCard
  const handleFundClick = useCallback((fundId: string) => {
    setSelectedFundId(fundId);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedFundId(null);
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Check if viewing today
  const isViewingToday = useMemo(() => {
    if (!date) return false;
    return format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  }, [date]);

  return (
    <div className="space-y-8">
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Fund Financials
          </h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            {isViewingToday ? (
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
              <div className="flex flex-row items-center gap-3 p-6 pb-2">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="h-8 w-32 bg-muted rounded mb-4" />
                <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                  <div className="h-6 bg-muted rounded" />
                  <div className="h-6 bg-muted rounded" />
                  <div className="h-6 bg-muted rounded" />
                </div>
              </div>
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
            <Button onClick={handleRetry} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State - No Active Funds */}
      {!loadingAUM && !isError && activeFunds.length === 0 && (
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
      {!loadingAUM && !isError && activeFunds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeFunds.map((fund) => (
            <FundSnapshotCard
              key={fund.id}
              fund={fund}
              flows={flowData.get(fund.id)}
              isSelected={selectedFundId === fund.id}
              date={date}
              onClick={() => handleFundClick(fund.id)}
            />
          ))}
        </div>
      )}

      {/* Investor Composition Drawer */}
      <InvestorCompositionSheet
        open={!!selectedFundId}
        onOpenChange={(open) => !open && handleCloseDrawer()}
        fund={selectedFund}
        compositionData={compositionData}
        isLoading={loadingComp}
      />
    </div>
  );
};
