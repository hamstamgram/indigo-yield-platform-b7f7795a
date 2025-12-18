import {
  BarChart3,
  FileText,
  CreditCard,
  ArrowLeftRight,
  Users,
  User,
  Calendar,
  Mail,
  Gauge,
  FileSpreadsheet,
  Activity,
  TrendingUp,
  Settings,
  Shield,
} from "lucide-react";
import { NavItem } from "@/types/navigation";

export type NavGroup = {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

// Investor Platform Navigation (Redesigned)

export const activityNav: NavItem[] = [
  { title: "Statements", href: "/statements", icon: <FileText className="h-5 w-5" /> },
  {
    title: "Portfolio Performance",
    href: "/portfolio/analytics",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  { title: "Transaction History", href: "/transactions", icon: <CreditCard className="h-5 w-5" /> },
  {
    title: "Withdrawals Request",
    href: "/withdrawals",
    icon: <ArrowLeftRight className="h-5 w-5" />,
  },
];

export const profileAndSettingsNav: NavItem[] = [
  { title: "Account", href: "/account", icon: <User className="h-5 w-5" /> },
];

export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: <BarChart3 className="h-5 w-5" /> },
  {
    title: "Activity",
    href: "/activity",
    icon: <Activity className="h-5 w-5" />,
    subNav: activityNav,
  },
  {
    title: "Profile & Settings",
    href: "/profile",
    icon: <User className="h-5 w-5" />,
    subNav: profileAndSettingsNav,
  },
];

// Admin Platform Navigation (Consolidated to 4 sections)

export const adminNavGroups: NavGroup[] = [
  {
    title: "Dashboard",
    icon: BarChart3,
    items: [
      {
        title: "Overview",
        href: "/admin",
        icon: <BarChart3 className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
  {
    title: "Investors",
    icon: Users,
    items: [
      {
        title: "All Investors",
        href: "/admin/investors",
        icon: <Users className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Transactions",
        href: "/admin/transactions",
        icon: <CreditCard className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Withdrawals",
        href: "/admin/withdrawals",
        icon: <ArrowLeftRight className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
  {
    title: "Reporting",
    icon: FileSpreadsheet,
    items: [
      {
        title: "Investor Reports",
        href: "/admin/investor-reports",
        icon: <FileSpreadsheet className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Fund Data Entry",
        href: "/admin/monthly-data-entry",
        icon: <Calendar className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Daily Rates",
        href: "/admin/daily-rates",
        icon: <Gauge className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Email Logs",
        href: "/admin/email-tracking",
        icon: <Mail className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
  {
    title: "System",
    icon: Settings,
    items: [
      {
        title: "Audit Logs",
        href: "/admin/audit-logs",
        icon: <Shield className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "User Management",
        href: "/admin/users",
        icon: <Users className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "System Health",
        href: "/admin/system-health",
        icon: <Activity className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Settings",
        href: "/admin/settings-platform",
        icon: <Settings className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
];

// Flat admin navigation for backward compatibility
export const adminNav: NavItem[] = adminNavGroups.flatMap((group) => group.items);
