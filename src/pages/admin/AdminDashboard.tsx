/**
 * Admin Dashboard Page - "Command Center"
 * 3-column layout with pending actions, quick entry, and activity feed
 * Enhanced with CTO/CFO Risk Monitoring (2026-01-12)
 * Real-time alert badge added (2026-01-19)
 */

import {
  Users,
  Activity,
  Loader2,
  CheckCircle2,
  Clock,
  TrendingUp,
  Shield,
  RefreshCw,
  Bell,
} from "lucide-react";
import {
  Card,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  QueryErrorBoundary,
  Button,
  Badge,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { AdminGuard, FinancialSnapshot, TwoFactorWarningBanner } from "@/components/admin";
import {
  LiquidityRiskPanel,
  ConcentrationRiskPanel,
  PlatformMetricsPanel,
  QuickActionsBar,
} from "@/components/admin/dashboard";
import { useAdminStats } from "@/hooks";
import {
  useUnacknowledgedAlertCount,
  useRealtimeAlerts,
} from "@/hooks/data/admin/useRealtimeAlerts";
import { PageHeader } from "@/components/layout";
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
      queryClient.invalidateQueries({ queryKey: ["liquidity-risk"] }),
      queryClient.invalidateQueries({ queryKey: ["concentration-risk"] }),
      queryClient.invalidateQueries({ queryKey: ["platform-metrics"] }),
    ]);
    setIsRefreshing(false);
  };

  const handleAlertClick = () => {
    navigate("/admin/integrity");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto animate-fade-in pb-20">
      {/* 2FA Warning Banner for Admins */}
      <TwoFactorWarningBanner />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground flex items-center gap-3">
            Command Center
            <Badge
              variant="outline"
              className="text-xs font-mono font-normal text-muted-foreground border-border/50"
            >
              v2.4.0
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            Platform overview, risk monitoring, and operational status
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* System Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mr-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse relative">
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
            </div>
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              System Operational
            </span>
          </div>

          {/* Alert Badge */}
          <Button
            variant="outline"
            size="icon"
            className="relative glass-panel hover:bg-white/10 w-10 h-10"
            onClick={handleAlertClick}
            title="View integrity alerts"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </Button>

          <Button
            variant="default"
            className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-medium"
            onClick={() => navigate("/admin/transactions/new")}
          >
            <Shield className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* Quick Actions Bar - Floating Glass */}
      <div className="sticky top-4 z-30">
        <QuickActionsBar />
      </div>

      {/* Quick Stats Bar - High Contrast Blocks */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 border border-indigo-500/20 p-5 backdrop-blur-sm relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Investors</p>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500/20 transition-colors">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-foreground mb-1">
            {stats.totalProfiles}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span className="font-medium text-foreground/80">{stats.activeProfiles}</span> active
            profiles
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/20 p-5 backdrop-blur-sm relative overflow-hidden group hover:border-blue-500/40 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">
              Active Positions
            </p>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-colors">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-foreground mb-1">
            {stats.activePositions}
          </div>
          <p className="text-xs text-muted-foreground">Across all monitored funds</p>
        </div>

        <div
          className={cn(
            "rounded-2xl border p-5 backdrop-blur-sm relative overflow-hidden group transition-all",
            stats.pendingWithdrawals > 0
              ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
              : "bg-green-500/5 border-green-500/20 hover:border-green-500/40"
          )}
        >
          <div className="flex justify-between items-start mb-2">
            <p
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                stats.pendingWithdrawals > 0 ? "text-amber-500" : "text-green-600"
              )}
            >
              Pending Actions
            </p>
            <div
              className={cn(
                "p-2 rounded-lg transition-colors",
                stats.pendingWithdrawals > 0
                  ? "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20"
                  : "bg-green-500/10 text-green-500 group-hover:bg-green-500/20"
              )}
            >
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-foreground mb-1">
            {stats.pendingWithdrawals}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {stats.pendingWithdrawals > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                requires attention
              </>
            ) : (
              "All systems updated"
            )}
          </p>
        </div>

        <div className="rounded-2xl bg-background/40 border border-border/50 p-5 backdrop-blur-sm relative overflow-hidden group hover:bg-background/60 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              24h Activity
            </p>
            <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-foreground mb-1">
            {stats.recentActivity}
          </div>
          <p className="text-xs text-muted-foreground">Events logged today</p>
        </div>
      </div>

      {/* Financial Snapshot - Full Width Glass */}
      <div className="rounded-3xl border border-white/5 shadow-2xl overflow-hidden glass-panel">
        <FinancialSnapshot />
      </div>

      {/* CTO/CFO Risk Management Section - Glass Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Risk Management</h2>
              <p className="text-xs text-muted-foreground">
                Real-time liquidity and concentration monitoring
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshRiskData}
            disabled={isRefreshing}
            className="text-xs hover:bg-white/5"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>

        <Tabs defaultValue="liquidity" className="w-full">
          <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/20 backdrop-blur-md rounded-xl border border-white/5">
            <TabsTrigger
              value="liquidity"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Liquidity
            </TabsTrigger>
            <TabsTrigger
              value="concentration"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Concentration
            </TabsTrigger>
            <TabsTrigger
              value="metrics"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Platform Metrics
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl min-h-[400px] p-6 shadow-sm">
            <TabsContent
              value="liquidity"
              className="mt-0 animate-fade-in focus-visible:outline-none"
            >
              <QueryErrorBoundary>
                <LiquidityRiskPanel />
              </QueryErrorBoundary>
            </TabsContent>
            <TabsContent
              value="concentration"
              className="mt-0 animate-fade-in focus-visible:outline-none"
            >
              <QueryErrorBoundary>
                <ConcentrationRiskPanel />
              </QueryErrorBoundary>
            </TabsContent>
            <TabsContent
              value="metrics"
              className="mt-0 animate-fade-in focus-visible:outline-none"
            >
              <QueryErrorBoundary>
                <PlatformMetricsPanel />
              </QueryErrorBoundary>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
export default function AdminDashboard() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
