import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useRecentInvestorTransactions, usePendingWithdrawalsCount, useLatestStatementSummary } from "@/features/investor/overview/hooks/useInvestorOverviewQueries";
import { usePerAssetStats, useAvailableStatementPeriods } from "@/features/investor/performance/hooks/useInvestorPerformance";
import { useRealtimeSubscription } from "@/hooks/data/shared/useRealtimeSubscription";
import { useAuth } from "@/services/auth";
import { useMemo } from "react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { Button, Skeleton } from "@/components/ui";
import { ArrowRight, Clock, TrendingUp, History, FileText, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { PageShell } from "@/components/layout/PageShell";
import { formatInvestorNumber, formatInvestorAmount, getAssetLogo } from "@/utils/assets";

import { PerformanceCard } from "@/features/investor/performance/components/PerformanceCard";
import {
  PeriodSelector,
  PERIOD_LABELS,
  type PerformancePeriod,
} from "@/features/investor/performance/components/PeriodSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AssetStat = NonNullable<ReturnType<typeof usePerAssetStats>["data"]>["assets"][number];

function getPerformanceData(asset: AssetStat, period: PerformancePeriod) {
  const periodData = period === "mtd" ? asset.mtd : asset[period];
  return {
    beginningBalance: periodData?.beginningBalance || 0,
    additions: periodData?.additions || 0,
    redemptions: periodData?.redemptions || 0,
    netIncome: periodData?.netIncome || 0,
    endingBalance: periodData?.endingBalance || 0,
    rateOfReturn: periodData?.rateOfReturn || 0,
  };
}

export default function InvestorOverviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const [period, setPeriod] = useState<PerformancePeriod>("mtd");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>();

  const displayName = useMemo(() => {
    if (profile?.first_name) {
      return [profile.first_name, profile.last_name].filter(Boolean).join(" ");
    }
    const email = user?.email || "";
    if (!email) return "";
    const [local] = email.split("@");
    return local.charAt(0) + "***@" + email.split("@")[1];
  }, [profile, user]);

  const { data: assetStats, isLoading: isLoadingStats } = usePerAssetStats(selectedPeriodId);
  const { data: availablePeriods, isLoading: isLoadingPeriods } = useAvailableStatementPeriods();
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

  const isLoading = isLoadingStats || isLoadingTxs || isLoadingWithdrawals || isLoadingPeriods;

  const currentPeriodLabel =
    availablePeriods?.find((p) => p.id === selectedPeriodId)?.label ||
    availablePeriods?.[0]?.label ||
    null;

  return (
    <PageShell>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div>
          <p className="text-muted-foreground mt-1 text-sm">
            Welcome back, <span className="text-foreground font-semibold">{displayName}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-border/60 hover:bg-accent/30 hover:border-border text-muted-foreground"
            onClick={() => navigate("/investor/statements")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Statements
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)] border border-primary/20"
            onClick={() => navigate("/investor/transactions")}
          >
            <History className="h-4 w-4 mr-2" />
            Transaction History
          </Button>
        </div>
      </div>

      {/* Hero: Portfolio Balance Strip — Hormozi: make numbers UNDENIABLE */}
      <div
        className="rounded-2xl p-5 border"
        style={{
          background: "var(--glass-bg)",
          borderColor: "var(--glass-border)",
          boxShadow: "var(--shadow-glow-yield)",
        }}
      >
        {/* Total portfolio value — the single most important number */}
        {!isLoadingStats && assetStats?.assets && assetStats.assets.length > 0 && (
          <div className="mb-5 pb-4 border-b border-white/8">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1.5">
              Total Portfolio Value
            </p>
            <p
              className="text-4xl md:text-5xl font-bold tabular-nums tracking-tight leading-none"
              style={{ color: "hsl(var(--yield-gold))" }}
            >
              {(() => {
                let total = 0;
                for (const a of assetStats.assets) {
                  total += a.mtd?.endingBalance ?? a.ytd?.endingBalance ?? 0;
                }
                return formatInvestorAmount(total, assetStats.assets[0]?.assetSymbol ?? "USDT");
              })()}
            </p>
            {/* Yield-to-date — secondary metric, prominent but below the main number */}
            {(() => {
              let totalYieldMtd = 0;
              for (const a of assetStats.assets) {
                totalYieldMtd += a.mtd?.netIncome ?? 0;
              }
              if (totalYieldMtd > 0) {
                return (
                  <div className="mt-3 flex items-center gap-2">
                    <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold text-[10px]">
                      Yield MTD
                    </p>
                    <p
                      className="text-xl font-bold tabular-nums tracking-tight"
                      style={{ color: "hsl(var(--yield-neon))" }}
                    >
                      +
                      {formatInvestorAmount(
                        totalYieldMtd,
                        assetStats.assets[0]?.assetSymbol ?? "USDT"
                      )}
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            {assetStats.periodEndDate && (
              <p className="text-xs text-muted-foreground mt-1.5">
                as of{" "}
                {new Date(assetStats.periodEndDate).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-4">
          By Asset
        </p>
        {isLoadingStats ? (
          <div className="flex gap-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-48 rounded-xl" />
            ))}
          </div>
        ) : assetStats?.assets && assetStats.assets.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {assetStats.assets.map((asset) => {
              const balance = asset.mtd?.endingBalance ?? asset.ytd?.endingBalance ?? 0;
              const mtdIncome = asset.mtd?.netIncome ?? 0;
              const isPositive = mtdIncome > 0;
              return (
                <div
                  key={asset.assetSymbol}
                  className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/[0.08] hover:border-white/15 transition-all duration-150 group"
                >
                  <img
                    src={getAssetLogo(asset.assetSymbol)}
                    alt={asset.assetSymbol}
                    className="h-6 w-6 rounded-full ring-1 ring-white/10"
                  />
                  <div>
                    <p className="font-mono font-bold text-white text-base tabular-nums leading-tight">
                      {formatInvestorAmount(balance, asset.assetSymbol)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                        {asset.assetSymbol}
                      </span>
                      {isPositive && (
                        <span
                          className="text-[10px] font-mono font-bold"
                          style={{ color: "hsl(var(--yield-neon))" }}
                        >
                          +{formatInvestorAmount(mtdIncome, asset.assetSymbol)} MTD
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">No active positions</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border/30" />

      {isLoading ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Performance Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Period Selectors */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {availablePeriods && availablePeriods.length > 0 && (
                <Select
                  value={selectedPeriodId || availablePeriods[0]?.id || ""}
                  onValueChange={(v) => setSelectedPeriodId(v)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePeriods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <PeriodSelector value={period} onChange={setPeriod} />
            </div>

            {currentPeriodLabel && (
              <p className="text-sm text-muted-foreground">
                Showing {PERIOD_LABELS[period]} for {currentPeriodLabel}
              </p>
            )}

            {/* Performance Cards Grid */}
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : assetStats?.assets && assetStats.assets.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {assetStats.assets.map((asset) => (
                  <PerformanceCard
                    key={asset.fundName}
                    fundName={asset.assetSymbol}
                    period={period}
                    data={getPerformanceData(asset, period)}
                  />
                ))}
              </div>
            ) : (
              <div
                className="p-10 text-center rounded-2xl border border-dashed"
                style={{ borderColor: "var(--glass-border)" }}
              >
                <TrendingUp className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No active positions found.</p>
              </div>
            )}

            {assetStats?.periodEndDate && (
              <p className="text-xs text-muted-foreground text-center">
                As of{" "}
                {new Date(assetStats.periodEndDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          {/* Right Column: Recent Activity & Quick Stats */}
          <div className="space-y-5">
            {/* Latest Statement */}
            <div
              className="rounded-2xl p-5 border"
              style={{
                background: "var(--glass-bg)",
                borderColor: "var(--glass-border)",
              }}
            >
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Latest Statement
              </h3>
              {latestStatement ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground font-bold">{latestStatement.periodName}</p>
                  {latestStatement.funds.map((fund) => (
                    <div
                      key={fund.asset_code}
                      className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="flex items-center gap-2 min-w-0 mr-2">
                        <CryptoIcon symbol={fund.asset_code} className="h-4 w-4 shrink-0" />
                        <span className="text-sm text-muted-foreground truncate">
                          {fund.asset_code} Fund
                        </span>
                      </div>
                      <span className="text-sm font-mono text-foreground font-bold tabular-nums">
                        {formatInvestorNumber(fund.ending_balance)} {fund.asset_code}
                      </span>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-white/5"
                    onClick={() => navigate("/investor/statements")}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    View Statements
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No statements available yet</p>
              )}
            </div>

            {/* Quick Stats */}
            <div
              className="rounded-2xl p-5 border"
              style={{
                background: "var(--glass-bg)",
                borderColor: "var(--glass-border)",
              }}
            >
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div
                  className={cn(
                    "flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors duration-100",
                    pendingWithdrawals ? "cursor-pointer" : ""
                  )}
                  onClick={() => pendingWithdrawals && navigate("/investor/withdrawals")}
                >
                  <span className="text-sm text-muted-foreground">Pending Withdrawals</span>
                  {pendingWithdrawals ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/20">
                      {pendingWithdrawals} Pending
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  ) : (
                    <span
                      className="text-sm font-mono font-semibold flex items-center gap-1"
                      style={{ color: "hsl(var(--yield-neon))" }}
                    >
                      All Clear <ArrowRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div
              className="rounded-2xl p-5 border"
              style={{
                background: "var(--glass-bg)",
                borderColor: "var(--glass-border)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Recent Activity
                </h3>
              </div>

              <div className="space-y-2">
                {recentTransactions?.map((tx) => (
                  <div
                    key={tx.id}
                    className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all duration-100 cursor-pointer border border-transparent hover:border-white/5"
                    onClick={() => navigate("/investor/transactions")}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center border shrink-0",
                          String(tx.type) === "DEPOSIT" ||
                            String(tx.type) === "YIELD" ||
                            String(tx.type) === "FEE_CREDIT" ||
                            String(tx.type) === "IB_CREDIT" ||
                            String(tx.type) === "FIRST_INVESTMENT"
                            ? "bg-yield/10 border-yield/20 text-yield"
                            : String(tx.type) === "WITHDRAWAL" || String(tx.type) === "FEE"
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                              : "bg-primary/10 border-primary/20 text-primary"
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
                        <p className="text-sm font-semibold text-foreground capitalize leading-tight">
                          {tx.type.replace(/_/g, " ").toLowerCase()}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {format(new Date(tx.tx_date), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right min-w-0 ml-2">
                      <p
                        className={cn(
                          "text-sm font-mono font-bold truncate tabular-nums",
                          tx.type === "DEPOSIT" ||
                            tx.type === "YIELD" ||
                            tx.type === "FEE_CREDIT" ||
                            tx.type === "IB_CREDIT"
                            ? "text-[hsl(var(--yield-neon))]"
                            : "text-foreground"
                        )}
                      >
                        {tx.type === "DEPOSIT" ||
                        tx.type === "YIELD" ||
                        tx.type === "FEE_CREDIT" ||
                        tx.type === "IB_CREDIT"
                          ? "+"
                          : ""}
                        {formatInvestorNumber(tx.amount)}
                      </p>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <CryptoIcon symbol={tx.asset} className="h-3 w-3 shrink-0" />
                        <p className="text-[10px] text-muted-foreground font-bold uppercase truncate">
                          {tx.asset}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {(!recentTransactions || recentTransactions.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No recent activity
                  </div>
                )}

                <Button
                  variant="ghost"
                  className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5"
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
