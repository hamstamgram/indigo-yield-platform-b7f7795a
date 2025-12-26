/**
 * IB Overview Page
 * Shows commission summary, pending vs paid, and top referrals
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAssetAmount } from "@/utils/assets";
import { PageLoadingSpinner } from "@/components/ui/loading-spinner";
import { BarChart3, Users, Coins, TrendingUp } from "lucide-react";
import { startOfMonth, startOfQuarter, startOfYear, format, subMonths } from "date-fns";
import { QUERY_KEYS } from "@/constants/queryKeys";

type PeriodType = "MTD" | "QTD" | "YTD" | "ALL";

interface CommissionSummary {
  asset: string;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
}

// Helper to format commission totals for display
const formatCommissionTotals = (summary: CommissionSummary[]): string => {
  if (!summary || summary.length === 0) return "No commissions";
  return summary.map(s => formatAssetAmount(s.totalAmount, s.asset)).join(", ");
};

const formatPendingTotals = (summary: CommissionSummary[]): string => {
  if (!summary || summary.length === 0) return "No pending";
  const pending = summary.filter(s => s.pendingAmount > 0);
  if (pending.length === 0) return "All paid";
  return pending.map(s => formatAssetAmount(s.pendingAmount, s.asset)).join(", ");
};

interface TopReferral {
  investorId: string;
  investorName: string;
  totalCommissions: Record<string, number>;
}

export default function IBOverviewPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodType>("MTD");

  const getPeriodStartDate = (periodType: PeriodType): Date | null => {
    const now = new Date();
    switch (periodType) {
      case "MTD":
        return startOfMonth(now);
      case "QTD":
        return startOfQuarter(now);
      case "YTD":
        return startOfYear(now);
      case "ALL":
        return null;
    }
  };

  // Fetch commission summary by token
  const { data: commissionSummary, isLoading: summaryLoading } = useQuery({
    queryKey: QUERY_KEYS.ibCommissions(user?.id, undefined, period),
    queryFn: async () => {
      if (!user?.id) return [];

      const startDate = getPeriodStartDate(period);
      
      let query = supabase
        .from("ib_allocations")
        .select(`
          id,
          ib_fee_amount,
          fund_id,
          effective_date,
          payout_status,
          funds!inner(asset)
        `)
        .eq("ib_investor_id", user.id);

      if (startDate) {
        query = query.gte("effective_date", format(startDate, "yyyy-MM-dd"));
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching commission summary:", error);
        return [];
      }

      // Group by asset with proper pending/paid tracking
      const byAsset: Record<string, { total: number; pending: number; paid: number }> = {};
      
      for (const allocation of data || []) {
        const asset = (allocation.funds as any)?.asset;
        if (!asset) continue; // Skip allocations with missing fund data
        if (!byAsset[asset]) {
          byAsset[asset] = { total: 0, pending: 0, paid: 0 };
        }
        const amount = Number(allocation.ib_fee_amount);
        byAsset[asset].total += amount;
        // Use actual payout_status from database
        if ((allocation as any).payout_status === 'paid') {
          byAsset[asset].paid += amount;
        } else {
          byAsset[asset].pending += amount;
        }
      }

      return Object.entries(byAsset).map(([asset, data]) => ({
        asset,
        totalAmount: data.total,
        pendingAmount: data.pending,
        paidAmount: data.paid,
      })) as CommissionSummary[];
    },
    enabled: !!user?.id,
  });

  // Fetch top referrals by commission
  const { data: topReferrals, isLoading: referralsLoading } = useQuery({
    queryKey: QUERY_KEYS.ibTopReferrals(user?.id || "", period),
    queryFn: async () => {
      if (!user?.id) return [];

      const startDate = getPeriodStartDate(period);

      let query = supabase
        .from("ib_allocations")
        .select(`
          source_investor_id,
          ib_fee_amount,
          funds!inner(asset),
          profiles!ib_allocations_source_investor_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq("ib_investor_id", user.id);

      if (startDate) {
        query = query.gte("effective_date", format(startDate, "yyyy-MM-dd"));
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching top referrals:", error);
        return [];
      }

      // Group by investor
      const byInvestor: Record<string, { name: string; commissions: Record<string, number> }> = {};

      for (const allocation of data || []) {
        const investorId = allocation.source_investor_id;
        const profile = allocation.profiles as any;
        const asset = (allocation.funds as any)?.asset;
        if (!asset) continue; // Skip allocations with missing fund data

        if (!byInvestor[investorId]) {
          const name = profile
            ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email
            : "Unknown";
          byInvestor[investorId] = { name, commissions: {} };
        }

        if (!byInvestor[investorId].commissions[asset]) {
          byInvestor[investorId].commissions[asset] = 0;
        }
        byInvestor[investorId].commissions[asset] += Number(allocation.ib_fee_amount);
      }

      // Sort by total commissions and take top 10
      return Object.entries(byInvestor)
        .map(([id, data]) => ({
          investorId: id,
          investorName: data.name,
          totalCommissions: data.commissions,
        }))
        .sort((a, b) => {
          const totalA = Object.values(a.totalCommissions).reduce((sum, v) => sum + v, 0);
          const totalB = Object.values(b.totalCommissions).reduce((sum, v) => sum + v, 0);
          return totalB - totalA;
        })
        .slice(0, 10) as TopReferral[];
    },
    enabled: !!user?.id,
  });

  // Fetch referral count
  const { data: referralCount } = useQuery({
    queryKey: QUERY_KEYS.ibReferralCount(user?.id || ""),
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("ib_parent_id", user.id);

      if (error) {
        console.error("Error fetching referral count:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id,
  });

  if (summaryLoading || referralsLoading) {
    return <PageLoadingSpinner />;
  }

  const totalCommissions = commissionSummary?.reduce((sum, c) => sum + c.totalAmount, 0) || 0;
  const pendingCommissions = commissionSummary?.reduce((sum, c) => sum + c.pendingAmount, 0) || 0;

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
      <div className="grid gap-4 md:grid-cols-3">
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
                <div key={summary.asset} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{summary.asset}</p>
                    <p className="text-sm text-muted-foreground">
                      Pending: {formatAssetAmount(summary.pendingAmount, summary.asset)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
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
                <div key={referral.investorId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-medium">#{index + 1}</span>
                    <span className="font-medium">{referral.investorName}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {Object.entries(referral.totalCommissions).map(([asset, amount]) => (
                      <span key={asset} className="text-sm font-medium bg-muted px-2 py-1 rounded">
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
