import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatAssetValue } from "@/utils/kpiCalculations";
import { Loader2, TrendingUp, Calendar, Coins } from "lucide-react";

interface MonthlyReport {
  id: string;
  report_month: string;
  asset_code: string;
  opening_balance: number | null;
  closing_balance: number | null;
  additions: number | null;
  withdrawals: number | null;
  yield_earned: number | null;
}

const ASSET_LOGOS: Record<string, string> = {
  BTC: "https://storage.mlcdn.com/account_image/855106/HqTafY3UXNLyQctbIqje0qAv7BYiDI4MRVUhOKiT.png",
  ETH: "https://storage.mlcdn.com/account_image/855106/1LGif7hOOerx0K9BWZh0vRgg2QfRBoxBibwrQGW5.png",
  USDT: "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
};

const ASSET_NAMES: Record<string, string> = {
  BTC: "Bitcoin Yield Fund",
  ETH: "Ethereum Yield Fund",
  USDT: "USDT Yield Fund",
  USDC: "USDC Yield Fund",
  SOL: "Solana Yield Fund",
  EURC: "Euro Yield Fund",
};

export default function MyPerformanceHistory() {
  const [groupedReports, setGroupedReports] = useState<Record<string, MonthlyReport[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 2. Get Investor ID
      const { data: investor } = await supabase
        .from("investors")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (!investor) throw new Error("Investor profile not found");

      // 3. Fetch Monthly Reports (ALL assets)
      const { data, error } = await supabase
        .from("investor_monthly_reports")
        .select("*")
        .eq("investor_id", investor.id)
        .order("report_month", { ascending: false });

      if (error) throw error;

      // 4. Group by Asset
      const grouped = (data || []).reduce(
        (acc, report) => {
          const asset = report.asset_code;
          if (!acc[asset]) acc[asset] = [];
          acc[asset].push(report);
          return acc;
        },
        {} as Record<string, MonthlyReport[]>
      );

      setGroupedReports(grouped);
    } catch (error) {
      console.error("Error fetching performance:", error);
      toast({
        title: "Error",
        description: "Failed to load performance history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const assetKeys = Object.keys(groupedReports).sort();

  if (assetKeys.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground font-medium">No performance history found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your portfolio activity will appear here once available.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {assetKeys.map((assetCode) => (
        <Card
          key={assetCode}
          className="col-span-full overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow"
        >
          <CardHeader className="bg-muted/5 pb-4">
            <div className="flex items-center gap-3">
              {ASSET_LOGOS[assetCode] ? (
                <img
                  src={ASSET_LOGOS[assetCode]}
                  alt={assetCode}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Coins className="h-4 w-4 text-primary" />
                </div>
              )}
              <div>
                <CardTitle className="text-xl font-bold text-primary">
                  {ASSET_NAMES[assetCode] || `${assetCode} Yield Fund`}
                </CardTitle>
                <p className="text-sm text-muted-foreground font-mono">{assetCode}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[180px]">Month</TableHead>
                    <TableHead className="text-right">Opening Balance</TableHead>
                    <TableHead className="text-right">Additions</TableHead>
                    <TableHead className="text-right">Withdrawals</TableHead>
                    <TableHead className="text-right">Yield Earned</TableHead>
                    <TableHead className="text-right font-bold">Closing Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedReports[assetCode].map((report) => (
                    <TableRow key={report.id} className="hover:bg-muted/5">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(report.report_month).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAssetValue(report.opening_balance || 0, assetCode)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {report.additions && report.additions > 0 ? "+" : ""}
                        {formatAssetValue(report.additions || 0, assetCode)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {report.withdrawals && report.withdrawals > 0 ? "-" : ""}
                        {formatAssetValue(report.withdrawals || 0, assetCode)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-blue-600 font-semibold">
                        +{formatAssetValue(report.yield_earned || 0, assetCode)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold bg-muted/10">
                        {formatAssetValue(report.closing_balance || 0, assetCode)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
