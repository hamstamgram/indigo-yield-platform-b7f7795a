import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, TrendingUp, Coins } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getAssetLogo, getAssetName } from "@/utils/assets";

export default function AdminFundDetailsPage() {
  const { assetId } = useParams();
  const assetCode = assetId?.toUpperCase() || "";

  const { data: fundStats, isLoading } = useQuery({
    queryKey: ["admin-fund-stats", assetCode],
    queryFn: async () => {
      // 1. Get all investors in this fund (latest performance record)
      // We need the latest period ID first
      const { data: periods } = await supabase
        .from("statement_periods")
        .select("id")
        .order("period_end_date", { ascending: false })
        .limit(1);
      
      const latestPeriodId = periods?.[0]?.id;
      if (!latestPeriodId) return { investors: [], totalAum: 0, totalYield: 0 };

      // Fetch performance records for this period + fund
      // Cast to any to avoid type depth issues
      const { data: records, error } = await (supabase as any)
        .from("investor_fund_performance")
        .select(`
          mtd_ending_balance,
          mtd_net_income,
          mtd_rate_of_return,
          investor_id,
          profiles:profiles (
            first_name,
            last_name,
            email
          )
        `)
        .eq("period_id", latestPeriodId)
        .eq("fund_name", assetCode);

      if (error) throw error;

      const investors = (records || []).map((r: any) => ({
        id: r.investor_id,
        name: `${r.profiles?.first_name || ""} ${r.profiles?.last_name || ""}`.trim() || r.profiles?.email,
        email: r.profiles?.email,
        balance: Number(r.mtd_ending_balance || 0),
        yield: Number(r.mtd_net_income || 0),
        roi: Number(r.mtd_rate_of_return || 0)
      })).sort((a: any, b: any) => b.balance - a.balance); // Sort by whale size

      const totalAum = investors.reduce((sum, i) => sum + i.balance, 0);
      const totalYield = investors.reduce((sum, i) => sum + i.yield, 0);

      return { investors, totalAum, totalYield };
    }
  });

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white border shadow-sm flex items-center justify-center p-2">
            <img 
              src={getAssetLogo(assetCode)} 
              alt={assetCode} 
              className="h-full w-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} 
            />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">{getAssetName(assetCode)} Fund</h1>
            <Badge variant="outline" className="mt-1">Active Strategy</Badge>
          </div>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total AUM</p>
                <p className="text-2xl font-mono font-bold mt-1">
                  {fundStats?.totalAum.toFixed(4)} <span className="text-sm text-muted-foreground">{assetCode}</span>
                </p>
              </div>
              <Coins className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Monthly Yield</p>
                <p className="text-2xl font-mono font-bold mt-1 text-green-600">
                  +{fundStats?.totalYield.toFixed(4)}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Investors</p>
                <p className="text-2xl font-mono font-bold mt-1">
                  {fundStats?.investors.length}
                </p>
              </div>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investor Composition Table */}
      <Card>
        <CardHeader>
          <CardTitle>Investor Composition</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investor</TableHead>
                <TableHead className="text-right">Balance ({assetCode})</TableHead>
                <TableHead className="text-right">Ownership %</TableHead>
                <TableHead className="text-right">MTD Yield</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fundStats?.investors.map((investor) => (
                <TableRow key={investor.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{investor.name}</div>
                      <div className="text-xs text-muted-foreground">{investor.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {investor.balance.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {fundStats.totalAum > 0 ? ((investor.balance / fundStats.totalAum) * 100).toFixed(2) : "0.00"}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-green-600">
                    +{investor.yield.toFixed(4)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
