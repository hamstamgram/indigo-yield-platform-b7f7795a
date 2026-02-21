/**
 * Fee Transactions Table
 * Shows FEE_CREDIT transactions with fund filter and sorting.
 */

import { format } from "date-fns";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  SortableTableHead,
} from "@/components/ui";
import { AlertCircle } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatFeeAmount } from "./utils/feeUtils";
import { toNumber } from "@/utils/numeric";
import type { FeeRecord } from "@/hooks/data";
import { useSortableColumns } from "@/hooks";

interface FundOption {
  id: string;
  name: string;
}

interface FeeTransactionsTableProps {
  fees: FeeRecord[];
  totalCount: number;
  funds: FundOption[];
  selectedFund: string;
  onFundChange: (fundId: string) => void;
}

export function FeeTransactionsTable({
  fees,
  totalCount,
  funds,
  selectedFund,
  onFundChange,
}: FeeTransactionsTableProps) {
  const { sortedData, sortConfig, requestSort } = useSortableColumns(fees, {
    column: "txDate",
    direction: "desc",
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Fee Credit Transactions</CardTitle>
            <CardDescription>Platform fee credits from yield distributions</CardDescription>
          </div>
          <Select value={selectedFund} onValueChange={onFundChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by fund" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Funds</SelectItem>
              {funds.map((fund) => (
                <SelectItem key={fund.id} value={fund.id}>
                  {fund.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead column="txDate" currentSort={sortConfig} onSort={requestSort}>
                  Date
                </SortableTableHead>
                <SortableTableHead
                  column="investorName"
                  currentSort={sortConfig}
                  onSort={requestSort}
                >
                  Investor
                </SortableTableHead>
                <SortableTableHead column="fundName" currentSort={sortConfig} onSort={requestSort}>
                  Fund
                </SortableTableHead>
                <SortableTableHead
                  column="amount"
                  currentSort={sortConfig}
                  onSort={requestSort}
                  className="text-right"
                >
                  Amount
                </SortableTableHead>
                <TableHead>Purpose</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <div className="space-y-2">
                      <AlertCircle className="h-8 w-8 mx-auto opacity-50" />
                      <p>No fee credit transactions found</p>
                      <p className="text-xs max-w-md mx-auto">
                        Fee credits are created during yield distributions. Try adjusting the date
                        range or run a yield distribution to generate fee records.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell>
                      {format(new Date(fee.txDate || fee.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{fee.investorName}</p>
                        <p className="text-xs text-muted-foreground">{fee.investorEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={fee.asset} className="h-5 w-5" />
                        <span className="text-sm">{fee.fundName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={toNumber(fee.amount) > 0 ? "text-emerald-600" : ""}>
                        {toNumber(fee.amount) > 0 ? "+" : ""}
                        {formatFeeAmount(fee.amount, fee.asset)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">{fee.asset}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {fee.purpose || "---"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {sortedData.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2 text-right">
            Showing {sortedData.length} of {totalCount} total transactions
          </p>
        )}
      </CardContent>
    </Card>
  );
}
