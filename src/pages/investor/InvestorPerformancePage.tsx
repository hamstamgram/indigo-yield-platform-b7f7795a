import { useState } from "react";
import { usePerAssetStats, useAvailableStatementPeriods } from "@/hooks";
import {
  PeriodSelector,
  PERIOD_LABELS,
  PerformanceCard,
  type PerformancePeriod,
} from "@/components/investor";
import { EmptyState } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { TrendingUp, Loader2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InvestorPerformancePage() {
  const [period, setPeriod] = useState<PerformancePeriod>("mtd");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>();

  const { data: availablePeriods, isLoading: isLoadingPeriods } = useAvailableStatementPeriods();
  const { data: assetStats, isLoading: isLoadingStats } = usePerAssetStats(selectedPeriodId);

  const isLoading = isLoadingPeriods || isLoadingStats;

  type AssetStat = NonNullable<typeof assetStats>["assets"][number];
  const getPerformanceData = (asset: AssetStat) => {
    switch (period) {
      case "mtd":
        return {
          beginningBalance: asset.mtd.beginningBalance || 0,
          additions: asset.mtd.additions || 0,
          redemptions: asset.mtd.redemptions || 0,
          netIncome: asset.mtd.netIncome || 0,
          endingBalance: asset.mtd.endingBalance || 0,
          rateOfReturn: asset.mtd.rateOfReturn || 0,
        };
      case "qtd":
        return {
          beginningBalance: asset.qtd?.beginningBalance || 0,
          additions: asset.qtd?.additions || 0,
          redemptions: asset.qtd?.redemptions || 0,
          netIncome: asset.qtd?.netIncome || 0,
          endingBalance: asset.qtd?.endingBalance || 0,
          rateOfReturn: asset.qtd?.rateOfReturn || 0,
        };
      case "ytd":
        return {
          beginningBalance: asset.ytd?.beginningBalance || 0,
          additions: asset.ytd?.additions || 0,
          redemptions: asset.ytd?.redemptions || 0,
          netIncome: asset.ytd?.netIncome || 0,
          endingBalance: asset.ytd?.endingBalance || 0,
          rateOfReturn: asset.ytd?.rateOfReturn || 0,
        };
      case "itd":
        return {
          beginningBalance: asset.itd?.beginningBalance || 0,
          additions: asset.itd?.additions || 0,
          redemptions: asset.itd?.redemptions || 0,
          netIncome: asset.itd?.netIncome || 0,
          endingBalance: asset.itd?.endingBalance || 0,
          rateOfReturn: asset.itd?.rateOfReturn || 0,
        };
      default:
        return {
          beginningBalance: 0,
          additions: 0,
          redemptions: 0,
          netIncome: 0,
          endingBalance: 0,
          rateOfReturn: 0,
        };
    }
  };

  const currentPeriodLabel =
    availablePeriods?.find((p) => p.id === selectedPeriodId)?.label ||
    availablePeriods?.[0]?.label ||
    null;

  return (
    <PageShell maxWidth="narrow">
      <PageHeader title="Performance" subtitle="Track your investment returns" icon={TrendingUp} />

      {/* Period Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
        <p className="text-sm text-muted-foreground">
          {currentPeriodLabel
            ? `Showing ${PERIOD_LABELS[period]} for ${currentPeriodLabel}`
            : `Showing ${PERIOD_LABELS[period]} performance`}
        </p>
      </div>

      {/* Performance Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : assetStats?.assets && assetStats.assets.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assetStats.assets.map((asset) => (
              <PerformanceCard
                key={asset.fundName}
                fundName={asset.assetSymbol}
                period={period}
                data={getPerformanceData(asset)}
              />
            ))}
          </div>
          {assetStats.periodEndDate && (
            <p className="text-xs text-muted-foreground text-center">
              As of{" "}
              {new Date(assetStats.periodEndDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </>
      ) : (
        <EmptyState
          icon={TrendingUp}
          title="No Performance Data"
          description={
            availablePeriods && availablePeriods.length === 0
              ? "Your performance report hasn't been generated yet. Reports are typically available by the 5th of the following month."
              : "Your performance metrics will appear here once you have active investments."
          }
        />
      )}
    </PageShell>
  );
}
