/**
 * IB Dashboard
 * Dashboard for Introducing Brokers to view their earnings and referrals
 * All values are token-denominated (no USD conversion)
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
} from "@/components/ui";
import { Loader2, Coins, Users, TrendingUp } from "lucide-react";
import { getAssetLogo } from "@/utils/assets";
import { useIBAllocations, useIBReferralsForDashboard, useIBPositions } from "@/hooks/data/shared";
import type { Allocation, FundPosition, ReferralForDashboard } from "@/services/ib/ibService";

interface AssetEarning {
  asset: string;
  amount: number;
}

interface MonthlyEarning {
  month: string;
  byAsset: AssetEarning[];
}

// Format token amount with appropriate decimals
const formatTokenAmount = (val: number, symbol: string) => {
  const decimals =
    symbol.toUpperCase() === "BTC"
      ? 8
      : ["ETH", "SOL", "XRP"].includes(symbol.toUpperCase())
        ? 6
        : 2;

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  }).format(val);
};

export default function IBDashboard() {
  const { data: allocations, isLoading: allocationsLoading } = useIBAllocations();
  const { data: referrals, isLoading: referralsLoading } = useIBReferralsForDashboard();
  const { data: positions, isLoading: positionsLoading } = useIBPositions();

  // Calculate totals by asset
  const earningsByAsset: Record<string, number> = {};
  allocations?.forEach((a: Allocation) => {
    const asset = a.fundAsset;
    earningsByAsset[asset] = (earningsByAsset[asset] || 0) + a.ibFeeAmount;
  });

  const totalReferrals = referrals?.length || 0;

  // Position totals by asset
  const positionsByAsset: Record<string, number> = {};
  positions?.forEach((p: FundPosition) => {
    positionsByAsset[p.asset] = (positionsByAsset[p.asset] || 0) + p.currentValue;
  });

  // Monthly earnings by asset
  const monthlyEarnings: MonthlyEarning[] = [];
  if (allocations) {
    const byMonth: Record<string, Record<string, number>> = {};
    allocations.forEach((a: Allocation) => {
      if (a.periodEnd) {
        const month = a.periodEnd.substring(0, 7);
        if (!byMonth[month]) byMonth[month] = {};
        byMonth[month][a.fundAsset] = (byMonth[month][a.fundAsset] || 0) + a.ibFeeAmount;
      }
    });
    Object.entries(byMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12)
      .forEach(([month, assets]) => {
        monthlyEarnings.push({
          month,
          byAsset: Object.entries(assets).map(([asset, amount]) => ({ asset, amount })),
        });
      });
  }

  const isLoading = allocationsLoading || referralsLoading || positionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
            IB Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Track your referrals, earnings, and fund positions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="glass-panel hover:bg-white/10">
            Download Report
          </Button>
        </div>
      </div>

      {/* Stats Cards - Glass Blocks */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Total Earnings by Asset */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 backdrop-blur-md p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-50">
            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Coins className="h-6 w-6" />
            </div>
          </div>

          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
            Total Earnings
          </h3>

          <div className="space-y-4 relative z-10">
            {Object.keys(earningsByAsset).length === 0 ? (
              <p className="text-muted-foreground text-sm italic">No earnings yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(earningsByAsset).map(([asset, amount]) => (
                  <div key={asset} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={getAssetLogo(asset)}
                        alt={asset}
                        className="h-6 w-6 rounded-full shadow-sm"
                      />
                      <span className="text-sm font-medium text-muted-foreground">{asset}</span>
                    </div>
                    <span className="text-xl font-mono font-bold text-foreground">
                      {formatTokenAmount(amount, asset)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-indigo-400/60 mt-4 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Lifetime IB commissions
          </p>
        </div>

        {/* Referrals */}
        <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Active Referrals
            </h3>
            <Users className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>

          <div className="text-4xl font-display font-bold text-foreground mb-2 group-hover:scale-105 transition-transform origin-left">
            {totalReferrals}
          </div>
          <p className="text-xs text-muted-foreground">Investors referred to platform</p>
        </div>

        {/* Fund Positions by Asset */}
        <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Fund Positions
            </h3>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>

          {Object.keys(positionsByAsset).length === 0 ? (
            <p className="text-muted-foreground text-sm">No active positions</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(positionsByAsset).map(([asset, amount]) => (
                <div
                  key={asset}
                  className="flex items-center justify-between border-b border-border/30 pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <img src={getAssetLogo(asset)} alt={asset} className="h-5 w-5 rounded-full" />
                    <span className="text-sm font-medium text-muted-foreground">{asset}</span>
                  </div>
                  <span className="text-lg font-mono font-bold text-foreground">
                    {formatTokenAmount(amount, asset)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Referrals Table - Glass */}
        <div className="rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-muted/10">
            <h3 className="font-display font-bold text-lg">Your Referrals</h3>
            <p className="text-sm text-muted-foreground">Network performance statistics</p>
          </div>
          <div className="p-0">
            {!referrals || referrals.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No referrals yet</div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-b border-border/50">
                    <TableHead className="pl-6">Investor</TableHead>
                    <TableHead className="text-right pr-6">Commission %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(referrals as ReferralForDashboard[]).map((ref) => (
                    <TableRow key={ref.id} className="border-b border-border/30 hover:bg-muted/20">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {(ref.first_name?.[0] || ref.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {ref.first_name || ref.last_name
                                ? `${ref.first_name || ""} ${ref.last_name || ""}`.trim()
                                : ref.email.split("@")[0]}
                            </p>
                            <p className="text-xs text-muted-foreground opacity-70">{ref.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge
                          variant="secondary"
                          className="font-mono bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          {ref.ib_percentage || 0}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Monthly Earnings - Glass */}
        <div className="rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-muted/10">
            <h3 className="font-display font-bold text-lg">Monthly Earnings</h3>
            <p className="text-sm text-muted-foreground">Commission payouts over time</p>
          </div>
          <div className="p-0">
            {monthlyEarnings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No earnings data available
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-b border-border/50">
                    <TableHead className="pl-6">Month</TableHead>
                    <TableHead className="text-right pr-6">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyEarnings.map((me) => (
                    <TableRow
                      key={me.month}
                      className="border-b border-border/30 hover:bg-muted/20"
                    >
                      <TableCell className="pl-6 font-medium text-foreground">{me.month}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex flex-col items-end gap-1.5">
                          {me.byAsset.map(({ asset, amount }) => (
                            <div key={asset} className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-foreground/80">
                                {formatTokenAmount(amount, asset)} {asset}
                              </span>
                              <img
                                src={getAssetLogo(asset)}
                                alt={asset}
                                className="h-4 w-4 rounded-full opacity-80"
                              />
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* Recent Allocations */}
      <div className="rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-border/50 bg-muted/10 flex justify-between items-center">
          <div>
            <h3 className="font-display font-bold text-lg">Recent Allocations</h3>
            <p className="text-sm text-muted-foreground">Live commission feed</p>
          </div>
          <Badge
            variant="outline"
            className="animate-pulse bg-green-500/10 text-green-600 border-green-500/20"
          >
            Live
          </Badge>
        </div>

        {!allocations || allocations.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground italic">
            No allocations recorded yet
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-b border-border/50">
                <TableHead className="pl-6">Period</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Base Net Income</TableHead>
                <TableHead className="text-center">Rate</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="pr-6 text-right">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(allocations as Allocation[]).slice(0, 20).map((alloc) => (
                <TableRow key={alloc.id} className="border-b border-border/30 hover:bg-muted/20">
                  <TableCell className="pl-6 text-muted-foreground text-xs">
                    {alloc.periodStart && alloc.periodEnd
                      ? `${alloc.periodStart} • ${alloc.periodEnd}`
                      : alloc.createdAt?.split("T")[0]}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <img
                        src={getAssetLogo(alloc.fundAsset)}
                        alt={alloc.fundAsset}
                        className="h-5 w-5 rounded-full"
                      />
                      <span className="font-medium">{alloc.fundAsset}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {formatTokenAmount(alloc.sourceNetIncome, alloc.fundAsset)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-background/50">
                      {alloc.ibPercentage}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-green-600 dark:text-green-400">
                    +{formatTokenAmount(alloc.ibFeeAmount, alloc.fundAsset)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Badge
                      variant={alloc.source === "from_platform_fees" ? "secondary" : "outline"}
                      className="text-[10px]"
                    >
                      {alloc.source === "from_platform_fees" ? "Platform Fee" : "Yield Share"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Fund Positions - Compact Table */}
      {positions && positions.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-muted/10">
            <h3 className="font-display font-bold text-lg">Fund Positions</h3>
          </div>
          <Table>
            <TableBody>
              {(positions as FundPosition[]).map((pos) => (
                <TableRow
                  key={pos.fundId}
                  className="border-b border-border/30 hover:bg-muted/20 last:border-0"
                >
                  <TableCell className="font-medium pl-6 text-base">{pos.fundName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <img
                        src={getAssetLogo(pos.asset)}
                        alt={pos.asset}
                        className="h-5 w-5 rounded-full"
                      />
                      <span className="text-muted-foreground">{pos.asset}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-lg pr-6">
                    {formatTokenAmount(pos.currentValue, pos.asset)} {pos.asset}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
