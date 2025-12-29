/**
 * Admin Dashboard Page - "Command Center"
 * 3-column layout with pending actions, quick entry, and activity feed
 */

import { Users, Activity, Loader2, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminGuard, FinancialSnapshot, TwoFactorWarningBanner } from "@/components/admin";
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
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Positions</p>
                <p className="text-2xl font-mono font-bold">{stats.activePositions}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500/20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all funds</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${stats.pendingWithdrawals > 0 ? "border-l-amber-500" : "border-l-green-500"}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
                <p className={`text-2xl font-mono font-bold ${stats.pendingWithdrawals > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {stats.pendingWithdrawals}
                </p>
              </div>
              <Activity className={`h-8 w-8 ${stats.pendingWithdrawals > 0 ? "text-amber-500/20" : "text-green-500/20"}`} />
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
                <p className="text-xs text-muted-foreground uppercase tracking-wider">24h Activity</p>
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
