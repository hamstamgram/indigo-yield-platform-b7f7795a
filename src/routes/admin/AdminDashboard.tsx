/**
 * Admin Dashboard Page
 * Main admin overview with key metrics
 *
 * Updated for "Command Center" aesthetic
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  FileText,
  Shield,
  Settings,
  Activity,
  Loader2,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";

interface AdminStats {
  totalInvestors: number;
  activeInvestors: number;
  pendingVerifications: number;
  activePositionsCount: number; // Replaces totalAUM since we don't have fiat
  pendingWithdrawals: number;
  recentActivity: number;
}

interface AdminAction {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  color: string; // Tailwind text color class
  badge?: number;
}

function AdminDashboardContent() {
  const [stats, setStats] = useState<AdminStats>({
    totalInvestors: 0,
    activeInvestors: 0,
    pendingVerifications: 0,
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
      const investorsResult = await (supabase as any).from("investors").select("id, status");
      // investor_positions does not expose a status column; count all positions
      const positionsResult = await (supabase as any)
        .from("investor_positions")
        .select("investor_id, fund_id");
      const withdrawalsResult = await (supabase as any)
        .from("withdrawal_requests")
        .select("id")
        .eq("status", "pending");
      const pendingInvestors = await (supabase as any)
        .from("investors")
        .select("id")
        .eq("kyc_status", "pending");
      const recentActivityResult = await (supabase as any)
        .from("investments")
        .select("id")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      setStats({
        totalInvestors: investorsResult.data?.length || 0,
        activeInvestors:
          investorsResult.data?.filter((i: any) => i.status === "active").length || 0,
        pendingVerifications: pendingInvestors.data?.length || 0,
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

  const adminActions: AdminAction[] = [
    {
      title: "Investors",
      description: "Manage investor accounts",
      href: "/admin/investors",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Transactions",
      description: "View all transactions",
      href: "/admin/transactions",
      icon: Activity,
      color: "text-green-500",
    },
    {
      title: "Withdrawals",
      description: "Approve withdrawal requests",
      href: "/admin/withdrawals",
      icon: DollarSign,
      color: "text-amber-500",
      badge: stats.pendingWithdrawals > 0 ? stats.pendingWithdrawals : undefined,
    },
    {
      title: "Documents",
      description: "Review pending documents",
      href: "/admin/documents",
      icon: FileText,
      color: "text-purple-500",
    },
    {
      title: "Compliance",
      description: "KYC/AML oversight",
      href: "/admin/compliance",
      icon: Shield,
      color: "text-red-500",
      badge: stats.pendingVerifications > 0 ? stats.pendingVerifications : undefined,
    },
    {
      title: "Reports",
      description: "Generate admin reports",
      href: "/admin/reports",
      icon: TrendingUp,
      color: "text-indigo-500",
    },
    {
      title: "Settings",
      description: "Platform configuration",
      href: "/admin/settings",
      icon: Settings,
      color: "text-gray-500",
    },
    {
      title: "Audit Logs",
      description: "View system audit logs",
      href: "/admin/audit-logs",
      icon: AlertCircle,
      color: "text-cyan-500",
    },
  ];

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
              {stats.pendingWithdrawals + stats.pendingVerifications}
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
      import FundAUMManager from "@/components/admin/funds/FundAUMManager"; import{" "}
      {FundPerformanceHistory} from "@/components/admin/funds/FundPerformanceHistory"; // ...
      existing imports ... // ... inside AdminDashboardContent ...
      {/* Operational Grid */}
      <div>
        <h2 className="text-xl font-display font-bold mb-4 tracking-tight">Operational Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {adminActions.map((action) => (
            <Link key={action.href} to={action.href}>
              <Card className="dashboard-card border-0 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full group">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`rounded-xl bg-muted/50 p-3 group-hover:bg-primary/10 transition-colors`}
                    >
                      <action.icon className={`h-6 w-6 ${action.color}`} />
                    </div>
                    {action.badge && (
                      <Badge variant="destructive" className="animate-pulse">
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-1">{action.title}</h3>
                  <p className="text-sm text-muted-foreground leading-snug">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      {/* Fund Management Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-display font-bold tracking-tight">Fund Management</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <FundAUMManager />
          </div>
          <div className="lg:col-span-2">
            <FundPerformanceHistory />
          </div>
        </div>
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
