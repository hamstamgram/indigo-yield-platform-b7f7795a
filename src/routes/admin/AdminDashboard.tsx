/**
 * Admin Dashboard Page - "Command Center"
 * 3-column layout with pending actions, quick entry, and activity feed
 */

import { useEffect, useState } from "react";
import { Users, Activity, Loader2, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { FinancialSnapshot } from "@/components/admin/FinancialSnapshot";
import { PendingActionsPanel } from "@/components/admin/dashboard/PendingActionsPanel";
import { QuickYieldEntry } from "@/components/admin/dashboard/QuickYieldEntry";
import { RecentActivityFeed } from "@/components/admin/dashboard/RecentActivityFeed";

interface AdminStats {
  totalInvestors: number;
  activeInvestors: number;
  activePositionsCount: number;
  pendingWithdrawals: number;
  recentActivity: number;
}

function AdminDashboardContent() {
  const [stats, setStats] = useState<AdminStats>({
    totalInvestors: 0,
    activeInvestors: 0,
    activePositionsCount: 0,
    pendingWithdrawals: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminStats();

    const withdrawalChannel = supabase
      .channel("admin-withdrawals")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawal_requests",
          filter: "status=eq.pending",
        },
        () => loadAdminStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(withdrawalChannel);
    };
  }, []);

  const loadAdminStats = async () => {
    try {
      const { data: investors, error: invError } = await supabase
        .from("profiles")
        .select("id, status")
        .eq("is_admin", false);

      if (invError) throw invError;

      const positionsResult = await (supabase as any)
        .from("investor_positions")
        .select("investor_id, fund_id");

      const withdrawalsResult = await (supabase as any)
        .from("withdrawal_requests")
        .select("id")
        .eq("status", "pending");

      const recentActivityResult = await (supabase as any)
        .from("transactions_v2")
        .select("id")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      setStats({
        totalInvestors: investors?.length || 0,
        activeInvestors: investors?.filter((i: any) => i.status === "active").length || 0,
        activePositionsCount: positionsResult.data?.length || 0,
        pendingWithdrawals: withdrawalsResult.data?.length || 0,
        recentActivity: recentActivityResult.data?.length || 0,
      });
    } catch (error) {
      console.error("Failed to load admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">Platform overview and operational status</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          System Operational
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Investors</p>
                <p className="text-2xl font-mono font-bold">{stats.totalInvestors}</p>
              </div>
              <Users className="h-8 w-8 text-primary/20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {stats.activeInvestors} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Positions</p>
                <p className="text-2xl font-mono font-bold">{stats.activePositionsCount}</p>
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

      {/* Command Center 3-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Column 1: Pending Actions */}
        <div className="lg:col-span-1">
          <PendingActionsPanel />
        </div>

        {/* Column 2: Quick Yield Entry */}
        <div className="lg:col-span-1">
          <QuickYieldEntry />
        </div>

        {/* Column 3: Recent Activity */}
        <div className="lg:col-span-1">
          <RecentActivityFeed />
        </div>
      </div>

      {/* Financial Snapshot - Full Width Below */}
      <div className="pt-4">
        <FinancialSnapshot />
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
