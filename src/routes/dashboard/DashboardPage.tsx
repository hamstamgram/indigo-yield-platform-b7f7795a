import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Layers, Activity, Calendar, Clock, Info, Coins } from "lucide-react"; // Added Coins
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state"; // Import

interface AssetPosition {
  fundName: string;
  assetCode: string;
  balance: number;
  yieldEarned: number; // All time yield
  openingBalance?: number;
  additions?: number;
  withdrawals?: number;
  mtdYield?: number;
}

export default function DashboardPage() {
  const { data: portfolio, isLoading: isLoadingPortfolio } = useQuery({
    queryKey: ["dashboard-portfolio"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Fetch positions
      const { data: positions, error } = await (supabase as any)
        .from("investor_positions")
        .select(
          `
          shares,
          total_yield_earned,
          funds ( name, asset_symbol, code )
        `
        )
        .eq("investor_id", user.id)
        .eq("status", "active");

      if (error) throw error;

      // Fetch reports for ledger details
      const { data: reports } = await (supabase as any)
        .from("investor_monthly_reports")
        .select("*")
        .eq("investor_id", user.id)
        .order("report_month", { ascending: false });

      return positions.map((pos: any) => {
        const rawAssetCode = pos.funds?.asset_symbol || pos.funds?.asset || "UNITS";
        const assetCode = rawAssetCode === "USDC" || rawAssetCode === "USDT" ? "USD" : rawAssetCode;
        // Get latest report for this asset to show "This Month's Activity"
        const latestReport = reports?.find((r: any) => r.asset_code === rawAssetCode);

        return {
          fundName: pos.funds?.name || "Unknown Fund",
          assetCode: assetCode,
          balance: Number(pos.shares) || 0,
          yieldEarned: Number(pos.total_yield_earned) || 0,
          // Ledger Data matching Report Columns
          openingBalance: latestReport ? Number(latestReport.opening_balance) : 0,
          additions: latestReport ? Number(latestReport.additions) : 0,
          withdrawals: latestReport ? Number(latestReport.withdrawals) : 0,
          mtdYield: latestReport ? Number(latestReport.yield_earned) : 0,
        } as AssetPosition;
      });
    },
  });

  // Aggregate stats
  const totalYieldAllTime = portfolio?.reduce((acc: number, curr: AssetPosition) => acc + curr.yieldEarned, 0) || 0;
  const totalYieldMonth = portfolio?.reduce((acc: number, curr: AssetPosition) => acc + (curr.mtdYield || 0), 0) || 0;
  const yieldUnitLabel = portfolio?.length === 1 ? portfolio[0].assetCode : "UNITS";

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 p-4 md:p-0">
      {" "}
      {/* Added padding */}
      {/* HERO: High Contrast Yield Display */}
      <section className="space-y-2">
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
          Performance
        </h1>
        <p className="text-muted-foreground">Capital Account Summary</p>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="dashboard-card border-l-4 border-l-primary bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Yield (Inception)
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-mono font-bold text-primary">
                    {totalYieldAllTime.toFixed(4)}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">{yieldUnitLabel}</span>
                </div>
              </div>
              <div className="p-2 bg-primary/10 rounded-full">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Total accumulated earnings across all funds.
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card border-l-4 border-l-green-500 bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Yield (This Month)
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-mono font-bold text-green-600">
                    +{totalYieldMonth.toFixed(4)}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">{yieldUnitLabel}</span>
                </div>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Net income generated in the current period.
            </p>
          </CardContent>
        </Card>
      </section>
      {/* LEDGER: Matches the Report PDF Structure */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight">Asset Ledgers</h2>

        {isLoadingPortfolio ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">
            Loading capital accounts...
          </div>
        ) : portfolio && portfolio.length > 0 ? (
          <div className="space-y-3">
            {portfolio.map((asset: AssetPosition, idx: number) => (
              <Accordion type="single" collapsible key={idx} className="w-full">
                <AccordionItem value={`item-${idx}`} className="border-none mb-2">
                  <Card className="dashboard-card border-0 bg-card hover:bg-accent/5 transition-all overflow-hidden">
                    <AccordionTrigger className="hover:no-underline px-6 py-5">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                            {asset.assetCode.substring(0, 1)}
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-base">{asset.fundName}</h3>
                            <p className="text-sm text-muted-foreground font-mono">
                              {asset.balance.toFixed(4)} {asset.assetCode}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="font-mono bg-green-50 text-green-700 border-green-200"
                        >
                          +{asset.mtdYield?.toFixed(4)} Yield
                        </Badge>
                      </div>
                    </AccordionTrigger>

                    {/* Expanded Ledger View - Matches Report Columns */}
                    <AccordionContent className="px-0 pb-0">
                      <div className="bg-muted/30 border-t border-border/50 px-6 py-6">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4 tracking-wider">
                          Capital Account Summary (MTD)
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase mb-1">
                              Beginning
                            </p>
                            <p className="font-mono font-medium">
                              {asset.openingBalance?.toFixed(4)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase mb-1">
                              Additions
                            </p>
                            <p className="font-mono font-medium text-green-600">
                              +{asset.additions?.toFixed(4)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase mb-1">
                              Redemptions
                            </p>
                            <p className="font-mono font-medium text-red-600">
                              {asset.withdrawals ? `-${asset.withdrawals.toFixed(4)}` : "0.0000"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase mb-1">
                              Net Income
                            </p>
                            <p className="font-mono font-bold text-blue-600">
                              +{asset.mtdYield?.toFixed(4)}
                            </p>
                          </div>
                          <div className="border-l pl-4 border-border/50">
                            <p className="text-[10px] text-foreground font-bold uppercase mb-1">
                              Ending Balance
                            </p>
                            <p className="font-mono font-bold text-lg">
                              {asset.balance.toFixed(4)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-dashed flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">
                            Reporting Period: Current Month
                          </p>
                          <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
                            <Link to="/statements">
                              View PDF Reports <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              </Accordion>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Coins}
            title="No Active Positions"
            description="You don't have any active investments yet. Contact your administrator to get started."
          />
        )}
      </section>
    </div>
  );
}
