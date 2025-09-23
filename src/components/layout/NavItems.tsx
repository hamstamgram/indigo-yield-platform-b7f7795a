import { 
  BarChart3, 
  FileText, 
  CreditCard, 
  Settings, 
  Users, 
  Shield,
  Building2,
  PieChart,
  Database,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';

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
      title: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
      description: 'Portfolio overview and performance'
    },
    {
      title: 'Statements',
      href: '/statements',
      icon: FileText,
      description: 'Monthly and quarterly statements'
    },
    {
      title: 'Transactions',
      href: '/transactions',
      icon: CreditCard,
      description: 'Transaction history and details'
    },
    {
      title: 'Account',
      href: '/account',
      icon: Settings,
      description: 'Profile and account settings'
    }
  ];

  const adminItems: NavItem[] = [
    {
      title: 'Admin Dashboard',
      href: '/admin',
      icon: Shield,
      description: 'Platform overview and metrics'
    },
    {
      title: 'Investors',
      href: '/admin/investors',
      icon: Users,
      description: 'Manage investor accounts'
    },
    {
      title: 'Portfolio Management',
      href: '/admin/portfolio',
      icon: PieChart,
      description: 'Portfolio and asset management'
    },
    {
      title: 'Operations',
      href: '/admin-operations',
      icon: Building2,
      description: 'Platform operations and tools'
    },
    {
      title: 'Analytics',
      href: '/admin/reports',
      icon: TrendingUp,
      description: 'Reports and analytics'
    },
    {
      title: 'System',
      href: '/admin/audit',
      icon: Database,
      description: 'Audit logs and system health'
    }
  ];

  return isAdmin ? [...investorItems, ...adminItems] : investorItems;
}