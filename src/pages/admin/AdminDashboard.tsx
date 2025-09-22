
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertCircle, DollarSign, Users, Zap, Clock, ArrowRight, TrendingUp, 
  TrendingDown, ChevronRight, Bitcoin, Coins 
} from "lucide-react";
import { getAdminKPIs, fetchAdminProfile } from "@/services/adminService";
import type { AdminKPIs } from "@/types/common";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { fetchCryptoPrices, startPriceAutoRefresh, CryptoPrice, formatPrice } from "@/services/cryptoPriceService";
import { useToast } from "@/hooks/use-toast";

// Asset Icons Component
const AssetIcon = ({ symbol, className = "w-8 h-8" }: { symbol: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    BTC: (
      <div className={`${className} rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center`}>
        <Bitcoin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
      </div>
    ),
    ETH: (
      <div className={`${className} rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center`}>
        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
        </svg>
      </div>
    ),
    SOL: (
      <div className={`${className} rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center`}>
        <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.5 9.5L12 4l4.5 5.5M7.5 14.5L12 20l4.5-5.5M4 12h16"/>
        </svg>
      </div>
    ),
    USDT: (
      <div className={`${className} rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center`}>
        <span className="text-green-600 dark:text-green-400 font-bold text-sm">₮</span>
      </div>
    ),
    EUR: (
      <div className={`${className} rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center`}>
        <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">€</span>
      </div>
    ),
  };

  return icons[symbol] || (
    <div className={`${className} rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center`}>
      <Coins className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    </div>
  );
};

// Types
interface AssetData {
  symbol: string;
  name: string;
  totalHoldings: number;
  marketValueUSD: number;
  investorCount: number;
  percentageOfFund: number;
  price: number;
  holders: InvestorHolding[];
}

