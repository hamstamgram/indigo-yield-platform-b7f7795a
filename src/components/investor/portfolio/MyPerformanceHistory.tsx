import React, { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { OptimizedTable, Column } from "@/components/ui/optimized-table";
import { formatAssetAmount, getAssetLogo, getAssetName } from "@/utils/assets";
import { Loader2, TrendingUp, Calendar } from "lucide-react";
import { usePerformanceHistory } from "@/hooks/data/investor";
import { type PerformanceHistoryRecord } from "@/services/shared";

// Pre-calculate rate of return for a report
interface ProcessedReport extends PerformanceHistoryRecord {
  rate: number;
}

/**
 * Rate of Return Calculation: Modified Dietz Method
 *
 * @description
 * Calculates the monthly rate of return using the Modified Dietz approximation,
 * which adjusts for cash flows by assuming they occur mid-period.
 *
 * ## Formula
 * ```
 * RoR = (Net Income / Adjusted Capital) × 100
 *
 * Where:
 *   Net Income       = yield_earned (interest/dividends for the period)
 *   Net Flows        = additions - withdrawals
 *   Adjusted Capital = opening_balance + (net_flows / 2)
 * ```
 *
 * ## Why Modified Dietz?
 * - Industry-standard for monthly investor statements
 * - Approximates time-weighted return without daily valuations
 * - Assumes cash flows occur at the midpoint of the period
 * - More accurate than simple RoR when significant deposits/withdrawals occur
 *
 * ## Edge Cases
 * - If adjusted capital is zero or negative, returns 0% to avoid division errors
 * - New investors mid-month: opening_balance = 0, so denominator = additions / 2
 *
 * ## Relationship to Database
 * The database column `mtd_rate_of_return` in `investor_fund_performance` stores
 * a pre-calculated value. This client-side calculation is used for:
 * - Displaying rates in the performance history table
 * - Ensuring consistency when database values are not yet available
 *
 * ## Dual Formula Note
 * There are two RoR formulas used in the system:
 * 1. **Modified Dietz (this component)**: `RoR = net_income / (begin + net_flows/2)`
 * 2. **Simple RoR (statementCalculations.ts)**: `RoR = net_income / beginning_balance`
 *
 * Both are valid. Modified Dietz is more accurate when cash flows are significant
 * relative to the balance.
 *
 * @see https://en.wikipedia.org/wiki/Modified_Dietz_method
 * @see docs/FINANCIAL_RULEBOOK.md for canonical formulas
 * @see tests/sql/performance_balance_e2e.sql for balance equation validation
 *
 * @param report - The performance record containing balance and flow data
 * @returns Rate of return as a percentage (e.g., 2.5 for 2.5%)
 */
const calculateRate = (report: PerformanceHistoryRecord): number => {
  const netFlows = (report.additions || 0) - (report.withdrawals || 0);
  const denominator = (report.opening_balance || 0) + netFlows / 2;
  return denominator !== 0 ? ((report.yield_earned || 0) / denominator) * 100 : 0;
};

// Memoized asset section component
const AssetSection = memo(function AssetSection({
  assetCode,
  reports,
}: {
  assetCode: string;
  reports: PerformanceHistoryRecord[];
}) {
  // Memoize processed reports with pre-calculated rates
  const processedReports = useMemo<ProcessedReport[]>(
    () =>
      reports.map((report) => ({
        ...report,
        rate: calculateRate(report),
      })),
    [reports]
  );

  // Memoize columns for this asset
  const columns = useMemo<Column<ProcessedReport>[]>(
    () => [
      {
        header: "Month",
        accessor: (report) => (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {new Date(report.report_month).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
            })}
          </div>
        ),
        width: "180px",
        className: "font-medium",
      },
      {
        header: "Opening Balance",
        accessor: (report) => formatAssetAmount(report.opening_balance || 0, assetCode),
        className: "text-right font-mono",
      },
      {
        header: "Additions",
        accessor: (report) => (
          <span className="text-green-600">
            {report.additions && report.additions > 0 ? "+" : ""}
            {formatAssetAmount(report.additions || 0, assetCode)}
          </span>
        ),
        className: "text-right font-mono",
      },
      {
        header: "Withdrawals",
        accessor: (report) => (
          <span className="text-red-600">
            {report.withdrawals && report.withdrawals > 0 ? "-" : ""}
            {formatAssetAmount(report.withdrawals || 0, assetCode)}
          </span>
        ),
        className: "text-right font-mono",
      },
      {
        header: "Yield Earned",
        accessor: (report) => (
          <span className="text-blue-600 font-semibold">
            +{formatAssetAmount(report.yield_earned || 0, assetCode)}
          </span>
        ),
        className: "text-right font-mono",
      },
      {
        header: "Rate of Return",
        accessor: (report) => `${report.rate.toFixed(2)}%`,
        className: "text-right font-mono font-medium",
      },
      {
        header: "Closing Balance",
        accessor: (report) => formatAssetAmount(report.closing_balance || 0, assetCode),
        className: "text-right font-mono font-bold bg-muted/10",
      },
    ],
    [assetCode]
  );

  return (
    <Card className="col-span-full overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="bg-muted/5 pb-4">
        <div className="flex items-center gap-3">
          <img
            src={getAssetLogo(assetCode)}
            alt={assetCode}
            className="h-8 w-8 object-contain"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <CardTitle className="text-xl font-bold text-primary">
              {getAssetName(assetCode) || `${assetCode} Yield Fund`}
            </CardTitle>
            <p className="text-sm text-muted-foreground font-mono">{assetCode}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-t">
          <OptimizedTable
            columns={columns}
            data={processedReports}
            getRowKey={(report) => report.id}
            enableVirtualScroll={processedReports.length > 24}
            rowHeight={52}
          />
        </div>
      </CardContent>
    </Card>
  );
});

export default function MyPerformanceHistory() {
  const { data: groupedReports, isLoading, error } = usePerformanceHistory();

  // Memoize sorted asset keys
  const assetKeys = useMemo(() => Object.keys(groupedReports || {}).sort(), [groupedReports]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="text-center py-12 bg-destructive/10 rounded-lg">
            <p className="text-destructive font-medium">Failed to load performance history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (assetKeys.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground font-medium">No performance history found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your portfolio activity will appear here once available.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {assetKeys.map((assetCode) => (
        <AssetSection key={assetCode} assetCode={assetCode} reports={groupedReports![assetCode]} />
      ))}
    </div>
  );
}
