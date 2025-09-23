import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Percent,
  BarChart3,
  FileText,
  Settings,
  Banknote
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const navigationCards = [
    {
      title: 'Investor Management',
      description: 'Manage investor accounts, positions, and portfolios',
      icon: Users,
      path: '/admin/investors',
      color: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Fund Management',
      description: 'AUM tracking, yield distribution, and fund operations',
      icon: Banknote,
      path: '/admin/funds',
      color: 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400'
    },
    {
      title: 'Yield Management',
      description: 'Legacy yield distribution and asset management',
      icon: Percent,
      path: '/admin/yield-management',
      color: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400'
    },
    {
      title: 'Performance Analytics',
      description: 'Portfolio performance tracking and reporting',
      icon: BarChart3,
      path: '/admin/analytics',
      color: 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400'
    },
    {
      title: 'Reports & Statements',
      description: 'Generate investor statements and compliance reports',
      icon: FileText,
      path: '/admin/reports',
      color: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'
    },
    {
      title: 'System Settings',
      description: 'Configuration and administrative settings',
      icon: Settings,
      path: '/admin/settings',
      color: 'bg-gray-50 dark:bg-gray-950/20 text-gray-600 dark:text-gray-400'
    }
  ];

  const quickStats = [
    {
      title: 'Total AUM',
      value: '$2.4M',
      change: '+12.5%',
      icon: DollarSign,
      positive: true
    },
    {
      title: 'Active Investors',
      value: '127',
      change: '+3',
      icon: Users,
      positive: true
    },
    {
      title: 'Portfolio Performance',
      value: '+8.2%',
      change: 'YTD',
      icon: TrendingUp,
      positive: true
    },
    {
      title: 'Daily Yield',
      value: '0.12%',
      change: 'Today',
      icon: Percent,
      positive: true
    }
  ];

  return (
    <div className="font-['Space_Grotesk'] space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome to the comprehensive fund and investor management system
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {stat.value}
                  </p>
                  <p className={`text-xs ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">System Navigation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationCards.map((card, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center mb-4`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  {card.description}
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(card.path)}
                  className="w-full"
                >
                  Access {card.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Daily yield of 0.12% applied to SOL fund</span>
              </div>
              <span className="text-xs text-muted-foreground">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">New investor onboarded: John Smith</span>
              </div>
              <span className="text-xs text-muted-foreground">5 hours ago</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">BTC fund AUM updated: $850K</span>
              </div>
              <span className="text-xs text-muted-foreground">1 day ago</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm">Monthly statements generated</span>
              </div>
              <span className="text-xs text-muted-foreground">2 days ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;