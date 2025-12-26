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
import { useToast } from "@/hooks";
import { supabase } from "@/integrations/supabase/client";
import { formatAssetAmount, getAssetLogo, getAssetName } from "@/utils/assets"; // Import utilities
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

      // 2. Fetch Performance Data (V2 with investor_id)
      const { data, error } = await supabase
        .from("investor_fund_performance")
        .select(`
          *,
          period:statement_periods (
            period_end_date
          )
        `)
        .eq("investor_id", user.id)
        .order("period(period_end_date)", { ascending: false });

      if (error) throw error;

      // 3. Map to MonthlyReport format
      const reports = (data || []).map((r: any) => ({
        id: r.id,
        report_month: r.period?.period_end_date,
        asset_code: r.fund_name,
        opening_balance: Number(r.mtd_beginning_balance || 0),
        closing_balance: Number(r.mtd_ending_balance || 0),
        additions: Number(r.mtd_additions || 0),
        withdrawals: Number(r.mtd_redemptions || 0),
        yield_earned: Number(r.mtd_net_income || 0),
      }));

      // 4. Group by Asset
      const grouped = reports.reduce(
        (acc: any, report: any) => {
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
              <img
                src={getAssetLogo(assetCode)}
                alt={assetCode}
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div>
                <CardTitle className="text-xl font-bold text-primary">
                  {getAssetName(assetCode) || `${assetCode} Yield Fund`}
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
                    <TableHead className="text-right">Rate of Return</TableHead>
                    <TableHead className="text-right font-bold">Closing Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedReports[assetCode].map((report) => {
                    // Calculate Rate of Return (Simplified Modified Dietz)
                    const netFlows = (report.additions || 0) - (report.withdrawals || 0);
                    const denominator = (report.opening_balance || 0) + netFlows / 2;
                    const rate =
                      denominator !== 0 ? ((report.yield_earned || 0) / denominator) * 100 : 0;

                    return (
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
                          {formatAssetAmount(report.opening_balance || 0, assetCode)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {report.additions && report.additions > 0 ? "+" : ""}
                          {formatAssetAmount(report.additions || 0, assetCode)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          {report.withdrawals && report.withdrawals > 0 ? "-" : ""}
                          {formatAssetAmount(report.withdrawals || 0, assetCode)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-600 font-semibold">
                          +{formatAssetAmount(report.yield_earned || 0, assetCode)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {rate.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold bg-muted/10">
                          {formatAssetAmount(report.closing_balance || 0, assetCode)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
