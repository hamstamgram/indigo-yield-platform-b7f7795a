/**
 * INDIGO FEES Page
 * Shows INDIGO fees account balance, revenue KPIs, yield earned,
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
import { useFeesOverview } from "@/hooks/data";
import {
  FeesBalanceCard,
  YieldEarnedSummaryCard,
  FeeRevenueKPIs,
  FeeDateRangeFilter,
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
          <h1 className="text-3xl font-display font-bold tracking-tight">INDIGO FEES</h1>
          <p className="text-muted-foreground mt-1">
            INDIGO fees account overview and transaction audit trail
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
                  filename: "indigo-fees",
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

      {/* Revenue Overview - MTD / YTD / ITD */}
      <FeeRevenueKPIs fees={fees} />

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Account Status - Balance + Yield Earned */}
      <div className="grid gap-4 md:grid-cols-2">
        <FeesBalanceCard balances={indigoFeesBalance} />
        <YieldEarnedSummaryCard yields={yieldEarned} />
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Transaction Audit Trail */}
      <div className="space-y-4">
        <FeeDateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
        <FeeTransactionsTable
          fees={filteredFees}
          totalCount={fees.length}
          funds={funds}
          selectedFund={selectedFund}
          onFundChange={setSelectedFund}
        />
      </div>
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
