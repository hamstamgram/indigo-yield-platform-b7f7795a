import {
  BarChart3,
  FileText,
  CreditCard,
  ArrowLeftRight,
  HelpCircle,
  Bell,
  Users,
  TrendingUp,
  MessageSquare,
  FileCheck,
  Settings,
  User,
  Shield,
  Briefcase,
  Database,
  Clock,
  History,
  Link,
  CheckSquare,
  AlertCircle,
  Upload,
  Folder,
  LayoutDashboard,
  Calendar,
  Settings2,
  UserPlus,
  Scale,
  ArrowDownCircle,
  Mail,
  UserCog,
  Lock,
  Building2,
  Gauge,
  FileSpreadsheet,
  Calculator,
  Activity,
  Target,
  PieChart,
  Cog,
} from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { NavItem } from "@/types/navigation";

export type NavGroup = {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

// LP Main navigation menu
export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: <BarChart3 className="h-5 w-5" /> },
  { title: "Statements", href: "/statements", icon: <FileText className="h-5 w-5" /> },
  { title: "Transactions", href: "/transactions", icon: <CreditCard className="h-5 w-5" /> },
  { title: "Withdrawals", href: "/withdrawals", icon: <ArrowLeftRight className="h-5 w-5" /> },
  { title: "Documents", href: "/documents", icon: <FileText className="h-5 w-5" /> },
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
  { title: "Sessions", href: "/settings/sessions", icon: <Clock className="h-5 w-5" /> },
];

// Profile navigation menu - NEW
export const profileNav: NavItem[] = [
  { title: "Overview", href: "/profile", icon: <User className="h-5 w-5" /> },
  { title: "Personal Info", href: "/profile/personal-info", icon: <UserCog className="h-5 w-5" /> },
  { title: "Security", href: "/profile/security", icon: <Lock className="h-5 w-5" /> },
  { title: "Preferences", href: "/profile/preferences", icon: <Settings className="h-5 w-5" /> },
  { title: "Privacy", href: "/profile/privacy", icon: <Shield className="h-5 w-5" /> },
  {
    title: "Linked Accounts",
    href: "/profile/linked-accounts",
    icon: <Link className="h-5 w-5" />,
  },
  {
    title: "KYC Verification",
    href: "/profile/kyc-verification",
    icon: <CheckSquare className="h-5 w-5" />,
  },
];

// Reports navigation menu - NEW
export const reportsNav: NavItem[] = [
  { title: "Dashboard", href: "/reports", icon: <LayoutDashboard className="h-5 w-5" /> },
  {
    title: "Portfolio Performance",
    href: "/reports/portfolio-performance",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    title: "Monthly Statement",
    href: "/reports/monthly-statement",
    icon: <Calendar className="h-5 w-5" />,
  },
  { title: "Custom Report", href: "/reports/custom", icon: <Settings2 className="h-5 w-5" /> },
  { title: "History", href: "/reports/history", icon: <History className="h-5 w-5" /> },
];

// Documents sub-navigation - NEW
export const documentsNav: NavItem[] = [
  { title: "All Documents", href: "/documents", icon: <Folder className="h-5 w-5" /> },
  { title: "Upload", href: "/documents/upload", icon: <Upload className="h-5 w-5" /> },
];

// Notifications sub-navigation - NEW
export const notificationsNav: NavItem[] = [
  { title: "All Notifications", href: "/notifications", icon: <Bell className="h-5 w-5" /> },
  { title: "Settings", href: "/notifications/settings", icon: <Settings className="h-5 w-5" /> },
  {
    title: "Price Alerts",
    href: "/notifications/alerts",
    icon: <AlertCircle className="h-5 w-5" />,
  },
  { title: "History", href: "/notifications/history", icon: <History className="h-5 w-5" /> },
];

