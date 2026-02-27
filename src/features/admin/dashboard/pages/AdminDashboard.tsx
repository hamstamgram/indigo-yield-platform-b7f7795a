/**
 * Admin Dashboard Page - "Command Center"
 * 3-column layout with pending actions, quick entry, and activity feed
 * Enhanced with CTO/CFO Risk Monitoring
 * REDESIGNED: Yield Spectrum "Command Center" v2
 */

import {
  Users,
  Activity,
  Loader2,
  Clock,
  TrendingUp,
  Shield,
  RefreshCw,
  Bell,
  Command,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  QueryErrorBoundary,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Skeleton,
} from "@/components/ui";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { cn } from "@/lib/utils";
import { AdminGuard, FinancialSnapshot } from "@/components/admin";
import { PageShell } from "@/components/layout/PageShell";
import { MetricStrip, type MetricItem } from "@/components/common/MetricStrip";
import {
  LiquidityRiskPanel,
  ConcentrationRiskPanel,
  PlatformMetricsPanel,
  QuickActionsBar,
} from "@/features/admin/dashboard";
import { useAdminStats } from "@/hooks";
import {
  useUnacknowledgedAlertCount,
  useRealtimeAlerts,
} from "@/features/admin/system/hooks/useRealtimeAlerts";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AddTransactionDialog } from "@/features/admin/transactions/AddTransactionDialog";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { useYieldOperationsState } from "@/hooks/data/admin/useYieldOperationsState";
import {
  usePendingYieldEvents,
  useInvestorCrystallizationEvents,
} from "@/features/admin/yields/hooks/useYieldCrystallization";
import { useAUMReconciliation } from "@/features/admin/system/hooks/useAUMReconciliation";
import { getMonth, getYear } from "date-fns";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  OpenPeriodDialog,
  YieldInputForm,
  YieldPreviewResults,
  YieldConfirmDialog,
} from "@/features/admin/yields/components";

