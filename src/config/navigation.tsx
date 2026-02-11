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
  Briefcase,
  DollarSign,
  FolderOpen,
  Wallet,
  Coins,
  HeartPulse,
  Layers,
} from "lucide-react";
import { NavItem } from "@/types/navigation";

export type NavGroup = {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

// ============================================
// INVESTOR NAVIGATION - New Information Architecture
// ============================================
export const investorNav: NavItem[] = [
  { title: "Overview", href: "/investor", icon: <BarChart3 className="h-5 w-5" /> },
  { title: "Portfolio", href: "/investor/portfolio", icon: <Wallet className="h-5 w-5" /> },
  { title: "Performance", href: "/investor/performance", icon: <TrendingUp className="h-5 w-5" /> },
  { title: "Yield History", href: "/investor/yield-history", icon: <Coins className="h-5 w-5" /> },
  {
    title: "Transactions",
    href: "/investor/transactions",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: "Withdrawals",
    href: "/withdrawals",
    icon: <ArrowLeftRight className="h-5 w-5" />,
  },
  { title: "Statements", href: "/investor/statements", icon: <FileText className="h-5 w-5" /> },
  { title: "Documents", href: "/investor/documents", icon: <FolderOpen className="h-5 w-5" /> },
  { title: "Settings", href: "/investor/settings", icon: <Settings className="h-5 w-5" /> },
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
      {
        title: "Fee Revenue",
        href: "/admin/fees",
        icon: <DollarSign className="h-5 w-5" />,
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
      {
        title: "IB Management",
        href: "/admin/ib-management",
        icon: <Briefcase className="h-5 w-5" />,
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
        title: "Yield Distributions",
        href: "/admin/yield-distributions",
        icon: <Layers className="h-5 w-5" />,
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
      {
        title: "Fund Management",
        href: "/admin/funds",
        icon: <Briefcase className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
  {
    title: "System",
    icon: Settings,
    items: [
      {
        title: "Operations",
        href: "/admin/operations",
        icon: <HeartPulse className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Audit Trail",
        href: "/admin/audit-logs",
        icon: <FileText className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Settings",
        href: "/admin/settings",
        icon: <Settings className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
];

// Flat admin navigation for backward compatibility
export const adminNav: NavItem[] = adminNavGroups.flatMap((group) => group.items);

// Legacy exports for backward compatibility (redirects to new routes)
export const activityNav: NavItem[] = [
  { title: "Statements", href: "/investor/statements", icon: <FileText className="h-5 w-5" /> },
  {
    title: "Portfolio Performance",
    href: "/investor/performance",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    title: "Transaction History",
    href: "/investor/transactions",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: "Withdrawal Requests",
    href: "/withdrawals",
    icon: <ArrowLeftRight className="h-5 w-5" />,
  },
];

export const profileAndSettingsNav: NavItem[] = [
  { title: "Settings", href: "/investor/settings", icon: <Settings className="h-5 w-5" /> },
];

export const mainNav: NavItem[] = [
  { title: "Overview", href: "/investor", icon: <BarChart3 className="h-5 w-5" /> },
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
