/**
 * Fee Allocation Audit Table
 * Complete record of all fee allocations for reconciliation
 */

import { useState, useMemo } from "react";
import { format, parseISO, isWithinInterval, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { FileText, Search } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatFeeAmount } from "./utils/feeUtils";
import type { FeeAllocation } from "@/features/admin/fees/hooks/useFees";
interface FeeAllocationAuditTableProps {
  allocations: FeeAllocation[];
}

export function FeeAllocationAuditTable({ allocations }: FeeAllocationAuditTableProps) {
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFund, setSelectedFund] = useState("all");
  const [dateFrom, setDateFrom] = useState(() =>
    format(startOfMonth(subMonths(new Date(), 24)), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Extract unique funds for filter dropdown
  const uniqueFunds = useMemo(() => {
    const fundMap = new Map<string, { id: string; name: string; asset: string }>();
    allocations.forEach((a) => {
      if (!fundMap.has(a.fund_id)) {
        fundMap.set(a.fund_id, {
          id: a.fund_id,
          name: a.fund_name || "Unknown",
          asset: a.fund_asset || "",
        });
      }
    });
    return Array.from(fundMap.values());
  }, [allocations]);

  // Filtered allocations
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      // Fund filter
      if (selectedFund !== "all" && a.fund_id !== selectedFund) return false;

      // Search filter (investor name or email)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = a.investor_name?.toLowerCase().includes(query);
        const matchesEmail = a.investor_email?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }

      // Date range filter
      try {
        const allocationDate = parseISO(a.period_end || a.created_at);
        const fromDate = parseISO(dateFrom);
        const toDate = parseISO(dateTo);
        if (!isWithinInterval(allocationDate, { start: fromDate, end: toDate })) return false;
      } catch {
        // Skip date filter if parsing fails
      }

      return true;
    });
  }, [allocations, selectedFund, searchQuery, dateFrom, dateTo]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Fee Allocation Audit Trail</CardTitle>
              <CardDescription>
                Complete record of all fee allocations with distribution IDs for reconciliation
              </CardDescription>
            </div>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search investor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedFund} onValueChange={setSelectedFund}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Funds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Funds</SelectItem>
                {uniqueFunds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    <span className="flex items-center gap-2">
                      {fund.asset && <CryptoIcon symbol={fund.asset} className="h-4 w-4" />}
                      {fund.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[140px]"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px]"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAllocations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            {allocations.length === 0 ? (
              <>
                <p className="font-medium mb-2">No fee allocations recorded yet</p>
                <p className="text-sm max-w-md mx-auto">
                  Fee allocations are created during month-end reporting yield distributions. Once a
                  distribution is run, detailed allocation records will appear here for audit
                  purposes.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium mb-2">No allocations match your filters</p>
                <p className="text-sm max-w-md mx-auto">
                  Try adjusting the date range, fund filter, or search query. There are{" "}
                  {allocations.length} total allocations.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-md border max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Distribution ID</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Source Investor</TableHead>
                    <TableHead className="text-right">Base Income</TableHead>
                    <TableHead className="text-right">Fee %</TableHead>
                    <TableHead className="text-right">Fee Amount</TableHead>
                    <TableHead>Purpose</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(allocation.period_start), "MMM d")}</p>
                          <p className="text-muted-foreground">
                            to {format(new Date(allocation.period_end), "MMM d, yyyy")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code
                          className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[100px] inline-block"
                          title={allocation.distribution_id}
                        >
                          {allocation.distribution_id.slice(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {allocation.fund_asset && (
                            <CryptoIcon symbol={allocation.fund_asset} className="h-4 w-4" />
                          )}
                          <span className="text-sm">{allocation.fund_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{allocation.investor_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {allocation.investor_email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatFeeAmount(allocation.base_net_income, allocation.fund_asset || "")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {allocation.fee_percentage}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatFeeAmount(allocation.fee_amount, allocation.fund_asset || "")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={allocation.purpose === "reporting" ? "default" : "secondary"}
                        >
                          {allocation.purpose}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-right">
              Showing {filteredAllocations.length} of {allocations.length} allocations
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
