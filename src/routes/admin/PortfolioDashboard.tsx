import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  DollarSign,
  Coins,
  Image,
  CheckCircle,
  Clock,
  Wallet,
  Building,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatAssetWithSymbol } from "@/utils/assetFormatting";

const PORTFOLIO_SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co";
const PORTFOLIO_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg";

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

interface PlatformBreakdownData {
  assets?: Array<Record<string, unknown>>;
  totalValue: number;
}

interface ConsolidatedData {
  consolidatedAssets?: ConsolidatedAsset[];
  platformBreakdown?: Record<string, PlatformBreakdownData>;
  assetCount?: {
    total: number;
  };
}

const PortfolioDashboard: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [_portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedData | null>(null);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    setLoading(true);
    try {
      // Fetch portfolio sync data from Indigo Fund Vision Supabase
      const response = await fetch(`${PORTFOLIO_SUPABASE_URL}/functions/v1/portfolio-sync-all-v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PORTFOLIO_SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPortfolioData(data);
        setLastSync(new Date());
      }

      // Fetch consolidated portfolio data from Indigo Fund Vision Supabase
      const consolidatedResponse = await fetch(
        `${PORTFOLIO_SUPABASE_URL}/functions/v1/consolidate-portfolio`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${PORTFOLIO_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (consolidatedResponse.ok) {
        const consolidatedData = await consolidatedResponse.json();
        setConsolidatedData(consolidatedData);
      }
    } catch (error) {
      console.error("Error fetching portfolio data:", error);
      setSyncStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus("syncing");
    try {
      await fetchPortfolioData();
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (error) {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * REMOVED: USD aggregation variables
   * Aggregating different assets into USD violates platform requirements.
   * Each asset must be displayed separately in its native currency.
   */

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
              Last sync: {format(lastSync, "HH:mm:ss")}
            </div>
          )}
          <Button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync All"}
          </Button>
          {syncStatus === "success" && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Updated
            </Badge>
          )}
        </div>
      </div>

      {/* Main Metrics Cards - Per Asset (Native Currency Only) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {consolidatedData?.consolidatedAssets?.map((asset: ConsolidatedAsset) => (
          <Card key={asset.symbol} className="border-2 bg-gradient-to-br from-indigo-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-indigo-600 flex items-center justify-between">
                {asset.name}
                <Coins className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-gray-900">
                {formatAssetWithSymbol(asset.totalAmount, asset.symbol)}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {asset.holdings.length} platform{asset.holdings.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Platform Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {consolidatedData?.platformBreakdown &&
                Object.entries(consolidatedData.platformBreakdown).map(
                  ([platform, data]: [string, PlatformBreakdownData]) => (
                    <div key={platform} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            platform === "MANUAL" && "bg-blue-100",
                            platform === "FORDEFI" && "bg-purple-100",
                            platform === "OKX" && "bg-green-100",
                            platform === "MEXC" && "bg-orange-100",
                            platform === "MERCURY" && "bg-red-100",
                            platform === "OPENSEA" && "bg-indigo-100"
                          )}
                        >
                          {platform === "MANUAL" && <Wallet className="h-5 w-5 text-blue-600" />}
                          {platform === "FORDEFI" && (
                            <Building className="h-5 w-5 text-purple-600" />
                          )}
                          {(platform === "OKX" || platform === "MEXC") && (
                            <Coins className="h-5 w-5 text-green-600" />
                          )}
                          {platform === "MERCURY" && (
                            <DollarSign className="h-5 w-5 text-red-600" />
                          )}
                          {platform === "OPENSEA" && <Image className="h-5 w-5 text-indigo-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{platform}</p>
                          <p className="text-sm text-gray-500">{data.assets?.length || 0} assets</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{data.assets?.length || 0} assets</p>
                      </div>
                    </div>
                  )
                )}
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
              <span className="text-sm text-gray-600">Total Assets</span>
              <Badge variant="secondary">{consolidatedData?.consolidatedAssets?.length || 0}</Badge>
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
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Platforms</TableHead>
                  <TableHead className="text-right">Holdings</TableHead>
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
                    <TableCell className="text-right font-medium">
                      {formatAssetWithSymbol(asset.totalAmount, asset.symbol)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {Array.from(new Set(asset.platforms)).slice(0, 3).map((platform) => (
                          <Badge key={platform} variant="secondary" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-gray-600">
                        {asset.holdings.length} holding{asset.holdings.length !== 1 ? "s" : ""}
                      </span>
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
