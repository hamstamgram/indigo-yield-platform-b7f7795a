
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, ArrowDown, DollarSign, LineChart, PiggyBank, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types
interface Asset {
  id: number;
  name: string;
  symbol: string;
  icon_url?: string;
  decimal_places: number;
}

interface AssetPrice {
  price: number;
  change24h: number;
}

interface AssetPortfolio {
  balance: number;
  usd_value: number;
  yield_applied: number;
}

const mockPrices: Record<string, AssetPrice> = {
  btc: { price: 62451.23, change24h: 2.4 },
  eth: { price: 3012.75, change24h: -1.2 },
  sol: { price: 142.89, change24h: 5.7 },
  usdc: { price: 1.00, change24h: 0.01 }
};

const mockYield: Record<string, number> = {
  btc: 4.8,
  eth: 5.2,
  sol: 6.5,
  usdc: 8.1
};

const AssetDetail = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [portfolio, setPortfolio] = useState<AssetPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const getAssetDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch asset info from database
        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .select('*')
          .eq('symbol', symbol?.toLowerCase())
          .single();
          
        if (assetError) throw assetError;
        
        if (assetData) {
          setAsset(assetData);
          
          // Fetch portfolio data for this asset
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            const { data: portfolioData, error: portfolioError } = await supabase
              .from('portfolios')
              .select('*')
              .eq('user_id', user.id)
              .eq('asset_id', assetData.id)
              .single();
              
            if (!portfolioError && portfolioData) {
              // For demo purposes, calculate USD value based on mock prices
              const mockPrice = mockPrices[symbol?.toLowerCase() || ''] || { price: 0, change24h: 0 };
              setPortfolio({
                balance: portfolioData.balance || 0,
                usd_value: (portfolioData.balance || 0) * mockPrice.price,
                yield_applied: portfolioData.balance * (mockYield[symbol?.toLowerCase() || ''] / 100) || 0
              });
            } else {
              // No portfolio data or error, set mock data
              setPortfolio({
                balance: symbol?.toLowerCase() === 'btc' ? 0.85 : 0,
                usd_value: symbol?.toLowerCase() === 'btc' ? 0.85 * mockPrices['btc'].price : 0,
                yield_applied: symbol?.toLowerCase() === 'btc' ? 0.85 * (mockYield['btc'] / 100) : 0
              });
            }
          }
        } else {
          toast({
            title: "Asset not found",
            description: `Could not find asset with symbol ${symbol}`,
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Error fetching asset details:", error);
        toast({
          title: "Error loading asset",
          description: error.message || "Failed to load asset details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    getAssetDetails();
  }, [symbol, toast]);

  const assetPrice = mockPrices[symbol?.toLowerCase() || ''] || { price: 0, change24h: 0 };
  const yieldRate = mockYield[symbol?.toLowerCase() || ''] || 0;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatCrypto = (value: number, symbol: string) => {
    return `${value.toFixed(symbol.toLowerCase() === 'usdc' ? 2 : 6)} ${symbol.toUpperCase()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading asset data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-['Space_Grotesk']">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {asset?.icon_url ? (
            <img src={asset.icon_url} alt={asset.name} className="h-10 w-10" />
          ) : (
            <div className="h-10 w-10 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-600">
              {symbol?.substring(0, 1).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{asset?.name || symbol?.toUpperCase()}</h1>
          <div className={`ml-auto px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
            assetPrice.change24h >= 0 
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
          }`}>
            {assetPrice.change24h >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(assetPrice.change24h)}%
          </div>
        </div>
        
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(assetPrice.price)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">per {symbol?.toUpperCase()}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-indigo-600" />
              Your Holdings
            </CardTitle>
            <CardDescription>Current balance and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Balance</p>
                <p className="text-2xl font-semibold">
                  {portfolio ? formatCrypto(portfolio.balance, symbol || '') : '0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Value</p>
                <p className="text-2xl font-semibold">
                  {portfolio ? formatCurrency(portfolio.usd_value) : '$0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Yield Rate</p>
                <p className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">
                  {yieldRate}% <span className="text-xs font-normal">APY</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Yield Earned</p>
                <p className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">
                  {portfolio ? formatCrypto(portfolio.yield_applied, symbol || '') : '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <LineChart className="h-5 w-5 text-indigo-600" />
              Asset Performance
            </CardTitle>
            <CardDescription>Performance metrics and yield data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Current Yield</span>
                  <span className="font-medium">{yieldRate}%</span>
                </div>
                <Progress value={yieldRate * 10} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-gray-400">24h Change</span>
                  <span className={`font-medium ${assetPrice.change24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {assetPrice.change24h}%
                  </span>
                </div>
                <Progress value={50 + assetPrice.change24h * 5} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2 mt-4">
                  <span className="text-gray-500 dark:text-gray-400">Time in Strategy</span>
                  <span className="font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    87 days
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="mb-4 bg-gray-100 dark:bg-gray-800">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="yield">Yield History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions">
          <Card className="border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>Your recent activity for {asset?.name || symbol}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <DollarSign className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-600 mb-2" />
                <p className="mb-2">No transactions yet</p>
                <p className="text-sm mb-4">Your recent transactions will appear here</p>
                <div className="flex gap-2 justify-center">
                  <Button>Deposit</Button>
                  <Button variant="outline">Request Withdrawal</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="yield">
          <Card className="border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">Yield History</CardTitle>
              <CardDescription>Your earned yield over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <PiggyBank className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-600 mb-2" />
                <p className="mb-2">Yield tracking coming soon</p>
                <p className="text-sm">Detailed yield history will be available in the next update</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card className="border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">Analytics</CardTitle>
              <CardDescription>Advanced metrics and performance data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <LineChart className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-600 mb-2" />
                <p className="mb-2">Analytics coming soon</p>
                <p className="text-sm">Detailed analytics will be available in the next update</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssetDetail;
