/**
 * Fee Allocation Audit Table
 * Complete record of all fee allocations for reconciliation
 */

import { format } from "date-fns";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge,
} from "@/components/ui";
import { FileText } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatFeeAmount } from "./utils/feeUtils";
import type { FeeAllocation } from "@/hooks/data";

interface FeeAllocationAuditTableProps {
  allocations: FeeAllocation[];
}

export function FeeAllocationAuditTable({ allocations }: FeeAllocationAuditTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>Fee Allocation Audit Trail</CardTitle>
            <CardDescription>
              Complete record of all fee allocations with distribution IDs for reconciliation
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {allocations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-2">No fee allocations recorded yet</p>
            <p className="text-sm max-w-md mx-auto">
              Fee allocations are created during month-end reporting yield distributions.
              Once a distribution is run, detailed allocation records will appear here for audit purposes.
            </p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg max-w-md mx-auto text-left">
              <p className="text-xs font-medium text-foreground mb-2">Alternative Data Source:</p>
              <p className="text-xs">
                Fee transactions from <code className="bg-background px-1 rounded">transactions_v2</code> are 
                displayed in the Overview tab. These provide a complete record of all fee movements.
              </p>
            </div>
          </div>
        ) : (
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
                {allocations.map((allocation) => (
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
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[100px] inline-block" title={allocation.distribution_id}>
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
                        <p className="text-xs text-muted-foreground">{allocation.investor_email}</p>
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
                      <Badge variant={allocation.purpose === "reporting" ? "default" : "secondary"}>
                        {allocation.purpose}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
