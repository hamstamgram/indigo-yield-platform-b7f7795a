import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminServiceV2, DashboardStatsV2, InvestorSummaryV2 } from "@/services/adminServiceV2";
import { yieldService, YieldRate } from "@/services/yieldService";
import { ArrowUpIcon, ArrowDownIcon, DollarSign, Users, TrendingUp, Activity } from "lucide-react";
import { YieldManagementPanel } from "./yield/YieldManagementPanel";
import { InvestorManagementPanel } from "./investor/InvestorManagementPanel";
import { WithdrawalRequestsPanel } from "./withdrawal/WithdrawalRequestsPanel";
import { RealtimeNotifications } from "./RealtimeNotifications";

function AdminDashboardV2() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsV2 | null>(null);
  const [yieldRates, setYieldRates] = useState<YieldRate[]>([]);
  const [recentInvestors, setRecentInvestors] = useState<InvestorSummaryV2[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load data in parallel for efficiency
      const [stats, rates, investors] = await Promise.all([
        adminServiceV2.getDashboardStats(),
        yieldService.getCurrentYieldRates(),
        adminServiceV2.getAllInvestorsWithSummary()
      ]);

      setDashboardStats(stats);
      setYieldRates(rates);
      setRecentInvestors(investors.slice(0, 5)); // Top 5 recent investors
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your yield fund platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RealtimeNotifications />
          <Button onClick={loadDashboardData} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardStats?.totalAum || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all portfolios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.investorCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active investor accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Yield</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardStats?.interest24h || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average daily distribution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.pendingWithdrawals || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requiring admin action
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Yield Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Current Yield Rates</CardTitle>
          <CardDescription>
            Active yield rates for all assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {yieldRates.map((rate) => (
              <div key={rate.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{rate.asset_symbol}</div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {formatPercentage(rate.annual_yield_percentage / 100)}
                    </div>
                    <div className="text-xs text-muted-foreground">APY</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Daily: {formatPercentage(rate.daily_yield_percentage / 100)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Management Tabs */}
      <Tabs defaultValue="yield" className="space-y-4">
        <TabsList>
          <TabsTrigger value="yield">Yield Management</TabsTrigger>
          <TabsTrigger value="investors">Investors</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawal Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="yield">
          <YieldManagementPanel onDataChange={loadDashboardData} />
        </TabsContent>

        <TabsContent value="investors">
          <InvestorManagementPanel investors={recentInvestors} onDataChange={loadDashboardData} />
        </TabsContent>

        <TabsContent value="withdrawals">
          <WithdrawalRequestsPanel onDataChange={loadDashboardData} />
        </TabsContent>
      </Tabs>

      {/* Recent Investors Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Investors</CardTitle>
          <CardDescription>
            Latest investor registrations and activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentInvestors.map((investor) => (
              <div key={investor.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <div className="font-medium">
                    {investor.firstName} {investor.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">{investor.email}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(investor.totalAum)}</div>
                  <div className="text-sm text-muted-foreground">
                    {Object.keys(investor.portfolioDetails.assetBreakdown).length} position{Object.keys(investor.portfolioDetails.assetBreakdown).length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminDashboardV2;