import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Bitcoin,
  Coins
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

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
  priceChange24h: number;
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

interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
}

// CoinMarketCap API Service
const COINMARKETCAP_API_KEY = import.meta.env.VITE_COINMARKETCAP_API_KEY || '';
const CMC_PROXY_URL = '/api/crypto-prices'; // You'll need to set up a proxy endpoint

const fetchCryptoPrices = async (): Promise<Record<string, CryptoPrice>> => {
  try {
    // In production, use your backend proxy to avoid CORS issues
    const response = await fetch(CMC_PROXY_URL, {
      headers: {
        'X-CMC-API-KEY': COINMARKETCAP_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch crypto prices');
    }
    
    const data = await response.json();
    
    // Map the response to our format
    const prices: Record<string, CryptoPrice> = {};
    
    // Mock data for development - replace with actual CMC API response parsing
    prices['BTC'] = { symbol: 'BTC', price: 67500, change24h: 2.5 };
    prices['ETH'] = { symbol: 'ETH', price: 3200, change24h: -1.2 };
    prices['SOL'] = { symbol: 'SOL', price: 148, change24h: 5.3 };
    prices['USDT'] = { symbol: 'USDT', price: 1, change24h: 0.01 };
    
    return prices;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    // Return mock prices as fallback
    return {
      BTC: { symbol: 'BTC', price: 67500, change24h: 2.5 },
      ETH: { symbol: 'ETH', price: 3200, change24h: -1.2 },
      SOL: { symbol: 'SOL', price: 148, change24h: 5.3 },
      USDT: { symbol: 'USDT', price: 1, change24h: 0.01 }
    };
  }
};

// Asset Card Component
const AssetCard = ({ 
  asset, 
  onClick,
  isMobile 
}: { 
  asset: AssetData; 
  onClick: () => void;
  isMobile: boolean;
}) => {
  const isPositive = asset.priceChange24h >= 0;

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20"
      onClick={onClick}
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
          <Badge 
            variant={isPositive ? "default" : "destructive"}
            className="ml-auto"
          >
            <span className="flex items-center gap-1">
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(asset.priceChange24h).toFixed(2)}%
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Holdings Amount */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Total Holdings</p>
          <p className="text-2xl font-bold">
            {asset.symbol === 'EUR' ? '€' : ''}{asset.totalHoldings.toLocaleString()} {asset.symbol !== 'EUR' ? asset.symbol : ''}
          </p>
        </div>

        {/* Market Value */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Market Value (USD)</p>
          <p className="text-xl font-semibold">${asset.marketValueUSD.toLocaleString()}</p>
        </div>

        {/* Current Price */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="font-medium">
              ${asset.price.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">24h Change</p>
            <p className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{(asset.priceChange24h * asset.price / 100).toFixed(2)}
            </p>
          </div>
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
  );
};

// Main Dashboard Component
const AdminPortfolioDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [totalFundValue, setTotalFundValue] = useState(0);
  const [totalInvestors, setTotalInvestors] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<AssetData | null>(null);
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, CryptoPrice>>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Define supported assets
  const SUPPORTED_ASSETS = [
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'EUR', name: 'Euro' }
  ];

  // Fetch all data
  const fetchPortfolioData = async () => {
    try {
      setLoading(true);

      // Fetch crypto prices
      const prices = await fetchCryptoPrices();
      setCryptoPrices(prices);

      // Fetch all portfolio data from database
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select(`
          *,
          profiles!portfolios_user_id_fkey (
            id,
            full_name,
            email
          ),
          assets (
            symbol,
            name
          )
        `);

      if (portfolioError) throw portfolioError;

      // Process data by asset
      const assetMap = new Map<string, AssetData>();
      let totalValue = 0;
      const uniqueInvestors = new Set<string>();

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
          priceChange24h: asset.symbol === 'EUR' ? 0.1 : prices[asset.symbol]?.change24h || 0,
          holders: []
        });
      });

      // Process portfolio data
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

        if (portfolio.profiles) {
          uniqueInvestors.add(portfolio.profiles.id);
          
          // Add to holders list
          const existingHolder = asset.holders.find(h => h.id === portfolio.profiles.id);
          if (existingHolder) {
            existingHolder.holdings += balance;
            existingHolder.valueUSD += valueUSD;
          } else {
            asset.holders.push({
              id: portfolio.profiles.id,
              name: portfolio.profiles.full_name || 'Anonymous',
              email: portfolio.profiles.email,
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
      setTotalInvestors(uniqueInvestors.size);

    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load portfolio data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-refresh prices every 60 seconds
  useEffect(() => {
    fetchPortfolioData();
    
    const interval = setInterval(() => {
      fetchCryptoPrices().then(prices => {
        setCryptoPrices(prices);
        // Update asset prices without full refresh
        setAssets(prev => prev.map(asset => ({
          ...asset,
          price: asset.symbol === 'EUR' ? 1.08 : prices[asset.symbol]?.price || asset.price,
          priceChange24h: asset.symbol === 'EUR' ? 0.1 : prices[asset.symbol]?.change24h || asset.priceChange24h,
          marketValueUSD: asset.totalHoldings * (asset.symbol === 'EUR' ? 1.08 : prices[asset.symbol]?.price || asset.price)
        })));
      });
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPortfolioData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-4 w-20 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portfolio Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time multi-asset portfolio management
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          disabled={refreshing}
          size={isMobile ? "sm" : "default"}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card className="border-2 border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Fund Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${totalFundValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all {assets.length} assets
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalInvestors}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active investors in fund
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Cards Grid */}
      <div className={`grid gap-4 ${
        isMobile 
          ? 'grid-cols-1' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
      }`}>
        {assets.map(asset => (
          <AssetCard
            key={asset.symbol}
            asset={asset}
            onClick={() => setSelectedAsset(asset)}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Asset Detail Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <AssetIcon symbol={selectedAsset.symbol} className="w-10 h-10" />
                  <div>
                    <span className="text-2xl">{selectedAsset.name} ({selectedAsset.symbol})</span>
                    <p className="text-sm text-muted-foreground font-normal">
                      {selectedAsset.investorCount} investors • {selectedAsset.percentageOfFund.toFixed(2)}% of fund
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Asset Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Holdings</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {selectedAsset.totalHoldings.toLocaleString()} {selectedAsset.symbol}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Market Value</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        ${selectedAsset.marketValueUSD.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Investor Holdings Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Investor Holdings</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Investor</TableHead>
                          <TableHead className="text-right">Holdings</TableHead>
                          <TableHead className="text-right">Value (USD)</TableHead>
                          <TableHead className="text-right">% of Asset</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedAsset.holders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8">
                              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-muted-foreground">No investors hold this asset yet</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedAsset.holders.map(holder => (
                            <TableRow key={holder.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{holder.name}</p>
                                  <p className="text-xs text-muted-foreground">{holder.email}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {holder.holdings.toLocaleString()} {selectedAsset.symbol}
                              </TableCell>
                              <TableCell className="text-right">
                                ${holder.valueUSD.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">
                                  {holder.percentage.toFixed(2)}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPortfolioDashboard;
