import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Info, Calendar, DollarSign, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CryptoIcon } from "@/components/CryptoIcons";
import { KPICard } from "@/components/dashboard/KPICard";
import { calculateAllKPIs, formatAssetValue, AssetKPI } from "@/utils/kpiCalculations";
import { Skeleton } from "@/components/ui/skeleton";

// Native token system - no price fetching needed

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const assetColors: Record<string, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  SOL: '#14F195',
  USDC: '#2775CA',
  USDT: '#26A17B',
  EURC: '#4B7BEC',
};

const EnhancedDashboard = () => {
  const [assetKPIs, setAssetKPIs] = useState<AssetKPI[]>([]);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [totalChange, setTotalChange] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [aggregatedKPIs, setAggregatedKPIs] = useState({
    totalMTD: 0,
    totalQTD: 0,
    totalYTD: 0,
    totalITD: 0,
    mtdPercentage: 0,
    qtdPercentage: 0,
    ytdPercentage: 0,
    itdPercentage: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        setUserId(user.id);
        
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .single();
          
        if (profile) {
          setUserName(profile.first_name || '');
        }
        
        // Calculate KPIs for all assets (native tokens only)
        const kpis = await calculateAllKPIs(user.id);
        setAssetKPIs(kpis);
        
        // Calculate portfolio totals (native token amounts only)
        let totalMTD = 0;
        let totalQTD = 0;
        let totalYTD = 0;
        let totalITD = 0;
        let totalBalance = 0;
        let totalPrincipal = 0;
        
        kpis.forEach(kpi => {
          totalBalance += kpi.currentBalance;
          totalPrincipal += kpi.principal;
          totalMTD += kpi.metrics.mtd;
          totalQTD += kpi.metrics.qtd;
          totalYTD += kpi.metrics.ytd;
          totalITD += kpi.metrics.itd;
        });
        
        setTotalPortfolioValue(totalBalance);
        setAggregatedKPIs({
          totalMTD,
          totalQTD,
          totalYTD,
          totalITD,
          mtdPercentage: totalPrincipal > 0 ? (totalMTD / totalPrincipal) * 100 : 0,
          qtdPercentage: totalPrincipal > 0 ? (totalQTD / totalPrincipal) * 100 : 0,
          ytdPercentage: totalPrincipal > 0 ? (totalYTD / totalPrincipal) * 100 : 0,
          itdPercentage: totalPrincipal > 0 ? (totalITD / totalPrincipal) * 100 : 0,
        });
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Refresh every 60 seconds
    const refreshInterval = setInterval(fetchData, 60000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 px-6 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {userName ? `Welcome back, ${userName}` : 'Portfolio Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your yield performance across all assets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/statements">View Statements</Link>
          </Button>
          <Button asChild>
            <Link to="/transactions">Transactions</Link>
          </Button>
        </div>
      </div>

      {/* Aggregated KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Month to Date (MTD)"
          value={`${aggregatedKPIs.totalMTD.toFixed(4)} Tokens`}
          percentage={aggregatedKPIs.mtdPercentage}
          trend={aggregatedKPIs.mtdPercentage > 0 ? "up" : "down"}
          icon={<Calendar className="h-4 w-4" />}
          subtitle="Total yield earned this month"
        />
        <KPICard
          title="Quarter to Date (QTD)"
          value={`${aggregatedKPIs.totalQTD.toFixed(4)} Tokens`}
          percentage={aggregatedKPIs.qtdPercentage}
          trend={aggregatedKPIs.qtdPercentage > 0 ? "up" : "down"}
          icon={<TrendingUp className="h-4 w-4" />}
          subtitle="Total yield earned this quarter"
        />
        <KPICard
          title="Year to Date (YTD)"
          value={`${aggregatedKPIs.totalYTD.toFixed(4)} Tokens`}
          percentage={aggregatedKPIs.ytdPercentage}
          trend={aggregatedKPIs.ytdPercentage > 0 ? "up" : "down"}
          icon={<DollarSign className="h-4 w-4" />}
          subtitle="Total yield earned this year"
        />
        <KPICard
          title="Inception to Date (ITD)"
          value={`${aggregatedKPIs.totalITD.toFixed(4)} Tokens`}
          percentage={aggregatedKPIs.itdPercentage}
          trend={aggregatedKPIs.itdPercentage > 0 ? "up" : "down"}
          icon={<Percent className="h-4 w-4" />}
          subtitle="Total yield earned all time"
        />
      </div>

      {/* Total Portfolio Value */}
      <Card>
        <CardHeader>
          <CardTitle>Total Portfolio Value</CardTitle>
          <CardDescription>Combined value across all assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalPortfolioValue.toFixed(4)} Total Tokens</div>
          <p className="text-sm text-muted-foreground mt-1">Combined native token balances across all assets</p>
        </CardContent>
      </Card>

      {/* Asset-Specific KPIs */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Asset Performance</h2>
        {assetKPIs.map((asset) => (
          <Card key={asset.assetCode}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CryptoIcon 
                    symbol={asset.assetCode} 
                    className="h-8 w-8 text-primary" 
                  />
                  <div>
                    <CardTitle>{asset.assetCode}</CardTitle>
                    <CardDescription>
                      Balance: {formatAssetValue(asset.currentBalance, asset.assetCode)} {asset.assetCode}
                    </CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/assets/${asset.assetCode.toLowerCase()}`}>
                    View Details
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">MTD</p>
                  <p className="text-lg font-semibold">
                    {formatAssetValue(asset.metrics.mtd, asset.assetCode)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {asset.metrics.mtdPercentage.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">QTD</p>
                  <p className="text-lg font-semibold">
                    {formatAssetValue(asset.metrics.qtd, asset.assetCode)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {asset.metrics.qtdPercentage.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">YTD</p>
                  <p className="text-lg font-semibold">
                    {formatAssetValue(asset.metrics.ytd, asset.assetCode)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {asset.metrics.ytdPercentage.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ITD</p>
                  <p className="text-lg font-semibold">
                    {formatAssetValue(asset.metrics.itd, asset.assetCode)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {asset.metrics.itdPercentage.toFixed(2)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/deposits">Request Deposit</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/account">Account Settings</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/support">Contact Support</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedDashboard;
