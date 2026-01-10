import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { 
  usePerAssetStats, 
  useRecentInvestorTransactions, 
  usePendingWithdrawalsCount, 
  useLastStatementPeriod,
  useRealtimeSubscription,
} from "@/hooks/data";
import { HoldingsByToken } from "@/components/investor/overview/HoldingsByToken";
import { QuickCards } from "@/components/investor/overview/QuickCards";
import { AssetPerformanceCard } from "@/components/common";
import { PageHeader } from "@/components/layout";
import { BarChart3 } from "lucide-react";

export default function InvestorOverviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: assetStats, isLoading: isLoadingStats } = usePerAssetStats();
  const { data: recentTransactions, isLoading: isLoadingTxs } = useRecentInvestorTransactions(5);
  const { data: pendingWithdrawals, isLoading: isLoadingWithdrawals } = usePendingWithdrawalsCount();
  const { data: lastPeriod } = useLastStatementPeriod();

  // Realtime subscriptions for instant updates
  useRealtimeSubscription({
    channel: "investor-overview-positions",
    table: "investor_positions",
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["per-asset-stats"] });
    },
  });

  useRealtimeSubscription({
    channel: "investor-overview-transactions",
    table: "transactions_v2",
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["investor-recent-transactions"] });
    },
  });

  useRealtimeSubscription({
    channel: "investor-overview-withdrawals",
    table: "withdrawal_requests",
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: ["investor-pending-withdrawals"] });
    },
  });

  // Build holdings from asset stats (token-denominated)
  const holdings = assetStats?.assets?.map((a) => ({
    symbol: a.assetSymbol,
    balance: a.mtd.endingBalance || 0,
    ytdReturn: a.ytd.rateOfReturn || 0,
  })) || [];

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
