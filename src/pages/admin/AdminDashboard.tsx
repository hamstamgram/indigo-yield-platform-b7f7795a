/**
 * Admin Dashboard Page
 * Main admin overview with key metrics
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
  totalAUM: number;
  pendingWithdrawals: number;
  pendingDocuments: number;
  recentActivity: number;
}

interface Investment {
  amount: number;
  current_value: number | null;
}

interface AdminAction {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  color: string;
  badge?: number;
}

function AdminDashboardContent() {
  const [stats, setStats] = useState<AdminStats>({
    totalInvestors: 0,
    activeInvestors: 0,
    pendingVerifications: 0,
    totalAUM: 0,
    pendingWithdrawals: 0,
    pendingDocuments: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminStats();
  }, []);

  const loadAdminStats = async () => {
    try {
      const [investors, investments, withdrawals, documents, profiles] = await Promise.all([
        supabase.from("profiles").select("id").eq("role", "investor"),
        supabase.from("investments").select("amount, current_value").eq("status", "active"),
        supabase.from("withdrawal_requests").select("id").eq("status", "pending"),
        supabase.from("documents").select("id").eq("status", "pending"),
        supabase.from("profiles").select("id").eq("kyc_status", "pending"),
      ]);

      const investmentData = (investments.data || []) as Investment[];
      const totalAUM =
        investmentData.reduce((sum: number, inv) => sum + (inv.current_value || 0), 0) || 0;
      const activeInvestors = investmentData.length || 0;

      setStats({
        totalInvestors: investors.data?.length || 0,
        activeInvestors,
        pendingVerifications: profiles.data?.length || 0,
        totalAUM,
        pendingWithdrawals: withdrawals.data?.length || 0,
        pendingDocuments: documents.data?.length || 0,
        recentActivity: 0,
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
      color: "bg-blue-500",
    },
    {
      title: "Transactions",
      description: "View all transactions",
      href: "/admin/transactions",
      icon: Activity,
      color: "bg-green-500",
    },
    {
      title: "Withdrawals",
      description: "Approve withdrawal requests",
      href: "/admin/withdrawals",
      icon: DollarSign,
      color: "bg-amber-500",
      badge: stats.pendingWithdrawals > 0 ? stats.pendingWithdrawals : undefined,
    },
    {
      title: "Documents",
      description: "Review pending documents",
      href: "/admin/documents",
      icon: FileText,
      color: "bg-purple-500",
      badge: stats.pendingDocuments > 0 ? stats.pendingDocuments : undefined,
    },
    {
      title: "Compliance",
      description: "KYC/AML oversight",
      href: "/admin/compliance",
      icon: Shield,
      color: "bg-red-500",
      badge: stats.pendingVerifications > 0 ? stats.pendingVerifications : undefined,
    },
    {
      title: "Reports",
      description: "Generate admin reports",
      href: "/admin/reports",
      icon: TrendingUp,
      color: "bg-indigo-500",
    },
    {
      title: "Settings",
      description: "Platform configuration",
      href: "/admin/settings",
      icon: Settings,
      color: "bg-gray-500",
    },
    {
      title: "Audit Logs",
      description: "View system audit logs",
      href: "/admin/audit-logs",
      icon: AlertCircle,
      color: "bg-cyan-500",
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Platform overview and management tools</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvestors}</div>
            <p className="text-xs text-muted-foreground">{stats.activeInvestors} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalAUM / 1000000).toFixed(2)}M</div>
            <p className="text-xs text-muted-foreground">Assets under management</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingWithdrawals + stats.pendingDocuments + stats.pendingVerifications}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {adminActions.map((action) => (
            <Link key={action.href} to={action.href}>
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`rounded-lg ${action.color} p-3`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    {action.badge && <Badge variant="destructive">{action.badge}</Badge>}
                  </div>
                  <h3 className="font-semibold mb-1">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
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
