import { useState, useEffect } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { OperationsStats } from "@/components/admin/operations/OperationsStats";
import { QuickLinksGrid, QuickLink } from "@/components/admin/operations/QuickLinksGrid";
import { RecentActivityFeed, ActivityItem } from "@/components/admin/operations/RecentActivityFeed";
import { SystemStatus, SystemStatusItem } from "@/components/admin/operations/SystemStatus";
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

function AdminOperationsHubContent() {
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    loadRecentActivities();
  }, []);

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
    if (action.includes("create") || action.includes("insert"))
      return Upload;
    if (action.includes("update")) return FileCheck;
    if (action.includes("delete")) return AlertCircle;
    if (action.includes("approve")) return CheckCircle;
    return Database;
  };

  const stats = [
    {
      title: "Pending Approvals",
      value: "12",
      description: "Investments, withdrawals, etc.",
      icon: Clock,
      status: "warning" as const,
    },
    {
      title: "Today's Transactions",
      value: "47",
      description: "+15% from yesterday",
      icon: TrendingUp,
      status: "success" as const,
      trend: "+15%",
    },
    {
      title: "Active Investors",
      value: "234",
      description: "Currently active accounts",
      icon: Users,
      status: "info" as const,
    },
    {
      title: "Total AUM",
      value: "$12.4M",
      description: "Across all funds",
      icon: DollarSign,
      status: "success" as const,
      trend: "+8.2%",
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
      badge: { text: "5 pending", variant: "secondary" },
    },
    {
      title: "Support Queue",
      description: "Manage support tickets",
      href: "/admin/support",
      icon: HelpCircle,
      category: "Request Management",
    },
    {
      title: "Document Requests",
      description: "Handle document uploads and requests",
      href: "/admin/documents",
      icon: FileText,
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

  const systemStatus: SystemStatusItem[] = [
    {
      name: "Database",
      status: "operational",
      uptime: 99.9,
      lastChecked: new Date(),
    },
    {
      name: "Authentication",
      status: "operational",
      uptime: 100,
      lastChecked: new Date(),
    },
    {
      name: "File Storage",
      status: "operational",
      uptime: 99.8,
      lastChecked: new Date(),
    },
    {
      name: "Email Service",
      status: "operational",
      uptime: 98.5,
      lastChecked: new Date(),
      message: "Minor delays possible",
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
