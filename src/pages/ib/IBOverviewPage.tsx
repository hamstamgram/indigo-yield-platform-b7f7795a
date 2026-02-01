/**
 * IB Overview Page
 * Shows commission summary, pending vs paid, and top referrals
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  PageLoadingSpinner,
} from "@/components/ui";
import { formatAssetAmount } from "@/utils/assets";
import { BarChart3, Users, Coins, TrendingUp, Sprout } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  useIBCommissionSummary,
  useIBTopReferrals,
  useIBReferralCount,
  useIBYieldOnBalance,
  type PeriodType,
} from "@/hooks/data/shared";
import type { CommissionSummary } from "@/services/ib/ibService";

// Helper to format commission totals for display
const formatCommissionTotals = (summary: CommissionSummary[]): string => {
  if (!summary || summary.length === 0) return "No commissions";
  return summary.map((s) => formatAssetAmount(s.totalAmount, s.asset)).join(", ");
};

const formatPendingTotals = (summary: CommissionSummary[]): string => {
  if (!summary || summary.length === 0) return "No pending";
  const pending = summary.filter((s) => s.pendingAmount > 0);
  if (pending.length === 0) return "All paid";
  return pending.map((s) => formatAssetAmount(s.pendingAmount, s.asset)).join(", ");
};

export default function IBOverviewPage() {
  const [period, setPeriod] = useState<PeriodType>("ALL");

  const { data: commissionSummary, isLoading: summaryLoading } = useIBCommissionSummary(period);
  const { data: topReferrals, isLoading: referralsLoading } = useIBTopReferrals(period);
  const { data: referralCount } = useIBReferralCount();
  const { data: yieldOnBalance } = useIBYieldOnBalance();

  if (summaryLoading || referralsLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">Your IB commission summary</p>
        </div>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
          <TabsList>
            <TabsTrigger value="MTD">MTD</TabsTrigger>
            <TabsTrigger value="QTD">QTD</TabsTrigger>
            <TabsTrigger value="YTD">YTD</TabsTrigger>
            <TabsTrigger value="ALL">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralCount}</div>
            <p className="text-xs text-muted-foreground">Active investors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-mono">
              {formatPendingTotals(commissionSummary || [])}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Period Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-mono">
              {formatCommissionTotals(commissionSummary || [])}
            </div>
            <p className="text-xs text-muted-foreground">Total for {period}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yield on Balance</CardTitle>
            <Sprout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-mono">
              {yieldOnBalance && Object.keys(yieldOnBalance).length > 0
                ? Object.entries(yieldOnBalance)
                    .map(([asset, amount]) => formatAssetAmount(amount, asset))
                    .join(", ")
                : "No yield yet"}
            </div>
            <p className="text-xs text-muted-foreground">Earned on commission balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Commissions by Token */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Commissions by Token
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commissionSummary && commissionSummary.length > 0 ? (
            <div className="space-y-4">
              {commissionSummary.map((summary) => (
                <div
                  key={summary.asset}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CryptoIcon symbol={summary.asset} className="h-8 w-8" />
                    <div>
                      <p className="font-medium">{summary.asset}</p>
                      <p className="text-sm text-muted-foreground">
                        Pending: {formatAssetAmount(summary.pendingAmount, summary.asset)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold flex items-center justify-end gap-2">
                      <CryptoIcon symbol={summary.asset} className="h-5 w-5" />
                      {formatAssetAmount(summary.totalAmount, summary.asset)}
                    </p>
                    <p className="text-sm text-green-600">
                      Paid: {formatAssetAmount(summary.paidAmount, summary.asset)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No commissions earned in this period
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Referrals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Referrals by Commission
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topReferrals && topReferrals.length > 0 ? (
            <div className="space-y-2">
              {topReferrals.map((referral, index) => (
                <div
                  key={referral.investorId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-medium">#{index + 1}</span>
                    <span className="font-medium">{referral.investorName}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {Object.entries(referral.totalCommissions).map(([asset, amount]) => (
                      <span
                        key={asset}
                        className="text-sm font-medium bg-muted px-2 py-1 rounded flex items-center gap-1.5"
                      >
                        <CryptoIcon symbol={asset} className="h-4 w-4" />
                        {formatAssetAmount(amount, asset)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No referral commissions in this period
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
