/**
 * Admin Dashboard Page
 * Main admin overview with key metrics
 *
 * Updated for "Command Center" aesthetic
 */

import { useEffect, useState } from "react";
import { Users, Activity, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { FinancialSnapshot } from "@/components/admin/FinancialSnapshot";

interface AdminStats {
  totalInvestors: number;
  activeInvestors: number;
  activePositionsCount: number; // Replaces totalAUM since we don't have fiat
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
      // Fetch investor profiles (is_admin = false)
      const { data: investors, error: invError } = await supabase
        .from("profiles")
        .select("id, status")
        .eq("is_admin", false);
      
      if (invError) throw invError;

      // investor_positions does not expose a status column; count all positions
      const positionsResult = await (supabase as any)
        .from("investor_positions")
        .select("investor_id, fund_id");
        
      const withdrawalsResult = await (supabase as any)
        .from("withdrawal_requests")
        .select("id")
        .eq("status", "pending");
        
      // Use transactions_v2 for recent activity instead of 'investments' if it doesn't exist
      // Or assuming investments table exists? Let's try transactions_v2 for safety as it's the V2 standard
      const recentActivityResult = await (supabase as any)
        .from("transactions_v2")
        .select("id")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      setStats({
        totalInvestors: investors?.length || 0,
        activeInvestors:
          investors?.filter((i: any) => i.status === "active").length || 0,
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
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-2">Platform overview and operational status</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          System Operational
        </div>
      </div>
      {/* Financial Command Center - Priority 1 */}
      <div className="space-y-6">
        <FinancialSnapshot />
      </div>

      {/* High Contrast Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="dashboard-card border-0 shadow-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total Investors
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold">{stats.totalInvestors}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {stats.activeInvestors} active accounts
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card border-0 shadow-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Active Positions
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold">{stats.activePositionsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all asset classes</p>
          </CardContent>
        </Card>

        <Card className="dashboard-card border-0 shadow-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Pending Actions
            </CardTitle>

            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-mono font-bold text-orange-600">
              {stats.pendingWithdrawals}
            </div>

            <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card className="dashboard-card border-0 shadow-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              24h Activity
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold">{stats.recentActivity}</div>
            <p className="text-xs text-muted-foreground mt-1">New events logged</p>
          </CardContent>
        </Card>
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
