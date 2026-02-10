/**
 * INDIGO Fees Page
 * Shows platform fee collection, INDIGO FEES account balance, yield earned,
 * and audit trail with full distribution history
 */

import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { ExportButton } from "@/components/common";
import type { ExportColumn } from "@/lib/export/csv-export";
import { AdminGuard } from "@/components/admin";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { useFeesOverview, type FeeSummary } from "@/hooks/data";
import {
  FeesBalanceCard,
  YieldEarnedSummaryCard,
  FeeDateRangeFilter,
  FeeSummaryCards,
  FeeTransactionsTable,
} from "@/components/admin/fees";

const feeExportColumns: ExportColumn[] = [
  { key: "txDate", label: "Date" },
  { key: "investorName", label: "Investor" },
  { key: "asset", label: "Asset" },
  { key: "amount", label: "Amount" },
  { key: "fundName", label: "Fund" },
  { key: "type", label: "Type" },
];

function FeesOverviewContent() {
  const { data, isLoading } = useFeesOverview();

  const [selectedFund, setSelectedFund] = useState<string>("all");

  // Date filtering - default to 24 months to capture historical data
  const [dateFrom, setDateFrom] = useState<string>(() =>
    format(startOfMonth(subMonths(new Date(), 24)), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState<string>(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Extract data with defaults
  const fees = data?.fees || [];
  const funds = data?.funds || [];
  const indigoFeesBalance = data?.indigoFeesBalance || {};
  const yieldEarned = data?.yieldEarned || [];

  // Filter fees by date range and fund
  const filteredFees = useMemo(() => {
    return fees.filter((fee) => {
      if (selectedFund !== "all" && fee.fundId !== selectedFund) {
        return false;
      }
      const feeDate = parseISO(fee.txDate || fee.createdAt);
      const fromDate = parseISO(dateFrom);
      const toDate = parseISO(dateTo);
      return isWithinInterval(feeDate, { start: fromDate, end: toDate });
    });
  }, [fees, selectedFund, dateFrom, dateTo]);

  // Calculate filtered summaries
  const filteredSummaries = useMemo(() => {
    const summaryMap = new Map<string, FeeSummary>();
    filteredFees.forEach((fee) => {
      const existing = summaryMap.get(fee.asset) || {
        assetCode: fee.asset,
        totalAmount: 0,
        transactionCount: 0,
      };
      existing.totalAmount += fee.amount;
      existing.transactionCount += 1;
      summaryMap.set(fee.asset, existing);
    });
    return Array.from(summaryMap.values());
  }, [filteredFees]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">INDIGO Fees</h1>
          <p className="text-muted-foreground mt-1">
            Platform fee collection and yield participation tracking
          </p>
        </div>
        <ExportButton
          data={filteredFees}
          columns={feeExportColumns}
          filename="fee-transactions"
          disabled={filteredFees.length === 0}
        />
      </div>

      {/* Summary Cards Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <FeesBalanceCard balances={indigoFeesBalance} />
        <YieldEarnedSummaryCard yields={yieldEarned} />
      </div>

      {/* Date Filter and Summary Cards */}
      <div className="flex flex-col lg:flex-row gap-4">
        <FeeDateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
        <div className="flex-1 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeeSummaryCards summaries={filteredSummaries} />
        </div>
      </div>

      {/* Fee Records Table */}
      <FeeTransactionsTable
        fees={filteredFees}
        totalCount={fees.length}
        funds={funds}
        selectedFund={selectedFund}
        onFundChange={setSelectedFund}
      />
    </div>
  );
}

export default function FeesOverviewPage() {
  return (
    <AdminGuard>
      <FeesOverviewContent />
    </AdminGuard>
  );
}
