import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import type { FeeCalculation } from "@/types/fee";
import { feeService } from "@/services/feeService";
import { toast } from "sonner";

interface FeeCalculationsTableProps {
  calculations: FeeCalculation[];
  onRefresh: () => void;
}

export function FeeCalculationsTable({
  calculations,
  onRefresh,
}: FeeCalculationsTableProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      posted: { variant: "default", icon: CheckCircle },
      cancelled: { variant: "destructive", icon: XCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const handlePost = async (id: string) => {
    try {
      // In a real implementation, this would create a transaction first
      const transactionId = crypto.randomUUID();
      await feeService.postFeeCalculation(id, transactionId);
      toast.success("Fee calculation posted successfully");
      onRefresh();
    } catch (error: any) {
      console.error("Error posting fee:", error);
      toast.error(error.message || "Failed to post fee calculation");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await feeService.cancelFeeCalculation(id);
      toast.success("Fee calculation cancelled");
      onRefresh();
    } catch (error: any) {
      console.error("Error cancelling fee:", error);
      toast.error(error.message || "Failed to cancel fee calculation");
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Investor</TableHead>
            <TableHead>Fund</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Basis</TableHead>
            <TableHead className="text-right">Rate (bps)</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calculations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                No fee calculations found
              </TableCell>
            </TableRow>
          ) : (
            calculations.map((calc) => (
              <TableRow key={calc.id}>
                <TableCell>
                  {new Date(calc.calculation_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{calc.investor_name}</div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{calc.fund_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {calc.fund_code}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{calc.fee_type}</TableCell>
                <TableCell className="text-right font-mono">
                  ${Number(calc.calculation_basis).toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {calc.rate_bps}
                </TableCell>
                <TableCell className="text-right font-mono font-medium">
                  ${Number(calc.fee_amount).toLocaleString()}
                </TableCell>
                <TableCell>{getStatusBadge(calc.status)}</TableCell>
                <TableCell className="text-right">
                  {calc.status === "pending" && (
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handlePost(calc.id)}
                      >
                        Post
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancel(calc.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
