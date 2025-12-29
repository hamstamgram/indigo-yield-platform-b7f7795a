/**
 * IB Dashboard
 * Dashboard for Introducing Brokers to view their earnings and referrals
 * All values are token-denominated (no USD conversion)
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coins, Users, TrendingUp } from "lucide-react";
import { getAssetLogo } from "@/utils/assets";
import {
  useIBAllocations,
  useIBReferralsForDashboard,
  useIBPositions,
} from "@/hooks/data/shared";
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
  const decimals = symbol.toUpperCase() === 'BTC' ? 8 
    : ['ETH', 'SOL', 'XRP'].includes(symbol.toUpperCase()) ? 6 
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">IB Dashboard</h1>
        <p className="text-muted-foreground">
          Track your referrals, earnings, and fund positions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Earnings by Asset */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {Object.keys(earningsByAsset).length === 0 ? (
              <p className="text-muted-foreground text-sm">No earnings yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(earningsByAsset).map(([asset, amount]) => (
                  <div key={asset} className="flex items-center gap-2">
                    <img 
                      src={getAssetLogo(asset)} 
                      alt={asset}
                      className="h-5 w-5 rounded-full"
                    />
                    <span className="text-lg font-bold font-mono">
                      {formatTokenAmount(amount, asset)} {asset}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">Lifetime IB commissions</p>
          </CardContent>
        </Card>

        {/* Referrals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrals}</div>
            <p className="text-xs text-muted-foreground">Investors you referred</p>
          </CardContent>
        </Card>

        {/* Fund Positions by Asset */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fund Positions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {Object.keys(positionsByAsset).length === 0 ? (
              <p className="text-muted-foreground text-sm">No positions</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(positionsByAsset).map(([asset, amount]) => (
                  <div key={asset} className="flex items-center gap-2">
                    <img 
                      src={getAssetLogo(asset)} 
                      alt={asset}
                      className="h-5 w-5 rounded-full"
                    />
                    <span className="text-lg font-bold font-mono">
                      {formatTokenAmount(amount, asset)} {asset}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">Current portfolio</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Referrals */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <CardDescription>Investors you've referred to the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {!referrals || referrals.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No referrals yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Commission %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(referrals as ReferralForDashboard[]).map((ref) => (
                    <TableRow key={ref.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {ref.first_name || ref.last_name
                              ? `${ref.first_name || ""} ${ref.last_name || ""}`.trim()
                              : ref.email}
                          </p>
                          <p className="text-xs text-muted-foreground">{ref.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{ref.ib_percentage || 0}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Monthly Earnings */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Earnings</CardTitle>
            <CardDescription>Your commission earnings by month (token-denominated)</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyEarnings.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No earnings yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyEarnings.map((me) => (
                    <TableRow key={me.month}>
                      <TableCell>{me.month}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          {me.byAsset.map(({ asset, amount }) => (
                            <div key={asset} className="flex items-center gap-1.5">
                              <img 
                                src={getAssetLogo(asset)} 
                                alt={asset}
                                className="h-4 w-4 rounded-full"
                              />
                              <span className="font-mono text-sm">
                                {formatTokenAmount(amount, asset)} {asset}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Allocations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Allocations</CardTitle>
          <CardDescription>Detailed breakdown of your IB commissions (token-denominated)</CardDescription>
        </CardHeader>
        <CardContent>
          {!allocations || allocations.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No allocations yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Base Net Income</TableHead>
                  <TableHead className="text-center">Rate</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(allocations as Allocation[]).slice(0, 20).map((alloc) => (
                  <TableRow key={alloc.id}>
                    <TableCell>
                      {alloc.periodStart && alloc.periodEnd
                        ? `${alloc.periodStart} - ${alloc.periodEnd}`
                        : alloc.createdAt?.split("T")[0]}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <img 
                          src={getAssetLogo(alloc.fundAsset)} 
                          alt={alloc.fundAsset}
                          className="h-4 w-4 rounded-full"
                        />
                        <span>{alloc.fundAsset}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatTokenAmount(alloc.sourceNetIncome, alloc.fundAsset)} {alloc.fundAsset}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{alloc.ibPercentage}%</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-green-600">
                      +{formatTokenAmount(alloc.ibFeeAmount, alloc.fundAsset)} {alloc.fundAsset}
                    </TableCell>
                    <TableCell>
                      <Badge variant={alloc.source === "from_platform_fees" ? "secondary" : "outline"}>
                        {alloc.source === "from_platform_fees" ? "Platform Fees" : "Investor Yield"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fund Positions */}
      {positions && positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Fund Positions</CardTitle>
            <CardDescription>Your accumulated IB earnings invested in funds (token-denominated)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(positions as FundPosition[]).map((pos) => (
                  <TableRow key={pos.fundId}>
                    <TableCell className="font-medium">{pos.fundName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <img 
                          src={getAssetLogo(pos.asset)} 
                          alt={pos.asset}
                          className="h-4 w-4 rounded-full"
                        />
                        <span>{pos.asset}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatTokenAmount(pos.currentValue, pos.asset)} {pos.asset}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
