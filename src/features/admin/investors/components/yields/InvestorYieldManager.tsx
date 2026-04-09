/**
 * Investor Yield Manager - Unified View
 * Shows all fund positions with inline yield editing
 * Replaces the fragmented InvestorMonthlyTracking component
 */

import { useState, useMemo } from "react";
import Decimal from "decimal.js";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton } from "@/components/ui";
import { FinancialValue } from "@/components/common/FinancialValue";
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, FileText, Plus } from "lucide-react";
import { format, subMonths, addMonths, startOfMonth } from "date-fns";
import { FundPositionCard } from "../shared/FundPositionCard";
import AddTransactionDialog from "@/features/admin/transactions/AddTransactionDialog";
import { useStatementPeriodId, useInvestorPositionsWithFunds, useInvestorPerformanceForPeriod } from "@/features/investor/performance/hooks/useInvestorYieldData";
interface InvestorYieldManagerProps {
  investorId: string;
  investorName?: string;
}

interface PerformanceRecord {
  id: string;
  fund_name: string;
  period_id: string;
  mtd_beginning_balance: number;
  mtd_ending_balance: number;
  mtd_additions: number;
  mtd_redemptions: number;
  mtd_net_income: number;
  mtd_rate_of_return: number;
  ytd_net_income: number;
  ytd_rate_of_return: number;
  itd_net_income: number;
  itd_rate_of_return: number;
}

export function InvestorYieldManager({ investorId, investorName }: InvestorYieldManagerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfMonth(new Date()));
  const [addTxDialogOpen, setAddTxDialogOpen] = useState(false);
  const [defaultFundId, setDefaultFundId] = useState<string>("");

  // React Query hooks
  const { data: periodId } = useStatementPeriodId(selectedDate);
  const {
    data: positions = [],
    isLoading: positionsLoading,
    refetch: refetchPositions,
  } = useInvestorPositionsWithFunds(investorId);
  const {
    data: performance = [],
    isLoading: perfLoading,
    refetch: refetchPerformance,
  } = useInvestorPerformanceForPeriod(investorId, periodId ?? null);

  const loading = positionsLoading || perfLoading;

  // Get performance record for a fund
  const getPerformanceForFund = (fundName: string): PerformanceRecord | undefined => {
    return performance.find((p) => p.fund_name === fundName);
  };

  // Navigate months
  const goToPreviousMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const goToNextMonth = () => setSelectedDate(addMonths(selectedDate, 1));
  const isCurrentMonth = format(selectedDate, "yyyy-MM") === format(new Date(), "yyyy-MM");

  // Calculate totals
  const totalYield = useMemo(
    () => performance.reduce((sum, p) => sum.plus(new Decimal(p.mtd_net_income || 0)), new Decimal(0)).toString(),
    [performance]
  );
  const hasPerformanceData = performance.length > 0;

  const handleDataUpdate = () => {
    refetchPerformance();
    refetchPositions();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Yield Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage all fund positions and yields for {investorName || "this investor"}
          </p>
        </div>

        {/* Period Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md min-w-[160px] justify-center">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{format(selectedDate, "MMMM yyyy")}</span>
          </div>

          <Button variant="outline" size="icon" onClick={goToNextMonth} disabled={isCurrentMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/admin/investor-reports?investor=${investorId}`)}
        >
          <FileText className="h-4 w-4 mr-2" />
          View Reports
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/yield-history")}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Bulk Yield Entry
        </Button>
      </div>

      {/* Summary Card */}
      {hasPerformanceData && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total MTD Net Income</p>
                  <p className="text-2xl font-bold">
                    <FinancialValue value={totalYield} showAsset={false} colorize prefix={new Decimal(totalYield).greaterThanOrEqualTo(0) ? "+" : ""} />
                  </p>
                </div>
              </div>
              <Badge variant={hasPerformanceData ? "default" : "secondary"}>
                {performance.length} fund{performance.length !== 1 ? "s" : ""} tracked
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Performance Data Warning */}
      {!hasPerformanceData && positions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  No performance data for {format(selectedDate, "MMMM yyyy")}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  Generate reports for this period or expand a fund card below to add data manually.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fund Position Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Fund Positions ({positions.length})
        </h3>

        {positions.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No active fund positions found.</p>
              <Button variant="outline" className="mt-4" onClick={() => setAddTxDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </CardContent>
          </Card>
        ) : (
          positions.map((position) => {
            const perfRecord = getPerformanceForFund(position.asset);
            return (
              <FundPositionCard
                key={position.fund_id}
                fundId={position.fund_id}
                fundName={position.fund_name}
                assetCode={position.asset}
                currentBalance={position.current_value}
                investorId={investorId}
                periodId={periodId || undefined}
                performanceId={perfRecord?.id}
                performance={perfRecord}
                onUpdate={handleDataUpdate}
              />
            );
          })
        )}
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionDialog
        open={addTxDialogOpen}
        onOpenChange={setAddTxDialogOpen}
        investorId={investorId}
        fundId={defaultFundId || positions[0]?.fund_id || ""}
        onSuccess={() => {
          invalidateAfterTransaction(
            queryClient,
            investorId,
            defaultFundId || positions[0]?.fund_id
          );
          handleDataUpdate();
          setAddTxDialogOpen(false);
        }}
      />
    </div>
  );
}
