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
import { ArrowUpRight, ArrowDownRight, TrendingUp, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CryptoIcon } from "@/components/CryptoIcons";
import { fetchCryptoPrices, defaultPrices } from "@/services/cryptoService";

// Helper function to format numbers
const formatNumber = (value: number, decimals = 2) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

// Helper function to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

// Helper function to format crypto amounts
const formatCrypto = (value: number, symbol: string) => {
  const decimals = symbol.toLowerCase() === 'btc' ? 8 : 
                  symbol.toLowerCase() === 'usdc' ? 2 : 4;
  return `${value.toFixed(decimals)} ${symbol.toUpperCase()}`;
};

// Asset color mapping
const assetColors: Record<string, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  SOL: '#14F195',
  USDC: '#2775CA',
};

// Mock yield rates
const yieldRates: Record<string, number> = {
  BTC: 4.8,
  ETH: 5.2,
  SOL: 6.5,
  USDC: 8.1,
};

type Asset = {
  id: number;
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  percentChange: number;
  color: string;
  yieldValue: number; // Added yield value in crypto
};

const Dashboard = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [totalChange, setTotalChange] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .single();
          
        if (profile) {
          setUserName(profile.first_name || '');
        }
        
        // Get all supported symbols for price fetching
        const symbols = ['BTC', 'ETH', 'SOL', 'USDC'];
        
        // Fetch live prices
        let prices = {};
        try {
          prices = await fetchCryptoPrices(symbols);
          console.log('Fetched live prices:', prices);
        } catch (e) {
          console.error('Error fetching crypto prices, using defaults:', e);
          prices = defaultPrices;
        }
        
        // Fetch portfolio data
        const { data: portfolioData, error: portfolioError } = await supabase
          .from('portfolios')
          .select(`
            asset_id,
            balance,
            assets (
              id,
              symbol,
              name
            )
          `)
          .eq('user_id', user.id);
          
        if (portfolioError) throw portfolioError;
        
        // Process portfolio data
        const processedAssets: Asset[] = [];
        let portfolioTotal = 0;
        let weightedChange = 0;
        
        if (portfolioData && portfolioData.length > 0) {
          portfolioData.forEach((item) => {
            const symbol = item.assets.symbol.toUpperCase();
            const balance = Number(item.balance);
            const priceData = prices[symbol.toLowerCase()] || defaultPrices[symbol.toLowerCase()];
            const usdValue = balance * priceData.price;
            
            portfolioTotal += usdValue;
            weightedChange += (priceData.change24h * usdValue);
            
            // Calculate yield value in crypto
            const yieldPercentage = yieldRates[symbol] || 0;
            const yieldValue = balance * (yieldPercentage / 100);
            
            processedAssets.push({
              id: item.assets.id,
              symbol: symbol,
              name: item.assets.name,
              balance: balance,
              usdValue: usdValue,
              percentChange: priceData.change24h,
              color: assetColors[symbol] || '#6366F1',
              yieldValue: yieldValue
            });
          });
        } else {
          // Demo data if no portfolio exists
          symbols.forEach((symbol, index) => {
            const balance = symbol === 'BTC' ? 0.5 : 
                           symbol === 'ETH' ? 5 : 
                           symbol === 'SOL' ? 50 : 1000;
                           
            const priceData = prices[symbol.toLowerCase()] || defaultPrices[symbol.toLowerCase()];
            const usdValue = balance * priceData.price;
            
            portfolioTotal += usdValue;
            weightedChange += (priceData.change24h * usdValue);
            
            // Calculate yield value in crypto
            const yieldPercentage = yieldRates[symbol] || 0;
            const yieldValue = balance * (yieldPercentage / 100);
            
            processedAssets.push({
              id: index + 1,
              symbol: symbol,
              name: symbol === 'BTC' ? 'Bitcoin' : 
                    symbol === 'ETH' ? 'Ethereum' : 
                    symbol === 'SOL' ? 'Solana' : 'USD Coin',
              balance: balance,
              usdValue: usdValue,
              percentChange: priceData.change24h,
              color: assetColors[symbol],
              yieldValue: yieldValue
            });
          });
        }
        
        setAssets(processedAssets);
        setTotalPortfolioValue(portfolioTotal);
        
        // Calculate weighted average change for total portfolio
        if (portfolioTotal > 0) {
          setTotalChange(weightedChange / portfolioTotal);
        }
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up a refresh interval for prices (every 60 seconds)
    const refreshInterval = setInterval(fetchData, 60000);
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back{userName ? `, ${userName}` : ''}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Here's an overview of your portfolio performance
          </p>
        </div>
      </div>
      
      {/* Portfolio summary cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Portfolio Value */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-500 dark:text-gray-400">
              Total Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? 'Loading...' : formatCurrency(totalPortfolioValue)}
            </div>
            <div className={`flex items-center mt-2 text-sm ${
              totalChange >= 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-red-600 dark:text-red-400'
              }`}>
              {totalChange >= 0 ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 mr-1" />
              )}
              <span>
                {totalChange >= 0 ? '+' : ''}
                {formatNumber(totalChange)}% in the last 24h
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Current Yield Rate */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-500 dark:text-gray-400">
              Average Daily Yield
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              0.0021%
            </div>
            <div className="flex items-center mt-2 text-sm text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>~0.63% monthly compounded</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Since Inception */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-500 dark:text-gray-400">
              Since Inception
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              +8.34%
            </div>
            <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span>First deposit: 121 days ago</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Asset allocation card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle>Asset Allocation</CardTitle>
          <CardDescription>Your current portfolio distribution</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
            </div>
          ) : assets.length > 0 ? (
            <div className="space-y-6">
              {/* Allocation Bar */}
              <div className="w-full h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                {assets.map((asset) => {
                  const percentage = (asset.usdValue / totalPortfolioValue) * 100;
                  return (
                    <div 
                      key={asset.id} 
                      className="h-full" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: asset.color,
                        minWidth: percentage > 0 ? '4px' : '0'
                      }}
                    />
                  );
                })}
              </div>
              
              {/* Asset List */}
              <div className="space-y-4">
                {assets.map((asset) => {
                  const percentage = (asset.usdValue / totalPortfolioValue) * 100;
                  return (
                    <div key={asset.id} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <CryptoIcon symbol={asset.symbol} className="w-6 h-6 mr-2" />
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">{asset.name}</span>
                          <span className="text-xs text-gray-500">{asset.symbol}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-medium text-gray-900 dark:text-white">{formatNumber(percentage, 1)}%</span>
                        <span className="text-xs text-gray-500">{formatCurrency(asset.usdValue)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No assets in your portfolio yet</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Assets detail */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Assets</h2>
          <Link to="/assets">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium">Asset</th>
                <th className="text-left py-3 px-4 font-medium">Balance</th>
                <th className="text-right py-3 px-4 font-medium">Value</th>
                <th className="text-right py-3 px-4 font-medium">Yield Earned</th>
                <th className="text-right py-3 px-4 font-medium">24h Change</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading assets...
                  </td>
                </tr>
              ) : assets.length > 0 ? (
                assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <CryptoIcon symbol={asset.symbol} className="w-8 h-8 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{asset.name}</div>
                          <div className="text-xs text-gray-500">{asset.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatCrypto(asset.balance, asset.symbol)}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(asset.usdValue)}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="font-medium text-indigo-600 dark:text-indigo-400">
                        {formatCrypto(asset.yieldValue, asset.symbol)}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className={`font-medium ${
                        asset.percentChange >= 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {asset.percentChange >= 0 ? '+' : ''}
                        {formatNumber(asset.percentChange, 2)}%
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link to={`/assets/${asset.symbol.toLowerCase()}`}>
                        <Button variant="outline" size="sm">Details</Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No assets in your portfolio yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Recent Yield Activity */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Yield Activity</CardTitle>
            <CardDescription>Daily yield payments to your wallet</CardDescription>
          </div>
          <Button variant="outline" size="sm">View All</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="h-12 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
              </div>
            ) : assets.length > 0 ? (
              <>
                {assets.slice(0, 3).map((asset, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex items-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mr-4">
                      <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">Daily Yield Payment</div>
                      <div className="text-sm text-gray-500">May {6 - index}, 2025 • {asset.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-emerald-600 dark:text-emerald-400">
                        +{formatCrypto(asset.yieldValue / 30, asset.symbol)}
                      </div>
                      <div className="text-xs text-gray-500">{(yieldRates[asset.symbol] / 365).toFixed(4)}%</div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 dark:text-gray-400">No yield activity yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex">
        <div className="mr-4">
          <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />
        </div>
        <div>
          <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">Daily Email Reports</h4>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            You'll receive a daily email with your portfolio performance and yield details. 
            You can customize your notification preferences in the Settings page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
