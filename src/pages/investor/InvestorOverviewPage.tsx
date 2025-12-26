import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePerAssetStats } from "@/hooks";
import { HoldingsByToken } from "@/components/investor/overview/HoldingsByToken";
import { QuickCards } from "@/components/investor/overview/QuickCards";
import { AssetPerformanceCard } from "@/components/common/AssetPerformanceCard";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import { BarChart3 } from "lucide-react";
import { QUERY_KEYS } from "@/constants/queryKeys";

export default function InvestorOverviewPage() {
  const navigate = useNavigate();
  const { data: assetStats, isLoading: isLoadingStats } = usePerAssetStats();

  // Build holdings from asset stats (token-denominated)
  const holdings = assetStats?.assets?.map((a) => ({
    symbol: a.assetSymbol,
    balance: a.mtd.endingBalance || 0,
    ytdReturn: a.ytd.rateOfReturn || 0,
  })) || [];

  // Fetch recent transactions (limit 5)
  const { data: recentTransactions, isLoading: isLoadingTxs } = useQuery({
    queryKey: QUERY_KEYS.recentTransactions,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("transactions_v2")
        .select("id, type, amount, asset, tx_date")
        .eq("investor_id", user.id)
        .eq("visibility_scope", "investor_visible")
        .order("tx_date", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch pending withdrawals count
  const { data: pendingWithdrawals, isLoading: isLoadingWithdrawals } = useQuery({
    queryKey: QUERY_KEYS.pendingWithdrawalsCount,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from("withdrawal_requests")
        .select("*", { count: "exact", head: true })
        .eq("investor_id", user.id)
        .in("status", ["pending", "processing"]);

      if (error) throw error;
      return count || 0;
    },
  });

  // Get last statement period name
  const { data: lastPeriod } = useQuery({
    queryKey: QUERY_KEYS.lastStatementPeriod,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("investor_fund_performance")
        .select("period:statement_periods(period_name)")
        .eq("investor_id", user.id)
        .eq("purpose", "reporting")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) return null;
      return (data?.period as any)?.period_name || null;
    },
  });

  const isLoading = isLoadingStats || isLoadingTxs || isLoadingWithdrawals;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 px-4 md:px-6 lg:px-0">
      <PageHeader
        title="Overview"
        subtitle="Your portfolio at a glance"
        icon={BarChart3}
      />

      {/* Holdings by Token */}
      <HoldingsByToken holdings={holdings} isLoading={isLoadingStats} />

      {/* Quick Cards */}
      <QuickCards
        lastStatementPeriod={lastPeriod || undefined}
        recentTransactions={recentTransactions}
        pendingWithdrawalsCount={pendingWithdrawals || 0}
        isLoading={isLoading}
      />

      {/* Per-Asset Position Cards */}
      {!isLoadingStats && assetStats?.assets && assetStats.assets.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-display font-bold tracking-tight">
            My Positions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assetStats.assets.map((asset) => (
              <AssetPerformanceCard
                key={asset.fundName}
                data={asset}
                compact
                onClick={() => navigate(`/funds/${asset.fundName}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
