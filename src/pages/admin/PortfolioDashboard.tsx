import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  TrendingUp,
  DollarSign,
  Coins,
  Image,
  Briefcase,
  AlertCircle,
  CheckCircle,
  Clock,
  Wallet,
  Building,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface PortfolioData {
  success: boolean;
  timestamp: string;
  totalValue: number;
  formatted: string;
  manualAssetsValue?: number;
  results: {
    consolidation: {
      totalValue: number;
      breakdown: {
        crypto: number;
        cash: number;
        nft: number;
      };
    };
    manualPriceUpdate?: {
      totalValue: number;
    };
  };
}

interface ConsolidatedAsset {
  symbol: string;
  name: string;
  type: string;
  totalAmount: number;
  totalValue: number;
  avgPrice: number;
  platforms: string[];
  holdings: Array<{
    platform: string;
    amount: number;
    value: number;
    price: number;
  }>;
}

const PortfolioDashboard: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [consolidatedData, setConsolidatedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    setLoading(true);
    try {
      // Fetch portfolio sync data
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portfolio-sync-all-v2`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setPortfolioData(data);
        setLastSync(new Date());
      }

      // Fetch consolidated portfolio data
      const consolidatedResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consolidate-portfolio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (consolidatedResponse.ok) {
        const consolidatedData = await consolidatedResponse.json();
        setConsolidatedData(consolidatedData);
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      await fetchPortfolioData();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  const totalValue = portfolioData?.totalValue || 0;
  const cryptoValue = portfolioData?.results?.consolidation?.breakdown?.crypto || 0;
  const cashValue = portfolioData?.results?.consolidation?.breakdown?.cash || 0;
  const nftValue = portfolioData?.results?.consolidation?.breakdown?.nft || 0;
  const manualValue = portfolioData?.manualAssetsValue || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Dashboard</h1>
          <p className="text-gray-600 mt-1">Indigo Fund Vision - Real-time Portfolio Overview</p>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Last sync: {format(lastSync, 'HH:mm:ss')}
            </div>
          )}
          <Button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? 'Syncing...' : 'Sync All'}
          </Button>
          {syncStatus === 'success' && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Updated
            </Badge>
          )}
        </div>
      </div>

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Portfolio Card */}
        <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-indigo-600 flex items-center justify-between">
              Total Portfolio Value
              <Briefcase className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalValue)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={100} className="h-2" />
              <span className="text-xs text-gray-500">100%</span>
            </div>
          </CardContent>
        </Card>

        {/* Crypto Assets Card */}
        <Card className="bg-gradient-to-br from-orange-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center justify-between">
              Crypto Assets
              <Coins className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(cryptoValue)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={(cryptoValue / totalValue) * 100} className="h-2" />
              <span className="text-xs text-gray-500">
                {totalValue > 0 ? ((cryptoValue / totalValue) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cash & Stablecoins Card */}
        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center justify-between">
              Cash & Stablecoins
              <DollarSign className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(cashValue)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={(cashValue / totalValue) * 100} className="h-2" />
              <span className="text-xs text-gray-500">
                {totalValue > 0 ? ((cashValue / totalValue) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* NFT Assets Card */}
        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-600 flex items-center justify-between">
              NFT Portfolio
              <Image className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(nftValue)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={(nftValue / totalValue) * 100} className="h-2" />
              <span className="text-xs text-gray-500">
                {totalValue > 0 ? ((nftValue / totalValue) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Platform Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {consolidatedData?.platformBreakdown && Object.entries(consolidatedData.platformBreakdown).map(([platform, data]: [string, any]) => (
                <div key={platform} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      platform === 'MANUAL' && "bg-blue-100",
                      platform === 'FORDEFI' && "bg-purple-100",
                      platform === 'OKX' && "bg-green-100",
                      platform === 'MEXC' && "bg-orange-100",
                      platform === 'MERCURY' && "bg-red-100",
                      platform === 'OPENSEA' && "bg-indigo-100"
                    )}>
                      {platform === 'MANUAL' && <Wallet className="h-5 w-5 text-blue-600" />}
                      {platform === 'FORDEFI' && <Building className="h-5 w-5 text-purple-600" />}
                      {(platform === 'OKX' || platform === 'MEXC') && <Coins className="h-5 w-5 text-green-600" />}
                      {platform === 'MERCURY' && <DollarSign className="h-5 w-5 text-red-600" />}
                      {platform === 'OPENSEA' && <Image className="h-5 w-5 text-indigo-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{platform}</p>
                      <p className="text-sm text-gray-500">{data.assets?.length || 0} assets</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(data.totalValue)}</p>
                    <p className="text-sm text-gray-500">
                      {totalValue > 0 ? ((data.totalValue / totalValue) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Assets</span>
              <Badge variant="secondary">{consolidatedData?.assetCount?.total || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Data Sources</span>
              <Badge variant="secondary">6 Active</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Manual Assets Value</span>
              <span className="font-semibold">{formatCurrency(manualValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sync Status</span>
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Healthy
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Consolidated Assets</CardTitle>
            <Tabs defaultValue="all" className="w-auto">
              <TabsList>
                <TabsTrigger value="all">All Assets</TabsTrigger>
                <TabsTrigger value="crypto">Crypto</TabsTrigger>
                <TabsTrigger value="stable">Stablecoins</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Avg Price</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">% of Portfolio</TableHead>
                  <TableHead>Platforms</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consolidatedData?.consolidatedAssets?.map((asset: ConsolidatedAsset) => (
                  <TableRow key={asset.symbol}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{asset.symbol}</p>
                        <p className="text-xs text-gray-500">{asset.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(asset.totalAmount, asset.symbol === 'BTC' ? 8 : 2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(asset.avgPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(asset.totalValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">
                        {totalValue > 0 ? ((asset.totalValue / totalValue) * 100).toFixed(2) : 0}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {[...new Set(asset.platforms)].map((platform) => (
                          <Badge key={platform} variant="secondary" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioDashboard;
