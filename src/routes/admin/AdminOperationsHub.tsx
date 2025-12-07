import { useState, useEffect, useRef, useCallback } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { OperationsStats } from "@/components/admin/operations/OperationsStats";
import { QuickLinksGrid, QuickLink } from "@/components/admin/operations/QuickLinksGrid";
import { RecentActivityFeed, ActivityItem } from "@/components/admin/operations/RecentActivityFeed";
import { SystemStatus } from "@/components/admin/operations/SystemStatus";
import { PendingItemsBreakdown } from "@/components/admin/operations/PendingItemsBreakdown";
import {
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  Calendar,
  BarChart3,
  Settings,
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  ArrowDownToLine,
  HelpCircle,
  FileCheck,
  Database,
  TestTube,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { operationsService, type PendingBreakdown } from "@/services/operationsService";
import { getSystemHealth, type SystemHealth } from "@/services/systemHealthService";

function AdminOperationsHubContent() {
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [metrics, setMetrics] = useState({
    pendingApprovals: 0,
    todaysTransactions: 0,
    activeInvestors: 0,
    totalAUM: 0,
    transactionTrend: "0%",
  });
  const [pendingBreakdown, setPendingBreakdown] = useState<PendingBreakdown>({
    deposits: 0,
    withdrawals: 0,
    investments: 0,
  });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemHealth[]>([]);

  // Ref for debounce timer to prevent cascading real-time updates
  const metricsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced metrics loader to prevent cascading queries from real-time updates
  const debouncedLoadMetrics = useCallback(() => {
    if (metricsTimerRef.current) {
      clearTimeout(metricsTimerRef.current);
    }
    metricsTimerRef.current = setTimeout(() => {
      loadMetrics();
    }, 1000); // 1 second debounce
  }, []);

  useEffect(() => {
    loadRecentActivities();
    loadMetrics();
    loadSystemHealth();

    // Set up real-time subscriptions for automatic updates (debounced)
    const channel = supabase
      .channel("operations-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "withdrawal_requests",
        },
        () => {
          debouncedLoadMetrics();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deposits",
        },
        () => {
          debouncedLoadMetrics();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investments",
        },
        () => {
          debouncedLoadMetrics();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions_v2",
        },
        () => {
          debouncedLoadMetrics();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investors",
        },
        () => {
          debouncedLoadMetrics();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investor_positions",
        },
        () => {
          debouncedLoadMetrics();
        }
      )
      .subscribe();

    // Cleanup subscription and timer on unmount
    return () => {
      if (metricsTimerRef.current) {
        clearTimeout(metricsTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [debouncedLoadMetrics]);

  const loadMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const [metricsData, yesterdayCount] = await Promise.all([
        operationsService.getMetrics(),
        operationsService.getYesterdayTransactions(),
      ]);

      const trend = operationsService.calculateTrend(
        metricsData.todaysTransactions,
        yesterdayCount
      );

      setMetrics({
        pendingApprovals: metricsData.pendingApprovals,
        todaysTransactions: metricsData.todaysTransactions,
        activeInvestors: metricsData.activeInvestors,
        totalAUM: metricsData.totalAUM,
        transactionTrend: trend,
      });

      setPendingBreakdown(operationsService.getPendingBreakdown(metricsData));
    } catch (error) {
      console.error("Error loading metrics:", error);
      toast.error("Failed to load operations metrics");
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const health = await getSystemHealth();
      setSystemStatus(health);
    } catch (error) {
      console.error("Failed to load system health:", error);
    }
  };

  const loadRecentActivities = async () => {
    try {
      // Fetch recent audit log entries
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const activities: ActivityItem[] = (data || []).map((log) => ({
        id: log.id,
        type: log.action,
        title: `${log.action} on ${log.entity}`,
        description: log.entity_id || "System operation",
        timestamp: new Date(log.created_at),
        status: "success" as const,
        icon: getActivityIcon(log.action),
        user: log.actor_user || undefined,
      }));

      setRecentActivities(activities);
    } catch (error: any) {
      console.error("Error loading activities:", error);
      toast.error("Failed to load recent activities");
    }
  };

  const getActivityIcon = (action: string) => {
    if (action.includes("create") || action.includes("insert")) return Upload;
    if (action.includes("update")) return FileCheck;
    if (action.includes("delete")) return AlertCircle;
    if (action.includes("approve")) return CheckCircle;
    return Database;
  };

  const stats = [
    {
      title: "Pending Approvals",
      value: isLoadingMetrics ? "..." : metrics.pendingApprovals.toString(),
      description: "Investments, withdrawals, deposits",
      icon: Clock,
      status: metrics.pendingApprovals > 0 ? ("warning" as const) : ("info" as const),
    },
    {
      title: "Today's Transactions",
      value: isLoadingMetrics ? "..." : metrics.todaysTransactions.toString(),
      description: `${metrics.transactionTrend} from yesterday`,
      icon: TrendingUp,
      status: "success" as const,
      trend: isLoadingMetrics ? undefined : metrics.transactionTrend,
    },
    {
      title: "Active Investors",
      value: isLoadingMetrics ? "..." : metrics.activeInvestors.toString(),
      description: "Currently active accounts",
      icon: Users,
      status: "info" as const,
    },
    {
      title: "Total AUM",
      value: isLoadingMetrics ? "..." : `${(metrics.totalAUM / 1_000_000).toFixed(1)}M`,
      description: "Aggregate across all assets",
      icon: TrendingUp,
      status: "success" as const,
    },
  ];

  const quickLinks: QuickLink[] = [
    // Data Entry & Management
    {
      title: "Investment Management",
      description: "Create, approve, and track investments",
      href: "/admin/investments",
      icon: TrendingUp,
      category: "Investment Operations",
      badge: { text: "New", variant: "default" },
    },
    {
      title: "Monthly Data Entry",
      description: "Enter monthly NAV and AUM data",
      href: "/admin/monthly-data-entry",
      icon: Calendar,
      category: "Data Entry & Management",
    },
    {
      title: "Daily Rates",
      description: "Manage daily yield rates",
      href: "/admin/daily-rates",
      icon: BarChart3,
      category: "Data Entry & Management",
    },
    {
      title: "Balance Adjustments",
      description: "Adjust investor balances",
      href: "/admin/balances/adjust",
      icon: Settings,
      category: "Data Entry & Management",
    },
    {
      title: "Fund Management",
      description: "Configure funds and fee structures",
      href: "/admin/funds",
      icon: Building2,
      category: "Data Entry & Management",
    },

    // Request Management
    {
      title: "Withdrawal Requests",
      description: "Review and process withdrawals",
      href: "/admin/withdrawals",
      icon: ArrowDownToLine,
      category: "Request Management",
      badge:
        isLoadingMetrics || metrics.pendingApprovals === 0
          ? undefined
          : {
              text: `${metrics.pendingApprovals} pending`,
              variant: "secondary" as const,
            },
    },
    {
      title: "Support Queue",
      description: "Manage support tickets",
      href: "/admin/support",
      icon: HelpCircle,
      category: "Request Management",
    },

    // Reports & Analytics
    {
      title: "Investor Reports",
      description: "Generate and manage investor reports",
      href: "/admin/investor-reports",
      icon: FileCheck,
      category: "Reports & Analytics",
    },
    {
      title: "Batch Reports",
      description: "Generate multiple reports at once",
      href: "/admin/batch-reports",
      icon: FileSpreadsheet,
      category: "Reports & Analytics",
    },
    {
      title: "Statements Management",
      description: "Upload and manage statements",
      href: "/admin/statements",
      icon: FileText,
      category: "Reports & Analytics",
    },

    // Advanced Operations
    {
      title: "All Transactions",
      description: "View all system transactions",
      href: "/admin/transactions-all",
      icon: DollarSign,
      category: "Advanced Operations",
    },
    {
      title: "Excel Import",
      description: "First-run data import",
      href: "/admin/excel-first-run",
      icon: Upload,
      category: "Advanced Operations",
    },
    {
      title: "Test Utilities",
      description: "Testing and debugging tools",
      href: "/admin/test-yield",
      icon: TestTube,
      category: "Advanced Operations",
    },
  ];

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Operations Hub</h1>
        <p className="text-muted-foreground mt-1">
          Central command for all administrative operations
        </p>
      </div>

      {/* Stats Overview */}
      <OperationsStats stats={stats} />

      {/* Pending Items Breakdown */}
      <PendingItemsBreakdown breakdown={pendingBreakdown} isLoading={isLoadingMetrics} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Links - Takes up 2 columns */}
        <div className="lg:col-span-2">
          <QuickLinksGrid links={quickLinks} />
        </div>

        {/* Sidebar - Takes up 1 column */}
        <div className="space-y-6">
          {/* System Status */}
          <SystemStatus systems={systemStatus} />

          {/* Recent Activity */}
          <RecentActivityFeed activities={recentActivities} maxHeight="500px" />
        </div>
      </div>
    </div>
  );
}

export default function AdminOperationsHub() {
  return (
    <AdminGuard>
      <AdminOperationsHubContent />
    </AdminGuard>
  );
}
