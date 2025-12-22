import {
  BarChart3,
  FileText,
  CreditCard,
  ArrowLeftRight,
  ArrowDownToLine,
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
  FolderOpen,
  PieChart,
  Wallet,
  Coins,
  LayoutDashboard,
  Mail,
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
  { title: "Transactions", href: "/investor/transactions", icon: <CreditCard className="h-5 w-5" /> },
  { title: "Statements", href: "/investor/statements", icon: <FileText className="h-5 w-5" /> },
  { title: "Documents", href: "/investor/documents", icon: <FolderOpen className="h-5 w-5" /> },
  { title: "Settings", href: "/investor/settings", icon: <Settings className="h-5 w-5" /> },
];

// ============================================
// IB (Introducing Broker) NAVIGATION
// ============================================
export const ibNav: NavItem[] = [
  { title: "Overview", href: "/ib", icon: <LayoutDashboard className="h-5 w-5" /> },
  { title: "Referrals", href: "/ib/referrals", icon: <Users className="h-5 w-5" /> },
  { title: "Commissions", href: "/ib/commissions", icon: <Coins className="h-5 w-5" /> },
  { title: "Payout History", href: "/ib/payouts", icon: <Wallet className="h-5 w-5" /> },
  { title: "Settings", href: "/ib/settings", icon: <Settings className="h-5 w-5" /> },
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
        title: "Deposits",
        href: "/admin/deposits",
        icon: <ArrowDownToLine className="h-5 w-5" />,
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
      {
        title: "Report Delivery",
        href: "/admin/reports/delivery",
        icon: <Mail className="h-5 w-5" />,
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
        title: "Fund Management",
        href: "/admin/funds",
        icon: <PieChart className="h-5 w-5" />,
        adminOnly: true,
      },
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

// Legacy exports for backward compatibility (redirects to new routes)
export const activityNav: NavItem[] = [
  { title: "Statements", href: "/investor/statements", icon: <FileText className="h-5 w-5" /> },
  {
    title: "Portfolio Performance",
    href: "/investor/performance",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  { title: "Transaction History", href: "/investor/transactions", icon: <CreditCard className="h-5 w-5" /> },
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
