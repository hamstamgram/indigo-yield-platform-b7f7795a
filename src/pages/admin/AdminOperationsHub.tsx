import { 
  AdminGuard, 
  OperationsStats, 
  QuickLinksGrid, 
  SystemStatus, 
  PendingItemsBreakdown 
} from "@/components/admin";
import { ActivityFeed, type ControlledActivityItem } from "@/components/common";
import type { QuickLink } from "@/components/admin/operations/QuickLinksGrid";
import {
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  Calendar,
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowDownToLine,
  FileCheck,
  Database,
  Mail,
} from "lucide-react";
import { 
  useRecentAuditLogs, 
  useOperationsRealtime, 
  useOperationsMetrics,
  useOperationsSystemHealth,
  type AuditLogEntry 
} from "@/hooks/data";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";

function AdminOperationsHubContent() {
  const queryClient = useQueryClient();
  
  // Use React Query hooks for metrics and system health
  const { data: metricsData, isLoading: isLoadingMetrics } = useOperationsMetrics();
  const { data: systemStatus = [] } = useOperationsSystemHealth();
  const { data: auditLogs, refetch: refetchAuditLogs } = useRecentAuditLogs(10);

  // Use realtime hook for automatic updates
  useOperationsRealtime(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.operationsMetrics() });
    refetchAuditLogs();
  });

  // Transform audit logs to activity items
  const recentActivities: ControlledActivityItem[] = (auditLogs || []).map((log: AuditLogEntry) => ({
    id: log.id,
    type: log.action,
    title: `${log.action} on ${log.entity}`,
    description: log.entity_id || "System operation",
    timestamp: new Date(log.created_at),
    status: "success" as const,
    icon: getActivityIcon(log.action),
    user: log.actor_user || undefined,
  }));

  const stats = [
    {
      title: "Pending Approvals",
      value: isLoadingMetrics ? "..." : (metricsData?.pendingApprovals ?? 0).toString(),
      description: "Investments, withdrawals, deposits",
      icon: Clock,
      status: (metricsData?.pendingApprovals ?? 0) > 0 ? ("warning" as const) : ("info" as const),
    },
    {
      title: "Today's Transactions",
      value: isLoadingMetrics ? "..." : (metricsData?.todaysTransactions ?? 0).toString(),
      description: `${metricsData?.transactionTrend ?? "0%"} from yesterday`,
      icon: TrendingUp,
      status: "success" as const,
      trend: isLoadingMetrics ? undefined : metricsData?.transactionTrend,
    },
    {
      title: "Active Investors",
      value: isLoadingMetrics ? "..." : (metricsData?.activeInvestors ?? 0).toString(),
      description: "Currently active accounts",
      icon: Users,
      status: "info" as const,
    },
    {
      title: "Total AUM",
      value: isLoadingMetrics ? "..." : `${((metricsData?.totalAUM ?? 0) / 1_000_000).toFixed(1)}M`,
      description: "Aggregate across all assets",
      icon: TrendingUp,
      status: "success" as const,
    },
  ];

  const quickLinks: QuickLink[] = [
    // Data Entry & Management
    {
      title: "Monthly Data Entry",
      description: "Enter monthly NAV and AUM data",
      href: "/admin/monthly-data-entry",
      icon: Calendar,
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
        isLoadingMetrics || (metricsData?.pendingApprovals ?? 0) === 0
          ? undefined
          : {
              text: `${metricsData?.pendingApprovals} pending`,
              variant: "secondary" as const,
            },
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
      title: "Report Delivery Center",
      description: "Track and send statement deliveries",
      href: "/admin/reports/delivery",
      icon: Mail,
      category: "Reports & Analytics",
    },
    {
      title: "Email Tracking",
      description: "Track sent emails and delivery status",
      href: "/admin/email-tracking",
      icon: FileText,
      category: "Reports & Analytics",
    },
    {
      title: "Statements Management",
      description: "Upload and manage statements",
      href: "/admin/statements",
      icon: FileText,
      category: "Reports & Analytics",
    },

    // System
    {
      title: "All Transactions",
      description: "View all system transactions",
      href: "/admin/transactions",
      icon: DollarSign,
      category: "System",
    },
    {
      title: "Audit Logs",
      description: "View system audit trail",
      href: "/admin/audit-logs",
      icon: Database,
      category: "System",
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
      <PendingItemsBreakdown 
        breakdown={metricsData?.pendingBreakdown ?? { deposits: 0, withdrawals: 0, investments: 0 }} 
        isLoading={isLoadingMetrics} 
      />

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
          <ActivityFeed 
            activities={recentActivities} 
            title="Operations Activity"
            description="Latest operations and system events"
            maxHeight="500px" 
          />
        </div>
      </div>
    </div>
  );
}

function getActivityIcon(action: string) {
  if (action.includes("create") || action.includes("insert")) return Upload;
  if (action.includes("update")) return FileCheck;
  if (action.includes("delete")) return AlertCircle;
  if (action.includes("approve")) return CheckCircle;
  return Database;
}

export default function AdminOperationsHub() {
  return (
    <AdminGuard>
      <AdminOperationsHubContent />
    </AdminGuard>
  );
}
