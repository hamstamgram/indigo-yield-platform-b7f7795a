/**
 * Investor Yield Manager - Unified View
 * Shows all fund positions with inline yield editing
 * Replaces the fragmented InvestorMonthlyTracking component
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  FileText,
  Settings2,
  Percent,
  ChevronDown,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subMonths, addMonths, startOfMonth } from "date-fns";
import { FundPositionCard } from "./FundPositionCard";
import { InvestorFeeManager } from "./InvestorFeeManager";
import { AddTransactionDialog } from "@/components/admin/AddTransactionDialog";

interface InvestorYieldManagerProps {
  investorId: string;
  investorName?: string;
}

interface Position {
  fund_id: string;
  fund_name: string;
  asset: string;
  current_value: number;
  shares: number;
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

interface FeeScheduleEntry {
  id: string;
  fund_id: string | null;
  fee_pct: number;
  effective_date: string;
}

export function InvestorYieldManager({ investorId, investorName }: InvestorYieldManagerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<Position[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [feeSchedule, setFeeSchedule] = useState<FeeScheduleEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfMonth(new Date()));
  const [showFeeManager, setShowFeeManager] = useState(false);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [addTxDialogOpen, setAddTxDialogOpen] = useState(false);
  const [defaultFundId, setDefaultFundId] = useState<string>("");

  const periodId = format(selectedDate, "yyyy-MM");

  // Fetch positions
  const fetchPositions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("investor_positions")
        .select(`
          fund_id,
          shares,
          current_value,
          funds!inner(name, asset, status)
        `)
        .eq("investor_id", investorId);

      if (error) throw error;

      const activePositions = (data || [])
        .filter((p: any) => p.funds?.status === "active")
        .map((p: any) => ({
          fund_id: p.fund_id,
          fund_name: p.funds?.name || "Unknown",
          asset: p.funds?.asset || "USD",
          current_value: p.current_value || 0,
          shares: p.shares || 0,
        }));

      setPositions(activePositions);
    } catch (error) {
      console.error("Error fetching positions:", error);
    }
  }, [investorId]);

  // Fetch performance data for selected period
  const fetchPerformance = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("investor_fund_performance")
        .select("*")
        .eq("investor_id", investorId)
        .eq("period_id", periodId);

      if (error) throw error;
      setPerformance(data || []);
    } catch (error) {
      console.error("Error fetching performance:", error);
    }
  }, [investorId, periodId]);

  // Fetch fee schedule
  const fetchFeeSchedule = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("investor_fee_schedule")
        .select("id, fund_id, fee_pct, effective_date")
        .eq("investor_id", investorId)
        .order("effective_date", { ascending: false });

      if (error) throw error;
      setFeeSchedule(data || []);
    } catch (error) {
      console.error("Error fetching fee schedule:", error);
    }
  }, [investorId]);

  // Fetch available periods
  const fetchPeriods = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("statement_periods")
        .select("id")
        .order("period_end_date", { ascending: false })
        .limit(24);

      if (error) throw error;
      setAvailablePeriods((data || []).map((p) => p.id));
    } catch (error) {
      console.error("Error fetching periods:", error);
    }
  }, []);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPositions(), fetchPerformance(), fetchFeeSchedule(), fetchPeriods()]);
      setLoading(false);
    };
    loadData();
  }, [fetchPositions, fetchPerformance, fetchFeeSchedule, fetchPeriods]);

  // Reload performance when period changes
  useEffect(() => {
    fetchPerformance();
  }, [periodId, fetchPerformance]);

  // Get fee for a specific fund
  const getFeeForFund = (fundId: string): number => {
    const today = new Date().toISOString().split("T")[0];
    // First try fund-specific fee
    const fundFee = feeSchedule.find(
      (f) => f.fund_id === fundId && f.effective_date <= today
    );
    if (fundFee) return fundFee.fee_pct;

    // Fall back to global fee
    const globalFee = feeSchedule.find(
      (f) => !f.fund_id && f.effective_date <= today
    );
    return globalFee?.fee_pct || 0.02;
  };

  // Get performance record for a fund
  const getPerformanceForFund = (fundName: string): PerformanceRecord | undefined => {
    return performance.find((p) => p.fund_name === fundName);
  };

  // Navigate months
  const goToPreviousMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const goToNextMonth = () => setSelectedDate(addMonths(selectedDate, 1));
  const isCurrentMonth = format(selectedDate, "yyyy-MM") === format(new Date(), "yyyy-MM");

  // Calculate totals
  const totalYield = performance.reduce((sum, p) => sum + (p.mtd_net_income || 0), 0);
  const hasPerformanceData = performance.length > 0;

  const handleDataUpdate = () => {
    fetchPerformance();
    fetchPositions();
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

          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
          >
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFeeManager(!showFeeManager)}
        >
          <Percent className="h-4 w-4 mr-2" />
          {showFeeManager ? "Hide" : "Manage"} Fees
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/monthly-data-entry")}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Bulk Yield Entry
        </Button>
      </div>

      {/* Fee Manager (Collapsible) */}
      <Collapsible open={showFeeManager} onOpenChange={setShowFeeManager}>
        <CollapsibleContent>
          <InvestorFeeManager investorId={investorId} onUpdate={fetchFeeSchedule} />
        </CollapsibleContent>
      </Collapsible>

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
                  <p className="text-2xl font-mono font-bold">
                    {totalYield >= 0 ? "+" : ""}
                    {totalYield.toFixed(4)}
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
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setAddTxDialogOpen(true)}
              >
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
                periodId={periodId}
                performanceId={perfRecord?.id}
                performance={perfRecord}
                feePercent={getFeeForFund(position.fund_id)}
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
        fundId={defaultFundId || (positions[0]?.fund_id || "")}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-transactions-history"] });
          queryClient.invalidateQueries({ queryKey: ["investor-positions", investorId] });
          handleDataUpdate();
          setAddTxDialogOpen(false);
        }}
      />
    </div>
  );
}
