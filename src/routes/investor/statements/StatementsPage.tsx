import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Calendar, TrendingUp, Info, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const StatementsPage = () => {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedAsset, setSelectedAsset] = useState<string>("all");

  // Fetch user's statements from investor_monthly_reports
  const {
    data: statements,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["monthly-statements", selectedYear, selectedAsset],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Get investor record
      const { data: investor } = await supabase
        .from("investors")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!investor) throw new Error("No investor record found");

      let query = supabase
        .from("investor_monthly_reports")
        .select("*")
        .eq("investor_id", investor.id)
        .gte("report_month", `${selectedYear}-01-01`)
        .lte("report_month", `${selectedYear}-12-31`)
        .order("report_month", { ascending: false });

      if (selectedAsset !== "all") {
        query = query.eq("asset_code", selectedAsset);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform data to match old format
      return (data || []).map((record) => ({
        id: record.id,
        period_year: parseInt(record.report_month.substring(0, 4)),
        period_month: parseInt(record.report_month.substring(5, 7)),
        asset_code: record.asset_code,
        begin_balance: record.opening_balance?.toString() || "0",
        additions: record.additions?.toString() || "0",
        redemptions: record.withdrawals?.toString() || "0",
        net_income: record.yield_earned?.toString() || "0",
        end_balance: record.closing_balance?.toString() || "0",
        rate_of_return_mtd:
          record.yield_earned && record.opening_balance
            ? (
                (parseFloat(record.yield_earned.toString()) /
                  parseFloat(record.opening_balance.toString())) *
                100
              ).toFixed(4)
            : "0",
      }));
    },
  });

  // Fetch available years from investor_monthly_reports
  const { data: availableYears } = useQuery({
    queryKey: ["statement-years"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Get investor record
      const { data: investor } = await supabase
        .from("investors")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!investor) return [new Date().getFullYear()];

      const { data, error } = await supabase
        .from("investor_monthly_reports")
        .select("report_month")
        .eq("investor_id", investor.id)
        .order("report_month", { ascending: false });

      if (error) throw error;

      // Extract unique years from report_month (YYYY-MM-DD)
      const uniqueYears = Array.from(
        new Set(data?.map((s) => parseInt(s.report_month.substring(0, 4))) || [])
      );
      return uniqueYears.length > 0 ? uniqueYears : [new Date().getFullYear()];
    },
  });

  // Fetch available assets from investor_monthly_reports
  const { data: availableAssets } = useQuery({
    queryKey: ["statement-assets"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Get investor record
      const { data: investor } = await supabase
        .from("investors")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!investor) return [];

      const { data, error } = await supabase
        .from("investor_monthly_reports")
        .select("asset_code")
        .eq("investor_id", investor.id);

      if (error) throw error;

      // Get unique asset codes
      const uniqueAssets = Array.from(new Set(data?.map((s) => s.asset_code) || []));
      return uniqueAssets;
    },
  });

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleString("default", { month: "long" });
  };

  const formatAssetAmount = (value: number, assetCode: string): string => {
    const assetConfig: Record<string, { decimals: number; symbol: string }> = {
      BTC: { decimals: 8, symbol: "BTC" },
      ETH: { decimals: 8, symbol: "ETH" },
      SOL: { decimals: 6, symbol: "SOL" },
      USDT: { decimals: 2, symbol: "USD" },
      USDC: { decimals: 2, symbol: "USD" },
      EURC: { decimals: 2, symbol: "EURC" }, // NOT $ symbol - native currency
    };

    const config = assetConfig[assetCode] || { decimals: 4, symbol: assetCode };

    return `${value.toLocaleString("en-US", {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    })} ${config.symbol}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Monthly Statements
        </h1>
        <p className="text-muted-foreground">Access your monthly investment statements</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Statements</CardTitle>
          <CardDescription>Select year and asset to view specific statements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {/* Year Filter */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears?.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Asset Filter */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Asset</label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  {availableAssets?.map((asset) => (
                    <SelectItem key={asset} value={asset}>
                      {asset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statements List */}
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error loading statements: {error.message}</AlertDescription>
        </Alert>
      ) : statements && statements.length > 0 ? (
        <div className="space-y-4">
          {statements.map((statement) => (
            <Card key={statement.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">
                        {getMonthName(statement.period_month)} {statement.period_year}
                      </h3>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {statement.asset_code}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Beginning Balance</p>
                        <p className="text-sm font-medium">
                          {formatAssetAmount(
                            parseFloat(statement.begin_balance),
                            statement.asset_code
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Additions</p>
                        <p className="text-sm font-medium text-green-600">
                          +
                          {formatAssetAmount(parseFloat(statement.additions), statement.asset_code)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Net Income</p>
                        <p className="text-sm font-medium text-blue-600">
                          +
                          {formatAssetAmount(
                            parseFloat(statement.net_income),
                            statement.asset_code
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ending Balance</p>
                        <p className="text-sm font-semibold">
                          {formatAssetAmount(
                            parseFloat(statement.end_balance),
                            statement.asset_code
                          )}
                        </p>
                      </div>
                    </div>

                    {statement.rate_of_return_mtd && (
                      <div className="mt-4 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          Return: {(parseFloat(statement.rate_of_return_mtd) * 100).toFixed(2)}% MTD
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-blue-50 rounded-full">
                  <Info className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium">No statements available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Statements are generated monthly. Your first statement will be available at the
                  end of your first full month of investment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Monthly Statements</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • Statements are generated on the first business day of each month for the previous
            month's activity
          </p>
          <p>
            • Each statement shows your beginning balance, additions, withdrawals, net income, and
            ending balance
          </p>
          <p>• You can download PDF versions of your statements for your records</p>
          <p>• If you have questions about a statement, please contact your administrator</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatementsPage;