interface InvestorHolding {
  id: string;
  name: string;
  email: string;
  holdings: number;
  percentage: number;
  valueUSD: number;
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [userName, setUserName] = useState("");
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [totalFundValue, setTotalFundValue] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<AssetData | null>(null);
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, CryptoPrice>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Handle query parameter redirects (e.g., /admin?tab=yields -> /admin/yield-settings)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    
    if (tab === 'yields') {
      navigate('/admin/yield-settings', { replace: true });
      return;
    }
  }, [location.search, navigate]);
  
  // Define supported assets
  const SUPPORTED_ASSETS = [
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'EUR', name: 'Euro' }
  ];

  // Fetch portfolio data for assets
  const fetchPortfolioData = async () => {
    try {
      // Fetch crypto prices
      const prices = await fetchCryptoPrices();
      setCryptoPrices(prices);

      // Fetch all portfolio data from database
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select(`
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email
          ),
          assets:asset_id (
            symbol,
            name
          )
        `)
        .gt('balance', 0); // Only get portfolios with positive balance

      if (portfolioError) {
        console.error('Portfolio fetch error:', portfolioError);
        throw portfolioError;
      }

      // Process data by asset
      const assetMap = new Map<string, AssetData>();
      let totalValue = 0;

      // Initialize all supported assets
      SUPPORTED_ASSETS.forEach(asset => {
        assetMap.set(asset.symbol, {
          symbol: asset.symbol,
          name: asset.name,
          totalHoldings: 0,
          marketValueUSD: 0,
          investorCount: 0,
          percentageOfFund: 0,
          price: asset.symbol === 'EUR' ? 1.08 : prices[asset.symbol]?.price || 0,
          holders: []
        });
      });

      // Process portfolio data
      console.log('Processing portfolio data:', portfolioData);
      portfolioData?.forEach(portfolio => {
        const symbol = portfolio.assets?.symbol?.toUpperCase() || 'USDT';
        const balance = Number(portfolio.balance) || 0;
        
        if (!assetMap.has(symbol)) return;

        const asset = assetMap.get(symbol)!;
        const price = asset.price;
        const valueUSD = balance * price;

        asset.totalHoldings += balance;
        asset.marketValueUSD += valueUSD;
        totalValue += valueUSD;

        // Check if we have profile data (might be under different key)
        const profile = portfolio.profiles || portfolio.user_id;
        if (profile && typeof profile === 'object') {
          // Add to holders list
          const existingHolder = asset.holders.find(h => h.id === profile.id);
          if (existingHolder) {
            existingHolder.holdings += balance;
            existingHolder.valueUSD += valueUSD;
          } else {
            const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            asset.holders.push({
              id: profile.id,
              name: fullName || 'Anonymous',
              email: profile.email,
              holdings: balance,
              percentage: 0, // Will calculate later
              valueUSD: valueUSD
            });
          }
        }
      });

      // Calculate percentages and investor counts
      assetMap.forEach(asset => {
        asset.percentageOfFund = totalValue > 0 ? (asset.marketValueUSD / totalValue) * 100 : 0;
        asset.investorCount = asset.holders.length;
        
        // Calculate holder percentages
        asset.holders.forEach(holder => {
          holder.percentage = asset.totalHoldings > 0 ? (holder.holdings / asset.totalHoldings) * 100 : 0;
        });
        
        // Sort holders by holdings amount
        asset.holders.sort((a, b) => b.holdings - a.holdings);
      });

      setAssets(Array.from(assetMap.values()));
      setTotalFundValue(totalValue);

    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch admin profile, KPIs and portfolio data in parallel
        const [profileData, kpiData] = await Promise.all([
          fetchAdminProfile(),
          getAdminKPIs()
        ]);
        
        setUserName(profileData.userName);
        setKpis(kpiData);
        
        // Fetch portfolio data
        await fetchPortfolioData();
        
      } catch (err) {
        console.error('Error fetching admin dashboard data:', err);
        setError('Failed to load admin dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Start auto-refresh for prices
    const cleanup = startPriceAutoRefresh((prices) => {
      setCryptoPrices(prices);
      // Update asset prices without full refresh
      setAssets(prev => prev.map(asset => ({
        ...asset,
        price: asset.symbol === 'EUR' ? 1.08 : prices[asset.symbol]?.price || asset.price,
        marketValueUSD: asset.totalHoldings * (asset.symbol === 'EUR' ? 1.08 : prices[asset.symbol]?.price || asset.price)
      })));
    }, 60000); // Update every minute

    return cleanup;
  }, []);
  
  // Display loading state
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Display error if any
  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          {userName && (
            <p className="text-muted-foreground">Welcome back, {userName}</p>
          )}
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        {userName && (
          <p className="text-muted-foreground">Welcome back, {userName}</p>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.totalAUM || '—'}</div>
            <p className="text-xs text-muted-foreground">
              Assets under management
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.totalInvestors || '—'}</div>
            <p className="text-xs text-muted-foreground">
              Total registered investors
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Interest</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.last24hInterest || '—'}</div>
            <p className="text-xs text-muted-foreground">
              Interest earned today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.pendingWithdrawals || '—'}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Assets Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Portfolio Assets</h2>
          <Badge variant="outline" className="text-xs">
            Auto-updates every minute
          </Badge>
        </div>
        
        {/* Asset Cards Grid */}
        <div className={`grid gap-4 ${
          isMobile 
            ? 'grid-cols-1' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
        }`}>
          {assets.map(asset => (
              <Card
                key={asset.symbol}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20"
                onClick={() => setSelectedAsset(asset)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AssetIcon symbol={asset.symbol} className={isMobile ? "w-10 h-10" : "w-12 h-12"} />
                      <div>
                        <CardTitle className="text-lg font-bold">{asset.symbol}</CardTitle>
                        <CardDescription className="text-xs">{asset.name}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Holdings Amount */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Holdings</p>
                    <p className="text-2xl font-bold">
                      {asset.symbol === 'EUR' ? '€' : ''}{asset.totalHoldings.toLocaleString(undefined, { maximumFractionDigits: 2 })} {asset.symbol !== 'EUR' ? asset.symbol : ''}
                    </p>
                  </div>

                  {/* Market Value */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Market Value (USD)</p>
                    <p className="text-xl font-semibold">${asset.marketValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>

                  {/* Current Price */}
                  <div>
                    <p className="text-xs text-muted-foreground">Current Price</p>
                    <p className="text-lg font-medium">
                      ${asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  {/* Fund Allocation */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Fund Allocation</span>
                      <span className="font-medium">{asset.percentageOfFund.toFixed(2)}%</span>
                    </div>
                    <Progress value={asset.percentageOfFund} className="h-2" />
                  </div>

                  {/* Investor Count */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{asset.investorCount} investors</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
          ))}
        </div>
      </div>

      {/* Asset Details Dialog */}
      {selectedAsset && (
        <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <AssetIcon symbol={selectedAsset.symbol} />
                <span>{selectedAsset.name} ({selectedAsset.symbol}) Holders</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Holdings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {selectedAsset.totalHoldings.toLocaleString()} {selectedAsset.symbol}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Value (USD)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      ${selectedAsset.marketValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Holdings</TableHead>
                    <TableHead className="text-right">% Share</TableHead>
                    <TableHead className="text-right">Value (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedAsset.holders.map(holder => (
                    <TableRow key={holder.id}>
                      <TableCell className="font-medium">{holder.name}</TableCell>
                      <TableCell className="text-muted-foreground">{holder.email}</TableCell>
                      <TableCell className="text-right">
                        {holder.holdings.toLocaleString(undefined, { maximumFractionDigits: 4 })} {selectedAsset.symbol}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{holder.percentage.toFixed(2)}%</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${holder.valueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedAsset.holders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No investors holding {selectedAsset.symbol} yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Actions */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Investor Management</CardTitle>
            <CardDescription>
              View and manage investor accounts, KYC status, and portfolios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/admin/investors')} className="w-full">
              Manage Investors
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Yield Settings</CardTitle>
            <CardDescription>
              Configure yield rates and sources for supported assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/admin/yield-settings')} className="w-full">
              Configure Yields
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Management</CardTitle>
            <CardDescription>
              Advanced portfolio operations and bulk management tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/admin-tools')} className="w-full" variant="outline">
              Advanced Tools
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