function AdminDashboardContent() {
  const { stats, loading, refetch: refetchStats } = useAdminStats();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showApplyYieldPicker, setShowApplyYieldPicker] = useState(false);

  // Yield operations state
  const ops = useYieldOperationsState();

  // Yield crystallization hooks
  const reportingMonthDate = ops.reportingMonth ? new Date(ops.reportingMonth) : null;
  const { data: pendingEvents } = usePendingYieldEvents(
    ops.selectedFund?.id || null,
    reportingMonthDate ? getYear(reportingMonthDate) : new Date().getFullYear(),
    reportingMonthDate ? getMonth(reportingMonthDate) + 1 : new Date().getMonth() + 1
  );

  const crystalEnabled =
    (ops.yieldPreview?.crystalsInPeriod ?? 0) > 0 && ops.yieldPurpose === "reporting";
  const { data: crystallizationMap } = useInvestorCrystallizationEvents(
    ops.selectedFund?.id || null,
    ops.yieldPreview?.periodStart || null,
    ops.yieldPreview?.periodEnd || null,
    crystalEnabled
  );

  const { data: reconciliation } = useAUMReconciliation(ops.selectedFund?.id || null);

  const handleRecordYield = (fundId: string) => {
    const fund = ops.funds.find((f) => f.id === fundId);
    if (fund) {
      ops.openYieldDialog(fund);
    }
  };

  const handleOpenPeriod = (fundId: string) => {
    const fund = ops.funds.find((f) => f.id === fundId);
    if (fund) {
      ops.setSelectedFund(fund);
      ops.setShowOpenPeriodDialog(true);
    }
  };

  // Real-time alerts subscription and count
  useRealtimeAlerts();
  const { data: alertCount = 0 } = useUnacknowledgedAlertCount();

  const handleRefreshRiskData = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.liquidityRisk }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.concentrationRisk }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.platformMetrics }),
    ]);
    setIsRefreshing(false);
  };

  const handleAlertClick = () => {
    navigate("/admin/operations");
  };

  if (loading) {
    return (
      <PageShell maxWidth="wide">
        <div className="space-y-6 animate-pulse">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="wide">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">
            Command Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">Operational overview and risk monitoring</p>
        </div>

        <div className="flex items-center gap-4">
          {/* System Status Indicator */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-yield/5 border border-yield/20 shadow-[0_0_15px_-5px_rgba(196,150,42,0.2)]">
            <div className="h-2 w-2 rounded-full bg-yield animate-pulse relative">
              <div className="absolute inset-0 rounded-full bg-yield animate-ping opacity-75"></div>
            </div>
            <span className="text-xs font-bold text-yield uppercase tracking-wider">
              System Operational
            </span>
          </div>

          {/* Alert Badge */}
          <Button
            variant="outline"
            size="icon"
            className="relative h-12 w-12 rounded-xl glass-panel hover:bg-white/10 border-white/10"
            onClick={handleAlertClick}
            title="View integrity alerts"
          >
            <Bell className={cn("h-5 w-5", alertCount > 0 ? "text-white" : "text-slate-400")} />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(244,63,94,0.5)] ring-2 ring-black">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </Button>

          <Button
            size="lg"
            className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)] border border-primary/20"
            onClick={() => setShowApplyYieldPicker(true)}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Apply Yield
          </Button>

          <Button
            size="lg"
            className="h-12 px-6 bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] border border-indigo-400/20"
            onClick={() => setShowAddTransaction(true)}
          >
            <Command className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
        </div>
      </div>

      <AddTransactionDialog
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        onSuccess={() => {
          setShowAddTransaction(false);
          invalidateAfterTransaction(queryClient);
          refetchStats();
        }}
      />

      {/* Yield Distribution Dialog */}
      <Dialog open={ops.showYieldDialog} onOpenChange={ops.setShowYieldDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-panel border-white/10 p-0">
          <DialogHeader className="p-6 bg-black/20 border-b border-white/5">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              {ops.selectedFund && (
                <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <CryptoIcon symbol={ops.selectedFund.asset} className="h-6 w-6 text-white" />
                </div>
              )}
              <span className="text-white">Record Yield Event</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-base">
              Enter the yield amount or new AUM to calculate distribution for{" "}
              <span className="text-indigo-400 font-medium">{ops.selectedFund?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 p-6">
            <YieldInputForm
              selectedFund={ops.selectedFund}
              newAUM={ops.newAUM}
              setNewAUM={ops.setNewAUM}
              yieldPurpose={ops.yieldPurpose}
              setYieldPurpose={ops.setYieldPurpose}
              aumDate={ops.aumDate}
              setAumDate={ops.setAumDate}
              reportingMonth={ops.reportingMonth}
              availableMonths={ops.getAvailableMonths()}
              handleReportingMonthChange={ops.handleReportingMonthChange}
              validateEffectiveDate={ops.validateEffectiveDate}
              handlePreviewYield={ops.handlePreviewYield}
              previewLoading={ops.previewLoading}
              hasPreview={!!ops.yieldPreview}
              formatValue={ops.formatValue}
              reconciliation={reconciliation}
              pendingEvents={pendingEvents}
              asOfAum={ops.asOfAum}
              asOfAumLoading={ops.asOfAumLoading}
              existingDistributionDate={ops.existingDistributionDate}
              aumTime={ops.aumTime}
              setAumTime={ops.setAumTime}
            />

            {ops.yieldPreview && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <YieldPreviewResults
                  yieldPreview={ops.yieldPreview}
                  selectedFund={ops.selectedFund}
                  formatValue={ops.formatValue}
                  showSystemAccounts={ops.showSystemAccounts}
                  setShowSystemAccounts={ops.setShowSystemAccounts}
                  showOnlyChanged={ops.showOnlyChanged}
                  setShowOnlyChanged={ops.setShowOnlyChanged}
                  searchInvestor={ops.searchInvestor}
                  setSearchInvestor={ops.setSearchInvestor}
                  getFilteredDistributions={ops.getFilteredDistributions}
                  onConfirmApply={ops.handleConfirmApply}
                  applyLoading={ops.applyLoading}
                  crystallizationMap={crystallizationMap}
                  yieldPurpose={ops.yieldPurpose}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Yield Confirmation Dialog */}
      <YieldConfirmDialog
        open={ops.showConfirmDialog}
        onOpenChange={ops.setShowConfirmDialog}
        selectedFund={ops.selectedFund}
        yieldPurpose={ops.yieldPurpose}
        aumDate={ops.aumDate}
        distributionDate={ops.distributionDate}
        yieldPreview={ops.yieldPreview}
        confirmationText={ops.confirmationText}
        setConfirmationText={ops.setConfirmationText}
        acknowledgeDiscrepancy={ops.acknowledgeDiscrepancy}
        setAcknowledgeDiscrepancy={ops.setAcknowledgeDiscrepancy}
        reconciliation={reconciliation}
        formatValue={ops.formatValue}
        onApply={ops.handleApplyYield}
        applyLoading={ops.applyLoading}
        existingDistributionDate={ops.existingDistributionDate}
      />

      {/* Open Period Dialog */}
      <OpenPeriodDialog
        open={ops.showOpenPeriodDialog}
        onOpenChange={ops.setShowOpenPeriodDialog}
        fund={ops.selectedFund}
        onSuccess={() => ops.refetchFunds()}
      />

      {/* Apply Yield - Fund Picker Dialog */}
      <Dialog open={showApplyYieldPicker} onOpenChange={setShowApplyYieldPicker}>
        <DialogContent className="max-w-lg glass-panel border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Apply Yield</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select a fund to record a yield distribution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {ops.funds.map((fund) => (
              <button
                key={fund.id}
                type="button"
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-indigo-500/30 transition-all text-left"
                disabled={fund.investor_count === 0}
                onClick={() => {
                  setShowApplyYieldPicker(false);
                  ops.openYieldDialog(fund);
                }}
              >
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <CryptoIcon symbol={fund.asset} className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white">{fund.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{fund.code}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-white">
                    {ops.formatValue(fund.total_aum, fund.asset)} {fund.asset}
                  </div>
                  <div className="text-xs text-slate-400">
                    {fund.investor_count} investor{fund.investor_count !== 1 ? "s" : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Actions Bar - Floating Glass */}
      <div className="sticky top-4 z-30">
        <QuickActionsBar />
      </div>

      {/* Quick Stats Strip */}
      <MetricStrip
        metrics={
          [
            {
              label: "Accounts",
              value: stats.totalProfiles,
              icon: Users,
              color: "info",
              trendValue: `${stats.uniqueInvestorsWithPositions} active`,
              trend: "up",
            },
            {
              label: "Positions",
              value: stats.activePositions,
              icon: TrendingUp,
              color: "default",
            },
            {
              label: "Pending",
              value: stats.pendingWithdrawals,
              icon: Activity,
              color: stats.pendingWithdrawals > 0 ? "warning" : "success",
            },
            {
              label: "Today",
              value: stats.recentActivity,
              icon: Clock,
            },
          ] satisfies MetricItem[]
        }
      />

      {/* Financial Snapshot - Full Width Glass */}
      <div className="glass-panel rounded-2xl border border-white/5 shadow-2xl overflow-hidden p-[1px] bg-gradient-to-br from-white/10 to-transparent">
        <div className="bg-black/40 rounded-[15px] overflow-hidden backdrop-blur-md">
          <FinancialSnapshot onRecordYield={handleRecordYield} />
        </div>
      </div>

      {/* CTO/CFO Risk Management Section - Glass Tabs */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Risk Analysis</h2>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Real-time liquidity and concentration monitoring
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshRiskData}
            disabled={isRefreshing}
            className="text-xs text-slate-400 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isRefreshing && "animate-spin")} />
            Refresh Data
          </Button>
        </div>

        <Tabs defaultValue="liquidity" className="w-full">
          <TabsList className="bg-black/20 border border-white/10 p-1 rounded-xl w-full max-w-md">
            <TabsTrigger
              value="liquidity"
              className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
            >
              Liquidity
            </TabsTrigger>
            <TabsTrigger
              value="concentration"
              className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
            >
              Concentration
            </TabsTrigger>
            <TabsTrigger
              value="metrics"
              className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
            >
              Platform Metrics
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent
              value="liquidity"
              className="mt-0 animate-fade-in focus-visible:outline-none"
            >
              <QueryErrorBoundary>
                <div className="glass-panel border-white/10 rounded-2xl overflow-hidden">
                  <LiquidityRiskPanel />
                </div>
              </QueryErrorBoundary>
            </TabsContent>
            <TabsContent
              value="concentration"
              className="mt-0 animate-fade-in focus-visible:outline-none"
            >
              <QueryErrorBoundary>
                <div className="glass-panel border-white/10 rounded-2xl overflow-hidden">
                  <ConcentrationRiskPanel />
                </div>
              </QueryErrorBoundary>
            </TabsContent>
            <TabsContent
              value="metrics"
              className="mt-0 animate-fade-in focus-visible:outline-none"
            >
              <QueryErrorBoundary>
                <div className="glass-panel border-white/10 rounded-2xl overflow-hidden">
                  <PlatformMetricsPanel />
                </div>
              </QueryErrorBoundary>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </PageShell>
  );
}
export default function AdminDashboard() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
