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

function AdminDashboardContent() {
  const { stats, loading } = useAdminStats();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    navigate("/admin/integrity");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <PageShell maxWidth="wide">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-white flex items-center gap-3">
            Command Center
            <Badge
              variant="outline"
              className="px-2 py-0.5 text-xs font-mono font-normal text-indigo-300 border-indigo-500/30 bg-indigo-500/5"
            >
              v3.0.0
            </Badge>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Operational overview and risk monitoring</p>
        </div>

        <div className="flex items-center gap-4">
          {/* System Status Indicator */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.2)]">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
            </div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
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
            className="h-12 px-6 bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] border border-indigo-400/20"
            onClick={() => navigate("/admin/transactions/new")}
          >
            <Command className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
        </div>
      </div>

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
          <FinancialSnapshot />
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
