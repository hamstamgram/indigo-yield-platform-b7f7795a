import {
  BarChart3,
  FileText,
  CreditCard,
  ArrowLeftRight,
  Users,
  User,
  Calendar,
  Gauge,
  FileSpreadsheet,
  Activity,
  TrendingUp,
  Settings,
  Shield,
  Briefcase,
  DollarSign,
} from "lucide-react";
import { NavItem } from "@/types/navigation";

export type NavGroup = {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

// ============================================
// INVESTOR NAVIGATION - Simple flat nav
// ============================================
export const investorNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: <BarChart3 className="h-5 w-5" /> },
  { title: "Statements", href: "/statements", icon: <FileText className="h-5 w-5" /> },
  {
    title: "Portfolio Performance",
    href: "/portfolio/analytics",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  { title: "Transaction History", href: "/transactions", icon: <CreditCard className="h-5 w-5" /> },
  {
    title: "Withdrawal Requests",
    href: "/withdrawals",
    icon: <ArrowLeftRight className="h-5 w-5" />,
  },
  { title: "Account", href: "/account", icon: <User className="h-5 w-5" /> },
];

// ============================================
// IB (Introducing Broker) NAVIGATION
// ============================================
export const ibNav: NavItem[] = [
  { title: "IB Dashboard", href: "/ib/dashboard", icon: <BarChart3 className="h-5 w-5" /> },
];

// ============================================
// ADMIN NAVIGATION - Organized by workflow groups
// ============================================
export const adminNavGroups: NavGroup[] = [
  {
    title: "Command",
    icon: Gauge,
    items: [
      {
        title: "Command Center",
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
        title: "Investors",
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
        title: "Withdrawal Requests",
        href: "/admin/withdrawals",
        icon: <ArrowLeftRight className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
  {
    title: "Yield & Reporting",
    icon: TrendingUp,
    items: [
      {
        title: "Yield Operations",
        href: "/admin/yield",
        icon: <TrendingUp className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Recorded Yields",
        href: "/admin/recorded-yields",
        icon: <Calendar className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Reports",
        href: "/admin/investor-reports",
        icon: <FileSpreadsheet className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
  {
    title: "Partners",
    icon: Briefcase,
    items: [
      {
        title: "IB Management",
        href: "/admin/ib-management",
        icon: <Users className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
  {
    title: "Finance",
    icon: DollarSign,
    items: [
      {
        title: "INDIGO Fees",
        href: "/admin/fees",
        icon: <CreditCard className="h-5 w-5" />,
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
        title: "Settings",
        href: "/admin/settings-platform",
        icon: <Settings className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Admin Management",
        href: "/admin/settings/admins",
        icon: <Shield className="h-5 w-5" />,
        adminOnly: true,
        superAdminOnly: true,
      },
    ],
  },
];

// Flat admin navigation for backward compatibility
export const adminNav: NavItem[] = adminNavGroups.flatMap((group) => group.items);

// Legacy exports for backward compatibility
export const activityNav: NavItem[] = [
  { title: "Statements", href: "/statements", icon: <FileText className="h-5 w-5" /> },
  {
    title: "Portfolio Performance",
    href: "/portfolio/analytics",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  { title: "Transaction History", href: "/transactions", icon: <CreditCard className="h-5 w-5" /> },
  {
    title: "Withdrawal Requests",
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
