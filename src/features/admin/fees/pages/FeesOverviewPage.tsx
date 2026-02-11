/**
 * Fee Revenue Page
 * Shows platform fee revenue KPIs, INDIGO FEES account balance, yield earned,
 * and fee credit transaction audit trail.
 */

import { useState, useMemo } from "react";
import { Loader2, Download, FileText, Table2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CSVExporter, type ExportColumn } from "@/lib/export/csv-export";
import { AdminGuard } from "@/components/admin";
import { useToast } from "@/hooks";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { useFeesOverview, type FeeSummary } from "@/hooks/data";
import {
  FeesBalanceCard,
  YieldEarnedSummaryCard,
  FeeRevenueKPIs,
  FeeDateRangeFilter,
  FeeSummaryCards,
  FeeTransactionsTable,
  exportFeesToPDF,
} from "@/components/admin/fees";

const feeExportColumns: ExportColumn[] = [
  { key: "txDate", label: "Date" },
  { key: "investorName", label: "Investor" },
  { key: "asset", label: "Asset" },
  { key: "amount", label: "Amount" },
  { key: "fundName", label: "Fund" },
];

function FeesOverviewContent() {
  const { data, isLoading } = useFeesOverview();
  const { toast } = useToast();

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
          <h1 className="text-3xl font-display font-bold tracking-tight">Fee Revenue</h1>
          <p className="text-muted-foreground mt-1">
            Platform fee revenue and INDIGO account overview
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={filteredFees.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={async () => {
                const result = await CSVExporter.exportToCSV(filteredFees, {
                  filename: "fee-revenue",
                  columns: feeExportColumns,
                  includeHeaders: true,
                  encoding: "utf-8-bom",
                });
                if (result.success) {
                  toast({
                    title: "Export complete",
                    description: `${result.rowCount} rows exported`,
                  });
                } else {
                  toast({
                    title: "Export failed",
                    description: result.error,
                    variant: "destructive",
                  });
                }
              }}
            >
              <Table2 className="h-4 w-4 mr-2" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportFeesToPDF(filteredFees)}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Revenue KPI Cards: MTD / YTD / ITD */}
      <FeeRevenueKPIs fees={fees} />

      {/* Balance + Yield Earned Row */}
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
