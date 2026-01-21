/**
 * INDIGO Fees Page
 * Shows platform fee collection, INDIGO FEES account balance, yield earned,
 * and audit trail with full distribution history
 */

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger, Badge } from "@/components/ui";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { AdminGuard } from "@/components/admin";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { useFeesOverview, type FeeSummary } from "@/hooks/data";
import {
  FeesBalanceCard,
  InternalRoutingSummaryCard,
  YieldEarnedSummaryCard,
  FeeDateRangeFilter,
  FeeSummaryCards,
  FeeTransactionsTable,
  FeeAllocationAuditTable,
  InternalRoutingTab,
  YieldEarnedTab,
} from "@/components/admin/fees";

function FeesOverviewContent() {
  const { data, isLoading } = useFeesOverview();

  const [selectedFund, setSelectedFund] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");

  // Date filtering - default to 24 months to capture historical data
  const [dateFrom, setDateFrom] = useState<string>(() =>
    format(startOfMonth(subMonths(new Date(), 24)), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState<string>(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Extract data with defaults
  const fees = data?.fees || [];
  const funds = data?.funds || [];
  const indigoFeesBalance = data?.indigoFeesBalance || {};
  const feeAllocations = data?.feeAllocations || [];
  const yieldEarned = data?.yieldEarned || [];
  const routingAuditEntries = data?.routingAuditEntries || [];
  const routingSummary = data?.routingSummary || { totalAmount: 0, totalCount: 0, byAsset: {} };

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
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">INDIGO Fees</h1>
        <p className="text-muted-foreground mt-1">
          Platform fee collection and yield participation tracking
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="routing" className="flex items-center gap-1.5">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Internal Routing
            {routingSummary.totalCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {routingSummary.totalCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="yield">Yield Earned</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Summary Cards Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FeesBalanceCard balances={indigoFeesBalance} />
            <InternalRoutingSummaryCard summary={routingSummary} />
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
        </TabsContent>

        <TabsContent value="audit" className="space-y-6 mt-4">
          <FeeAllocationAuditTable allocations={feeAllocations} />
        </TabsContent>

        <TabsContent value="routing" className="space-y-6 mt-4">
          <InternalRoutingTab summary={routingSummary} entries={routingAuditEntries} />
        </TabsContent>

        <TabsContent value="yield" className="space-y-6 mt-4">
          <YieldEarnedTab yields={yieldEarned} />
        </TabsContent>
      </Tabs>
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
