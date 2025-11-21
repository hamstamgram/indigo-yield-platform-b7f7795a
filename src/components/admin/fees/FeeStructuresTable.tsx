import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { FundFeeStructure } from "@/types/fee";

interface FeeStructuresTableProps {
  structures: FundFeeStructure[];
}

export function FeeStructuresTable({ structures }: FeeStructuresTableProps) {
  const isCurrentStructure = (effectiveFrom: string) => {
    return new Date(effectiveFrom) <= new Date();
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fund</TableHead>
            <TableHead>Effective From</TableHead>
            <TableHead className="text-right">Management Fee</TableHead>
            <TableHead className="text-right">Performance Fee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {structures.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No fee structures found
              </TableCell>
            </TableRow>
          ) : (
            structures.map((structure, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div>
                    <div className="font-medium">{structure.fund_name}</div>
                    <div className="text-xs text-muted-foreground">{structure.fund_code}</div>
                  </div>
                </TableCell>
                <TableCell>{new Date(structure.effective_from).toLocaleDateString()}</TableCell>
                <TableCell className="text-right font-mono">
                  {(structure.mgmt_fee_bps / 100).toFixed(2)}%
                </TableCell>
                <TableCell className="text-right font-mono">
                  {(structure.perf_fee_bps / 100).toFixed(2)}%
                </TableCell>
                <TableCell>
                  {isCurrentStructure(structure.effective_from) ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="outline">Scheduled</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(structure.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
