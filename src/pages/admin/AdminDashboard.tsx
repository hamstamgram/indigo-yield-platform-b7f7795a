/**
 * Admin Dashboard Page - "Command Center"
 * 3-column layout with pending actions, quick entry, and activity feed
 * Enhanced with CTO/CFO Risk Monitoring (2026-01-12)
 */

import { Users, Activity, Loader2, CheckCircle2, Clock, TrendingUp, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  QueryErrorBoundary,
} from "@/components/ui";
import { AdminGuard, FinancialSnapshot, TwoFactorWarningBanner } from "@/components/admin";
import {
  RiskAlertsPanel,
  LiquidityRiskPanel,
  ConcentrationRiskPanel,
  PlatformMetricsPanel,
} from "@/components/admin/dashboard";
import { useAdminStats } from "@/hooks";
import { PageHeader } from "@/components/layout";

function AdminDashboardContent() {
  const { stats, loading } = useAdminStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 2FA Warning Banner for Admins */}
      <TwoFactorWarningBanner />
      <PageHeader
        title="Command Center"
        subtitle="Platform overview and operational status"
        actions={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            System Operational
          </div>
        }
      />

      {/* Quick Stats Bar */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Investors</p>
                <p className="text-2xl font-mono font-bold">{stats.totalProfiles}</p>
              </div>
              <Users className="h-8 w-8 text-primary/20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {stats.activeProfiles} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Active Positions
                </p>
                <p className="text-2xl font-mono font-bold">{stats.activePositions}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500/20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all funds</p>
          </CardContent>
        </Card>

        <Card
          className={`border-l-4 ${stats.pendingWithdrawals > 0 ? "border-l-amber-500" : "border-l-green-500"}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
                <p
                  className={`text-2xl font-mono font-bold ${stats.pendingWithdrawals > 0 ? "text-amber-600" : "text-green-600"}`}
                >
                  {stats.pendingWithdrawals}
                </p>
              </div>
              <Activity
                className={`h-8 w-8 ${stats.pendingWithdrawals > 0 ? "text-amber-500/20" : "text-green-500/20"}`}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingWithdrawals > 0 ? "Requires attention" : "All caught up"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  24h Activity
                </p>
                <p className="text-2xl font-mono font-bold">{stats.recentActivity}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500/20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Events logged</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Snapshot */}
      <FinancialSnapshot />

      {/* CTO/CFO Risk Management Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Risk Management</h2>
        </div>

        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="alerts">Risk Alerts</TabsTrigger>
            <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
            <TabsTrigger value="concentration">Concentration</TabsTrigger>
            <TabsTrigger value="metrics">Platform Metrics</TabsTrigger>
          </TabsList>
          <TabsContent value="alerts" className="mt-4">
            <QueryErrorBoundary>
              <RiskAlertsPanel maxAlerts={10} />
            </QueryErrorBoundary>
          </TabsContent>
          <TabsContent value="liquidity" className="mt-4">
            <QueryErrorBoundary>
              <LiquidityRiskPanel />
            </QueryErrorBoundary>
          </TabsContent>
          <TabsContent value="concentration" className="mt-4">
            <QueryErrorBoundary>
              <ConcentrationRiskPanel />
            </QueryErrorBoundary>
          </TabsContent>
          <TabsContent value="metrics" className="mt-4">
            <QueryErrorBoundary>
              <PlatformMetricsPanel />
            </QueryErrorBoundary>
          </TabsContent>
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
