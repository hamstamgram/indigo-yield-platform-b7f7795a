import {
  BarChart3,
  FileText,
  CreditCard,
  Settings,
  Users,
  Shield,
  Database,
  ArrowUpFromLine,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

export function useNavItems(): NavItem[] {
  const { isAdmin } = useAuth();

  const investorItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: BarChart3,
      description: "Portfolio overview and performance",
    },
    {
      title: "Statements",
      href: "/statements",
      icon: FileText,
      description: "Monthly and quarterly statements",
    },
    {
      title: "Transaction History",
      href: "/transactions",
      icon: CreditCard,
      description: "Transaction history and details",
    },
    {
      title: "Withdrawals Request",
      href: "/withdrawals",
      icon: ArrowUpFromLine, // Reusing ArrowUpFromLine for withdrawals
      description: "Request and manage withdrawals",
    },
    {
      title: "Account",
      href: "/account",
      icon: Settings,
      description: "Your account settings",
    },
  ];

  const adminItems: NavItem[] = [
    {
      title: "Admin Dashboard",
      href: "/admin",
      icon: Shield,
      description: "Platform overview and metrics",
    },
    {
      title: "All Investors",
      href: "/admin/investors",
      icon: Users,
      description: "Investor management and yield tracking",
    },
    {
      title: "Transactions",
      href: "/admin/transactions",
      icon: CreditCard,
      description: "View all transactions",
    },
    {
      title: "Withdrawals",
      href: "/admin/withdrawals",
      icon: ArrowUpFromLine,
      description: "Withdrawal request management",
    },
    {
      title: "Investor Reports",
      href: "/admin/investor-reports",
      icon: FileText,
      description: "Generate and send reports",
    },
    {
      title: "Fund Data Entry",
      href: "/admin/yield",
      icon: Database,
      description: "Yield distribution and fund data",
    },
    {
      title: "System",
      href: "/admin/audit-logs",
      icon: Database,
      description: "Audit logs and system health",
    },
  ];

  return isAdmin ? [...investorItems, ...adminItems] : investorItems;
}