// Support sub-navigation - NEW
export const supportNav: NavItem[] = [
  { title: "Support Hub", href: "/support", icon: <HelpCircle className="h-5 w-5" /> },
  { title: "My Tickets", href: "/support/tickets", icon: <FileCheck className="h-5 w-5" /> },
  {
    title: "New Ticket",
    href: "/support/tickets/new",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  { title: "Live Chat", href: "/support/live-chat", icon: <MessageSquare className="h-5 w-5" /> },
];

// Withdrawals sub-navigation - NEW
export const withdrawalsNav: NavItem[] = [
  {
    title: "New Withdrawal",
    href: "/withdrawals/new",
    icon: <ArrowDownCircle className="h-5 w-5" />,
  },
  {
    title: "Withdrawal History",
    href: "/withdrawals/history",
    icon: <History className="h-5 w-5" />,
  },
];

// Footer navigation for marketing/legal pages - NEW
export const footerNav: NavItem[] = [
  { title: "About Us", href: "/about", icon: <Building2 className="h-5 w-5" /> },
  { title: "Investment Strategies", href: "/strategies", icon: <TrendingUp className="h-5 w-5" /> },
  { title: "FAQ", href: "/faq", icon: <HelpCircle className="h-5 w-5" /> },
  { title: "Contact", href: "/contact", icon: <Mail className="h-5 w-5" /> },
  { title: "Terms of Service", href: "/terms", icon: <FileText className="h-5 w-5" /> },
  { title: "Privacy Policy", href: "/privacy", icon: <Shield className="h-5 w-5" /> },
];

// Admin navigation groups for better organization
export const adminNavGroups: NavGroup[] = [
  {
    title: "Overview",
    icon: BarChart3,
    items: [
      {
        title: "Dashboard",
        href: "/admin",
        icon: <BarChart3 className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Reports & Analytics",
        href: "/admin/reports",
        icon: <TrendingUp className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Audit Logs",
        href: "/admin/audit",
        icon: <Database className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
  {
    title: "User Management",
    icon: Users,
    items: [
      {
        title: "Investors",
        href: "/admin/investors",
        icon: <Users className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "User Requests",
        href: "/admin/requests",
        icon: <FileCheck className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
  {
    title: "Fund Management",
    icon: Briefcase,
    items: [
      {
        title: "Fund Management",
        href: "/admin/funds",
        icon: <Briefcase className="h-5 w-5" />,
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
    title: "Content & Support",
    icon: MessageSquare,
    items: [
      {
        title: "Support Queue",
        href: "/admin/support",
        icon: <MessageSquare className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Documents",
        href: "/admin/documents",
        icon: <FileText className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
  {
    title: "Advanced Tools",
    icon: Settings2,
    items: [
      {
        title: "Monthly Data Entry",
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
        title: "Investor Reports",
        href: "/admin/investor-reports",
        icon: <FileSpreadsheet className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Balance Adjustments",
        href: "/admin/balances/adjust",
        icon: <Calculator className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Investor Status",
        href: "/admin/investors/status",
        icon: <Activity className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "New Investor",
        href: "/admin/investors/new",
        icon: <UserPlus className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Deposits Queue",
        href: "/admin/investors/deposits",
        icon: <ArrowDownCircle className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Batch Reports",
        href: "/admin/reports/batch",
        icon: <FileSpreadsheet className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Historical Reports",
        href: "/admin/reports/historical",
        icon: <History className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
  {
    title: "System & Operations",
    icon: Cog,
    items: [
      {
        title: "Operations",
        href: "/admin/operations",
        icon: <Building2 className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Expert Investors",
        href: "/admin/expert-investors",
        icon: <Target className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Portfolio Management",
        href: "/admin/portfolio",
        icon: <PieChart className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Compliance",
        href: "/admin/compliance",
        icon: <Scale className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "User Management",
        href: "/admin/users",
        icon: <UserPlus className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Admin Invite",
        href: "/admin-invite",
        icon: <Mail className="h-5 w-5" />,
        adminOnly: true,
      },
      {
        title: "Admin Tools",
        href: "/admin-tools",
        icon: <Settings className="h-5 w-5" />,
        adminOnly: true,
      },
    ],
  },
];

// Flat admin navigation for backward compatibility
export const adminNav: NavItem[] = adminNavGroups.flatMap((group) => group.items);

// Account navigation menu
export const accountNav: NavItem[] = [
  { title: "Account", href: "/account", icon: <User className="h-5 w-5" /> },
  { title: "Settings", href: "/settings", icon: <Settings className="h-5 w-5" /> },
];
