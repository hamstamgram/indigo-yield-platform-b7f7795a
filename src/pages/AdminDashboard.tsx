import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { CryptoIcon } from "@/components/CryptoIcons";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchCryptoPrices, defaultPrices } from "@/services/cryptoService";

type AssetSummary = {
  id: number;
  symbol: string;
  name: string;
  totalBalance: number;
  usdValue: number;
  totalUsers: number;
  avgYield: number;
};

type YieldSource = {
  id: string;
  name: string;
  btcYield: number;
  ethYield: number;
  solYield: number;
  usdcYield: number;
};

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [assetSummaries, setAssetSummaries] = useState<AssetSummary[]>([]);
  const [yieldSources, setYieldSources] = useState<YieldSource[]>([]);
  const [userName, setUserName] = useState("");

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Format crypto amounts
  const formatCrypto = (value: number, symbol: string) => {
    const decimals = symbol.toLowerCase() === 'btc' ? 8 : 
                    symbol.toLowerCase() === 'usdc' ? 2 : 4;
    return `${value.toFixed(decimals)} ${symbol.toUpperCase()}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get current admin user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        // Get admin profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, is_admin')
          .eq('id', user.id)
          .single();
          
        if (profile) {
          setUserName(`${profile.first_name || ''} ${profile.last_name || ''}`);
          
          // Ensure this is an admin
          if (!profile.is_admin) {
            console.error("Non-admin user accessing admin dashboard");
            return;
          }
        }
        
        // Fetch all assets
        const { data: assets } = await supabase
          .from('assets')
          .select('*')
          .order('id');
          
        if (!assets) {
          throw new Error("Failed to load assets");
        }

        // Get real-time prices
        const symbols = assets.map(asset => asset.symbol.toUpperCase());
        let prices = {};
        try {
          prices = await fetchCryptoPrices(symbols);
        } catch (e) {
          console.error('Error fetching prices, using defaults:', e);
          prices = defaultPrices;
        }

        // Define default values for each supported asset type
        const defaultValues = {
          'BTC': { balance: 12.5, users: 18, yield: 4.8 },
          'ETH': { balance: 180, users: 15, yield: 5.2 },
          'SOL': { balance: 2200, users: 11, yield: 6.5 },
          'USDC': { balance: 425000, users: 22, yield: 8.1 }
        };
        
        // Create asset summaries for all assets
        const mockSummaries: AssetSummary[] = assets.map(asset => {
          const symbol = asset.symbol.toUpperCase();
          
          // Get default values for this asset type or use zeros
          const defaults = defaultValues[symbol] || { balance: 0, users: 0, yield: 0 };
          
          const priceData = prices[asset.symbol.toLowerCase()] || defaultPrices[asset.symbol.toLowerCase()] || { price: 0 };
          
          return {
            id: asset.id,
            symbol: asset.symbol,
            name: asset.name,
            totalBalance: defaults.balance,
            usdValue: defaults.balance * priceData.price,
            totalUsers: defaults.users,
            avgYield: defaults.yield
          };
        });
        
        setAssetSummaries(mockSummaries);
        
        // Mock yield sources for the demonstration
        const mockYieldSources: YieldSource[] = [
          {
            id: '1',
            name: 'Aave',
            btcYield: 3.2,
            ethYield: 4.8,
            solYield: 0,
            usdcYield: 6.2
          },
          {
            id: '2',
            name: 'Compound',
            btcYield: 3.5,
            ethYield: 4.5,
            solYield: 0,
            usdcYield: 5.8
          },
          {
            id: '3',
            name: 'Solend',
            btcYield: 0,
            ethYield: 0,
            solYield: 6.5,
            usdcYield: 7.2
          },
          {
            id: '4',
            name: 'Lido',
            btcYield: 4.7,
            ethYield: 5.6,
            solYield: 6.8,
            usdcYield: 0
          },
          {
            id: '5',
            name: 'Marinade',
            btcYield: 0,
            ethYield: 0,
            solYield: 7.1,
            usdcYield: 0
          },
        ];
        
        setYieldSources(mockYieldSources);
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard {userName ? `- Welcome ${userName}` : ''}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Overview of all managed assets and yields
          </p>
        </div>
        <div className="flex mt-4 md:mt-0 space-x-3">
          <Button variant="outline" asChild>
            <Link to="/admin?tab=users">Manage Users</Link>
          </Button>
          <Button asChild>
            <Link to="/admin?tab=invites">Investor Invites</Link>
          </Button>
        </div>
      </div>

      {/* Asset summaries */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Asset Overview</CardTitle>
          <CardDescription>Summary of all assets under management</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {assetSummaries.map((asset) => (
                <Card key={asset.id} className="bg-gray-50 dark:bg-gray-800 border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <CryptoIcon symbol={asset.symbol} className="h-12 w-12" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{asset.name}</h3>
                        <p className="text-sm text-gray-500">{asset.symbol}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Balance</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatCrypto(asset.totalBalance, asset.symbol)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">USD Value</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(asset.usdValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Users</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {asset.totalUsers}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Avg Yield</p>
                        <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                          {formatPercent(asset.avgYield)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Yield sources table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Yield Sources</CardTitle>
          <CardDescription>Current yield rates from different protocols</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocol</TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <CryptoIcon symbol="btc" className="h-5 w-5 mr-2" />
                        BTC
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <CryptoIcon symbol="eth" className="h-5 w-5 mr-2" />
                        ETH
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <CryptoIcon symbol="sol" className="h-5 w-5 mr-2" />
                        SOL
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <CryptoIcon symbol="usdc" className="h-5 w-5 mr-2" />
                        USDC
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yieldSources.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell>
                        {source.btcYield > 0 ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                            {formatPercent(source.btcYield)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {source.ethYield > 0 ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                            {formatPercent(source.ethYield)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {source.solYield > 0 ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                            {formatPercent(source.solYield)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {source.usdcYield > 0 ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                            {formatPercent(source.usdcYield)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Investor Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-500">
              View and manage all investor accounts and their portfolio data.
            </p>
            <Button className="w-full" asChild>
              <Link to="/admin-investors">Manage Investors</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Portfolio Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-500">
              Update investor portfolios and manage asset allocations.
            </p>
            <Button className="w-full" asChild>
              <Link to="/admin?tab=portfolios">Update Portfolios</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Yield Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-500">
              Configure yield rates and distribution settings for each asset.
            </p>
            <Button className="w-full" asChild>
              <Link to="/admin?tab=yields">Manage Yields</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
