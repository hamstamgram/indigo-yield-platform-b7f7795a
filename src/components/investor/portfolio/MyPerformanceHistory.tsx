import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatAssetValue } from "@/utils/kpiCalculations";
import { Loader2, TrendingUp, Calendar } from "lucide-react";

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
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("USDT");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Available assets - could be fetched dynamically, but hardcoded for now to match Admin
  const assets = ["USDT", "USDC", "BTC", "ETH", "SOL", "EURC"];

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedAsset]);

  const fetchPerformanceData = async () => {
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

      // 3. Fetch Monthly Reports
      const { data, error } = await supabase
        .from("investor_monthly_reports")
        .select("*")
        .eq("investor_id", investor.id)
        .eq("asset_code", selectedAsset)
        .order("report_month", { ascending: false });

      if (error) throw error;
      setMonthlyReports(data || []);
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
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Performance
            </CardTitle>
            <CardDescription>Your month-by-month asset tracking and yield history</CardDescription>
          </div>
          <div className="w-full md:w-48">
            <Label className="mb-2 block text-xs">Select Asset</Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset} value={asset}>
                    {asset === "USDC"
                      ? "Tokenized Gold (USDC)"
                      : asset === "USDT"
                        ? "Stablecoin Fund (USDT)"
                        : asset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {monthlyReports.length > 0 ? (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(report.report_month).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAssetValue(report.opening_balance || 0, selectedAsset)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      +{formatAssetValue(report.additions || 0, selectedAsset)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      -{formatAssetValue(report.withdrawals || 0, selectedAsset)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 font-semibold">
                      +{formatAssetValue(report.yield_earned || 0, selectedAsset)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatAssetValue(report.closing_balance || 0, selectedAsset)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground font-medium">No performance history found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Activity for{" "}
              {selectedAsset === "USDC"
                ? "Tokenized Gold"
                : selectedAsset === "USDT"
                  ? "Stablecoin Fund"
                  : selectedAsset}{" "}
              will appear here once available.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
