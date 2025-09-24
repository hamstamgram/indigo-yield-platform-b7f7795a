
import React from "react";
import { 
  Home, 
  Users, 
  Database, 
  Settings, 
  Shield, 
  User, 
  LayoutDashboard,
  Percent,
  TrendingDown,
  FileText,
  CreditCard,
  Bell,
  HelpCircle,
  FolderOpen,
  ArrowUpDown,
  PieChart,
  TrendingUp,
  Upload,
  BarChart3,
  ClipboardList,
  MessageSquare,
  Building2,
  Target
} from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { NavItem } from "@/types/navigation";

// LP Main navigation menu
export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: <Home className="h-5 w-5" /> },
  { title: "Statements", href: "/statements", icon: <FileText className="h-5 w-5" /> },
  { title: "Transactions", href: "/transactions", icon: <CreditCard className="h-5 w-5" /> },
  { title: "Withdrawals", href: "/withdrawals", icon: <TrendingDown className="h-5 w-5" /> },
  { title: "Documents", href: "/documents", icon: <FolderOpen className="h-5 w-5" /> },
  { title: "Support", href: "/support", icon: <HelpCircle className="h-5 w-5" /> },
  { title: "Notifications", href: "/notifications", icon: <Bell className="h-5 w-5" /> },
];

// Asset navigation menu
export const assetNav: NavItem[] = [
  { title: "Bitcoin", href: "/assets/btc", icon: <CryptoIcon symbol="btc" className="h-5 w-5" /> },
  { title: "Ethereum", href: "/assets/eth", icon: <CryptoIcon symbol="eth" className="h-5 w-5" /> },
  { title: "Solana", href: "/assets/sol", icon: <CryptoIcon symbol="sol" className="h-5 w-5" /> },
  { title: "USDC", href: "/assets/usdc", icon: <CryptoIcon symbol="usdc" className="h-5 w-5" /> },
];

// Settings navigation menu
export const settingsNav: NavItem[] = [
  { title: "Profile", href: "/settings/profile", icon: <User className="h-5 w-5" /> },
  { title: "Notifications", href: "/settings/notifications", icon: <Bell className="h-5 w-5" /> },
  { title: "Security", href: "/settings/security", icon: <Shield className="h-5 w-5" /> },
  { title: "Sessions", href: "/settings/sessions", icon: <Settings className="h-5 w-5" /> },
];

// Admin navigation menu
export const adminNav: NavItem[] = [
  { title: "Admin Dashboard", href: "/admin", icon: <LayoutDashboard className="h-5 w-5" />, adminOnly: true },
  { title: "Investors", href: "/admin/investors", icon: <Users className="h-5 w-5" />, adminOnly: true },
  { title: "Withdrawals", href: "/admin/withdrawals", icon: <TrendingDown className="h-5 w-5" />, adminOnly: true },
  { title: "Yield Settings", href: "/admin/yield", icon: <Percent className="h-5 w-5" />, adminOnly: true },
  { title: "Reports", href: "/admin/reports", icon: <BarChart3 className="h-5 w-5" />, adminOnly: true },
  { title: "Historical Reports", href: "/admin/reports/historical", icon: <BarChart3 className="h-5 w-5" />, adminOnly: true },
  { title: "Support Queue", href: "/admin/support", icon: <MessageSquare className="h-5 w-5" />, adminOnly: true },
  { title: "Requests", href: "/admin/requests", icon: <ClipboardList className="h-5 w-5" />, adminOnly: true },
  { title: "Documents", href: "/admin/documents", icon: <FolderOpen className="h-5 w-5" />, adminOnly: true },
  { title: "Portfolio", href: "/admin/portfolio", icon: <PieChart className="h-5 w-5" />, adminOnly: true },
  { title: "Fund Management", href: "/admin/funds", icon: <TrendingUp className="h-5 w-5" />, adminOnly: true },
  { title: "Yield Management", href: "/admin/yield-management", icon: <Target className="h-5 w-5" />, adminOnly: true },
  { title: "Setup AUM", href: "/admin/setup-aum", icon: <Database className="h-5 w-5" />, adminOnly: true },
  { title: "Test Yield", href: "/admin/test-yield", icon: <Target className="h-5 w-5" />, adminOnly: true },
  { title: "Excel Import", href: "/admin/excel-first-run", icon: <Upload className="h-5 w-5" />, adminOnly: true },
  { title: "Audit", href: "/admin/audit", icon: <Shield className="h-5 w-5" />, adminOnly: true },
];

// Legacy admin routes (still accessible but not in main nav)
export const legacyAdminNav: NavItem[] = [
  { title: "Admin Tools", href: "/admin-tools", icon: <Database className="h-5 w-5" />, adminOnly: true },
  { title: "Operations", href: "/admin-operations", icon: <Building2 className="h-5 w-5" />, adminOnly: true },
];

// Account navigation menu
export const accountNav: NavItem[] = [
  { title: "Account", href: "/account", icon: <User className="h-5 w-5" /> },
  { title: "Settings", href: "/settings", icon: <Settings className="h-5 w-5" /> },
];
