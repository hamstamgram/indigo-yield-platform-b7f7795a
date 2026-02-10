import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePerAssetStats,
  useRecentInvestorTransactions,
  usePendingWithdrawalsCount,
  useLatestStatementSummary,
  useRealtimeSubscription,
} from "@/hooks/data";
import { useAuth } from "@/services/auth";
import { useMemo } from "react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { Button, Skeleton } from "@/components/ui";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  TrendingUp,
  Wallet,
  History,
  FileText,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { PageShell } from "@/components/layout/PageShell";

export default function InvestorOverviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const displayName = useMemo(() => {
    if (profile?.first_name) {
      return [profile.first_name, profile.last_name].filter(Boolean).join(" ");
    }
    const email = user?.email || "";
    if (!email) return "";
    const [local] = email.split("@");
    return local.charAt(0) + "***@" + email.split("@")[1];
  }, [profile, user]);

  const { data: assetStats, isLoading: isLoadingStats } = usePerAssetStats();
  const { data: recentTransactions, isLoading: isLoadingTxs } = useRecentInvestorTransactions(5);
  const { data: pendingWithdrawals, isLoading: isLoadingWithdrawals } =
    usePendingWithdrawalsCount();
  const { data: latestStatement } = useLatestStatementSummary();

  // Realtime subscriptions
  useRealtimeSubscription({
    channel: `investor-overview-positions-${user?.id}`,
    table: "investor_positions",
    filter: user?.id ? `investor_id=eq.${user.id}` : undefined,
    onChange: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.perAssetStats }),
  });

  useRealtimeSubscription({
    channel: `investor-overview-transactions-${user?.id}`,
    table: "transactions_v2",
    filter: user?.id ? `investor_id=eq.${user.id}` : undefined,
    onChange: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorRecentTransactions }),
  });

  const isLoading = isLoadingStats || isLoadingTxs || isLoadingWithdrawals;

  // Helpers for display
  const formatCurrency = (val: number, _asset: string) => {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
  };

  // Calculate totals across all assets (this is an approximation as assets are different currencies)
  // For the dashboard, we will display per-asset breakdowns primarily.

  return (
    <PageShell>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div>
          <p className="text-slate-400 mt-1 text-sm">
            Welcome back, <span className="text-white font-medium">{displayName}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="glass-panel border-white/10 hover:bg-white/5 text-slate-300"
            onClick={() => navigate("/investor/statements")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Statements
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] border border-indigo-400/20"
            onClick={() => navigate("/investor/transactions")}
          >
            <History className="h-4 w-4 mr-2" />
            Transaction History
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Asset Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Wallet className="h-5 w-5 text-indigo-400" />
                My Assets
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {assetStats?.assets?.map((asset) => (
                <div
                  key={asset.assetSymbol}
                  className="glass-card rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent hover:border-indigo-500/30 transition-all group relative overflow-hidden cursor-pointer"
                  onClick={() => navigate("/investor/portfolio")}
                >
                  <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10 flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center p-2 shadow-inner">
                        <CryptoIcon
                          symbol={asset.assetSymbol}
                          className="w-full h-full text-white"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white">{asset.assetSymbol} Fund</h3>
                        <p className="text-xs text-slate-400 font-mono">{asset.fundName}</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                      <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-white" />
                    </div>
                  </div>

                  <div className="relative z-10 space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">
                        Total Balance
                      </p>
                      <p className="text-3xl font-mono font-bold text-white tracking-tight">
                        {formatCurrency(asset.mtd.endingBalance, asset.assetSymbol)}{" "}
                        <span className="text-lg text-slate-500">{asset.assetSymbol}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">
                          ITD Return
                        </p>
                        <p
                          className={cn(
                            "text-lg font-mono font-bold",
                            asset.itd.rateOfReturn > 0
                              ? "text-emerald-400"
                              : asset.itd.rateOfReturn < 0
                                ? "text-rose-400"
                                : "text-slate-500"
                          )}
                        >
                          {asset.itd.netIncome !== 0
                            ? `${asset.itd.rateOfReturn >= 0 ? "+" : ""}${asset.itd.rateOfReturn.toFixed(2)}%`
                            : "--"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">
                          ITD Earned
                        </p>
                        <p className="text-lg font-mono font-bold text-indigo-300">
                          {asset.itd.netIncome !== 0
                            ? formatCurrency(asset.itd.netIncome, asset.assetSymbol)
                            : "--"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(!assetStats?.assets || assetStats.assets.length === 0) && (
                <div className="col-span-2 glass-panel p-8 text-center rounded-3xl border-dashed border-white/10">
                  <p className="text-slate-400">No active positions found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Recent Activity & Quick Stats */}
          <div className="space-y-6">
            {/* Latest Statement */}
            <div className="glass-panel rounded-3xl p-6 border border-white/5 bg-indigo-500/5">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Latest Statement
              </h3>
              {latestStatement ? (
                <div className="space-y-3">
                  <p className="text-sm text-white font-bold">{latestStatement.periodName}</p>
                  {latestStatement.funds.map((fund) => (
                    <div
                      key={fund.asset_code}
                      className="flex justify-between items-center p-3 rounded-xl bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={fund.asset_code} className="h-4 w-4" />
                        <span className="text-sm text-slate-300">{fund.asset_code} Fund</span>
                      </div>
                      <span className="text-sm font-mono text-white font-bold">
                        {formatCurrency(fund.ending_balance, fund.asset_code)} {fund.asset_code}
                      </span>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-slate-400 hover:text-white hover:bg-white/5"
                    onClick={() => navigate("/investor/statements")}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    View Statements
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No statements available yet</p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="glass-panel rounded-3xl p-6 border border-white/5">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <span className="text-sm text-slate-300">Pending Withdrawals</span>
                  {pendingWithdrawals ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/20">
                      {pendingWithdrawals} Pending
                    </span>
                  ) : (
                    <span className="text-sm text-emerald-500 font-medium flex items-center gap-1">
                      All Clear <ArrowRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="glass-panel rounded-3xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Recent Activity
                </h3>
              </div>

              <div className="space-y-3">
                {recentTransactions?.map((tx) => (
                  <div
                    key={tx.id}
                    className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5"
                    onClick={() => navigate("/investor/transactions")}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center border",
                          tx.type === "DEPOSIT"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : tx.type === "WITHDRAWAL"
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                              : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                        )}
                      >
                        {tx.type === "DEPOSIT" ? (
                          <ArrowRight className="h-4 w-4 rotate-45" />
                        ) : tx.type === "WITHDRAWAL" ? (
                          <ArrowRight className="h-4 w-4 -rotate-45" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white capitalize">
                          {tx.type.toLowerCase()}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {format(new Date(tx.tx_date), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm font-mono font-bold",
                          tx.type === "DEPOSIT" ||
                            tx.type === "YIELD" ||
                            tx.type === "FEE_CREDIT" ||
                            tx.type === "IB_CREDIT"
                            ? "text-emerald-400"
                            : "text-white"
                        )}
                      >
                        {tx.type === "DEPOSIT" ||
                        tx.type === "YIELD" ||
                        tx.type === "FEE_CREDIT" ||
                        tx.type === "IB_CREDIT"
                          ? "+"
                          : ""}
                        {formatCurrency(Number(tx.amount), tx.asset)}
                      </p>
                      <div className="flex items-center gap-1 justify-end">
                        <CryptoIcon symbol={tx.asset} className="h-3 w-3" />
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{tx.asset}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {(!recentTransactions || recentTransactions.length === 0) && (
                  <div className="text-center py-6 text-slate-500 text-sm">No recent activity</div>
                )}

                <Button
                  variant="ghost"
                  className="w-full mt-2 text-xs text-slate-400 hover:text-white hover:bg-white/5"
                  onClick={() => navigate("/investor/transactions")}
                >
                  View All History
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
