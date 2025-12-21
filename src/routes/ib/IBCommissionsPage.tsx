/**
 * IB Commissions Page
 * Detailed commission table with filters and CSV export
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageLoadingSpinner } from "@/components/ui/loading-spinner";
import { formatAssetAmount } from "@/utils/assets";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Coins, Download, ChevronLeft, ChevronRight, Search } from "lucide-react";

interface Commission {
  id: string;
  effectiveDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  fundName: string;
  asset: string;
  investorName: string;
  sourceNetIncome: number;
  ibPercentage: number;
  ibFeeAmount: number;
}

const PAGE_SIZE = 20;

export default function IBCommissionsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [investorSearch, setInvestorSearch] = useState("");
  const [dateRange, setDateRange] = useState<string>("all");

  const getDateRange = (range: string): { start: Date | null; end: Date | null } => {
    const now = new Date();
    switch (range) {
      case "1m":
        return { start: subMonths(now, 1), end: now };
      case "3m":
        return { start: subMonths(now, 3), end: now };
      case "6m":
        return { start: subMonths(now, 6), end: now };
      case "1y":
        return { start: subMonths(now, 12), end: now };
      default:
        return { start: null, end: null };
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["ib-commissions", user?.id, page, dateRange],
    queryFn: async () => {
      if (!user?.id) return { commissions: [], total: 0, assets: [] };

      const { start, end } = getDateRange(dateRange);

      let query = supabase
        .from("ib_allocations")
        .select(`
          id,
          ib_fee_amount,
          ib_percentage,
          source_net_income,
          effective_date,
          period_start,
          period_end,
          funds!inner(name, asset),
          profiles!ib_allocations_source_investor_id_fkey(
            first_name,
            last_name,
            email
          )
        `, { count: "exact" })
        .eq("ib_investor_id", user.id)
        .order("effective_date", { ascending: false });

      if (start) {
        query = query.gte("effective_date", format(start, "yyyy-MM-dd"));
      }
      if (end) {
        query = query.lte("effective_date", format(end, "yyyy-MM-dd"));
      }

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data: allocations, error, count } = await query;

      if (error) {
        console.error("Error fetching commissions:", error);
        return { commissions: [], total: 0, assets: [] };
      }

      const commissions: Commission[] = (allocations || []).map((alloc) => {
        const fund = alloc.funds as any;
        const profile = alloc.profiles as any;
        const investorName = profile
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email
          : "Unknown";

        return {
          id: alloc.id,
          effectiveDate: alloc.effective_date,
          periodStart: alloc.period_start,
          periodEnd: alloc.period_end,
          fundName: fund?.name || "Unknown",
          asset: fund?.asset || "USDT",
          investorName,
          sourceNetIncome: Number(alloc.source_net_income),
          ibPercentage: Number(alloc.ib_percentage),
          ibFeeAmount: Number(alloc.ib_fee_amount),
        };
      });

      // Get unique assets for filter
      const uniqueAssets = [...new Set(commissions.map((c) => c.asset))];

      return {
        commissions,
        total: count || 0,
        assets: uniqueAssets,
      };
    },
    enabled: !!user?.id,
  });

  // Client-side filtering
  const filteredCommissions = useMemo(() => {
    if (!data?.commissions) return [];
    
    return data.commissions.filter((c) => {
      if (assetFilter !== "all" && c.asset !== assetFilter) return false;
      if (investorSearch) {
        const search = investorSearch.toLowerCase();
        if (!c.investorName.toLowerCase().includes(search)) return false;
      }
      return true;
    });
  }, [data?.commissions, assetFilter, investorSearch]);

  // Export to CSV
  const exportCSV = () => {
    if (!filteredCommissions.length) return;

    const headers = [
      "Date",
      "Period Start",
      "Period End",
      "Fund",
      "Asset",
      "Investor",
      "Source Net Income",
      "IB Rate (%)",
      "Commission",
    ];

    const rows = filteredCommissions.map((c) => [
      c.effectiveDate,
      c.periodStart || "",
      c.periodEnd || "",
      c.fundName,
      c.asset,
      c.investorName,
      c.sourceNetIncome.toString(),
      c.ibPercentage.toString(),
      c.ibFeeAmount.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ib-commissions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  // Calculate totals by asset
  const totalsByAsset = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const c of filteredCommissions) {
      if (!totals[c.asset]) totals[c.asset] = 0;
      totals[c.asset] += c.ibFeeAmount;
    }
    return totals;
  }, [filteredCommissions]);

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>
          <p className="text-muted-foreground">Detailed view of all your earned commissions</p>
        </div>
        <Button onClick={exportCSV} disabled={!filteredCommissions.length}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1m">Last Month</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Select value={assetFilter} onValueChange={setAssetFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  {data?.assets.map((asset) => (
                    <SelectItem key={asset} value={asset}>
                      {asset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search investor..."
                value={investorSearch}
                onChange={(e) => setInvestorSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totals Summary */}
      {Object.keys(totalsByAsset).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(totalsByAsset).map(([asset, total]) => (
            <Badge key={asset} variant="outline" className="text-sm py-1 px-3">
              Total {asset}: {formatAssetAmount(total, asset)}
            </Badge>
          ))}
        </div>
      )}

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Commission Records ({data?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCommissions.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Source Income</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions.map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell>
                        {format(new Date(comm.effectiveDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {comm.periodStart && comm.periodEnd
                          ? `${format(new Date(comm.periodStart), "MMM d")} - ${format(new Date(comm.periodEnd), "MMM d")}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{comm.asset}</Badge>
                          <span>{comm.fundName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{comm.investorName}</TableCell>
                      <TableCell className="text-right">
                        {formatAssetAmount(comm.sourceNetIncome, comm.asset)}
                      </TableCell>
                      <TableCell className="text-right">
                        {comm.ibPercentage.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatAssetAmount(comm.ibFeeAmount, comm.asset)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-center py-12">
              No commissions found matching your filters
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
