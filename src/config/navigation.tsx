
import { 
  BarChart3, 
  FileText, 
  CreditCard, 
  ArrowLeftRight, 
  HelpCircle, 
  Bell, 
  Bitcoin,
  Users,
  DollarSign,
  TrendingUp,
  MessageSquare,
  FileCheck,
  Settings,
  User,
  Shield,
  Building2,
  PieChart,
  Database,
  UserCheck,
  Briefcase,
  Activity,
  Search,
  ClipboardList,
  BookOpen,
  UserCog,
  AlertTriangle,
  Clock,
  Lock,
  Smartphone,
  Cog,
  Globe,
  FileSpreadsheet,
  Target
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
        adminOnly: true
      },
      {
        title: "Reports & Analytics",
        href: "/admin/reports",
        icon: <TrendingUp className="h-5 w-5" />,
        adminOnly: true
      },
      {
        title: "Audit Logs",
        href: "/admin/audit",
        icon: <Database className="h-5 w-5" />,
        adminOnly: true
      }
    ]
  },
  {
    title: "User Management",
    icon: Users,
    items: [
      {
        title: "Investors",
        href: "/admin/investors",
        icon: <Users className="h-5 w-5" />,
        adminOnly: true
      },
      {
        title: "User Requests",
        href: "/admin/requests",
        icon: <FileCheck className="h-5 w-5" />,
        adminOnly: true
      }
    ]
  },
  {
    title: "Fund Management",
    icon: Briefcase,
    items: [
      {
        title: "Fund Management",
        href: "/admin/funds",
        icon: <Briefcase className="h-5 w-5" />,
        adminOnly: true
      },
      {
        title: "Withdrawals",
        href: "/admin/withdrawals",
        icon: <ArrowLeftRight className="h-5 w-5" />,
        adminOnly: true
      }
    ]
  },
  {
    title: "Content & Support",
    icon: MessageSquare,
    items: [
      {
        title: "Support Queue",
        href: "/admin/support-queue", 
        icon: <MessageSquare className="h-5 w-5" />,
        adminOnly: true
      },
      {
        title: "Documents",
        href: "/admin/documents",
        icon: <FileText className="h-5 w-5" />,
        adminOnly: true
      }
    ]
  },
];

// Flat admin navigation for backward compatibility
export const adminNav: NavItem[] = adminNavGroups.flatMap(group => group.items);

// Account navigation menu
export const accountNav: NavItem[] = [
  { title: "Account", href: "/account", icon: <User className="h-5 w-5" /> },
  { title: "Settings", href: "/settings", icon: <Settings className="h-5 w-5" /> },
];
