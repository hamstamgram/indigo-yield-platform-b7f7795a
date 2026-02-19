import {
  BarChart3,
  FileText,
  CreditCard,
  ArrowLeftRight,
  Users,
  Gauge,
  FileSpreadsheet,
  TrendingUp,
  Settings,
  Briefcase,
  Wallet,
  Coins,
  HeartPulse,
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
        title: "Ledger",
        href: "/admin/ledger",
        icon: <CreditCard className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
  {
    title: "Reporting",
    icon: TrendingUp,
    items: [
      {
        title: "Yield History",
        href: "/admin/yield-history",
        icon: <TrendingUp className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Reports",
        href: "/admin/reports",
        icon: <FileSpreadsheet className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
  {
    title: "System",
    icon: Settings,
    items: [
      {
        title: "Fund Management",
        href: "/admin/funds",
        icon: <Briefcase className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Revenue",
        href: "/admin/revenue",
        icon: <Coins className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Operations",
        href: "/admin/operations",
        icon: <HeartPulse className="h-5 w-5" />,
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
