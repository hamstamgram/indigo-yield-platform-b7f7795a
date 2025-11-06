// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, TrendingUp, TrendingDown, Coins, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyYield {
  id: string;
  report_month: string;
  opening_balance: number;
  closing_balance: number;
  additions: number;
  withdrawals: number;
  yield_earned: number;
  rate_of_return: number;
}

interface AssetData {
  symbol: string;
  name: string;
  balance: number;
  price: number;
  usdValue: number;
  change24h: number;
  monthlyYields: MonthlyYield[];
}

const AssetDetail = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [assetData, setAssetData] = useState<AssetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssetData = async () => {
      if (!symbol) return;

      try {
        setLoading(true);

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("No authenticated user");

        // Get investor_id from profiles -> investors
        const { data: investorData, error: investorError } = await supabase
          .from("investors")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (investorError) throw investorError;
        if (!investorData) throw new Error("Investor profile not found");

        // Fetch monthly yield data from investor_monthly_reports
        const { data: monthlyReports, error: reportsError } = await supabase
          .from("investor_monthly_reports")
          .select("*")
          .eq("investor_id", investorData.id)
          .eq("asset_code", symbol.toUpperCase())
          .order("report_month", { ascending: false });

        if (reportsError) {
          console.error("Error fetching monthly reports:", reportsError);
        }

        // Calculate total balance (latest closing balance)
        const totalBalance = monthlyReports?.[0]?.closing_balance || 0;

        // Get asset info from database
        const { data: assetInfo, error: assetError } = await supabase
          .from("assets")
          .select("*")
          .eq("symbol", symbol.toUpperCase())
          .maybeSingle();

        if (assetError && assetError.code !== "PGRST116") {
          throw assetError;
        }

        const assetName = assetInfo?.name || symbol.toUpperCase();

        // For stablecoins, price is always 1
        const isStablecoin = ["USDT", "USDC", "EURC"].includes(symbol.toUpperCase());
        const price = isStablecoin ? 1 : 0; // TODO: Integrate with price oracle/API
        const usdValue = totalBalance * price;

        // Format monthly yields for display
        const monthlyYields: MonthlyYield[] =
          monthlyReports?.map((report) => {
            const rateOfReturn =
              report.opening_balance > 0 ? (report.yield_earned / report.opening_balance) * 100 : 0;
            return {
              id: report.id,
              report_month: report.report_month,
              opening_balance: parseFloat(report.opening_balance || "0"),
              closing_balance: parseFloat(report.closing_balance || "0"),
              additions: parseFloat(report.additions || "0"),
              withdrawals: parseFloat(report.withdrawals || "0"),
              yield_earned: parseFloat(report.yield_earned || "0"),
              rate_of_return: rateOfReturn,
            };
          }) || [];

        setAssetData({
          symbol: symbol.toUpperCase(),
          name: assetName,
          balance: totalBalance,
          price: price,
          usdValue: usdValue,
          change24h: 0, // TODO: Get from price feed
          monthlyYields,
        });
      } catch (err: unknown) {
        const error = err as Error;
        console.error("Error fetching asset data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssetData();
  }, [symbol]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-600">Error loading asset data: {error}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!assetData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Asset not found</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Asset Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Coins className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-2xl">{assetData.name}</CardTitle>
                  <CardDescription className="text-lg">{assetData.symbol}</CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  ${assetData.price?.toLocaleString() || "0"}
                </div>
                <div
                  className={`flex items-center gap-1 ${
                    assetData.change24h >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {assetData.change24h >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{assetData.change24h?.toFixed(2) || "0"}%</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Your Balance</div>
                <div className="text-xl font-semibold">
                  {assetData.balance?.toFixed(6) || "0.000000"}
                </div>
                <div className="text-sm text-muted-foreground">{assetData.symbol}</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Fund Value</div>
                <div className="text-xl font-semibold">
                  {assetData.balance?.toFixed(6) || "0.000000"} {assetData.symbol}
                </div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Current Price</div>
                <div className="text-xl font-semibold">
                  ${assetData.price?.toLocaleString() || "0"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Yield History */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Yield History</CardTitle>
            <CardDescription>
              Your monthly returns and performance for {assetData.symbol}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assetData.monthlyYields.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Opening Balance</TableHead>
                      <TableHead className="text-right">Additions</TableHead>
                      <TableHead className="text-right">Withdrawals</TableHead>
                      <TableHead className="text-right">Yield Earned</TableHead>
                      <TableHead className="text-right">Closing Balance</TableHead>
                      <TableHead className="text-right">Rate of Return</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetData.monthlyYields.map((yield_data) => (
                      <TableRow key={yield_data.id}>
                        <TableCell>
                          {new Date(yield_data.report_month).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {yield_data.opening_balance.toFixed(6)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          +{yield_data.additions.toFixed(6)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          -{yield_data.withdrawals.toFixed(6)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600 font-semibold">
                          +{yield_data.yield_earned.toFixed(6)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {yield_data.closing_balance.toFixed(6)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            yield_data.rate_of_return >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {yield_data.rate_of_return >= 0 ? "+" : ""}
                          {yield_data.rate_of_return.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                <p>No monthly yield data available for this asset yet.</p>
                <p className="text-sm mt-2">
                  Monthly statements will appear here once they are generated by the admin.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Info */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Information</CardTitle>
            <CardDescription>Your holdings and transaction history for this asset</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-5 w-5 text-blue-600" />
              <div className="text-sm text-blue-800">
                This fund operates using native {assetData.symbol} tokens for all positions and
                yield distributions. Performance and yields are calculated in {assetData.symbol}{" "}
                terms.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AssetDetail;
