import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
} from "@/components/ui";
import { CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import type { Investment } from "@/types/domains";
import { InvestmentApprovalDialog } from "./InvestmentApprovalDialog";

interface InvestmentsTableProps {
  investments: Investment[];
  onRefresh: () => void;
}

export function InvestmentsTable({ investments, onRefresh }: InvestmentsTableProps) {
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      active: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
      cancelled: { variant: "outline", icon: XCircle },
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

  const handleApprove = (investment: Investment) => {
    setSelectedInvestment(investment);
    setApprovalDialogOpen(true);
  };

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investor</TableHead>
              <TableHead>Fund</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Shares</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <p className="font-medium">No investments found</p>
                    <p className="text-sm">
                      Investment requests will appear here when investors submit them.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              investments.map((investment) => (
                <TableRow key={investment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{investment.investor_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {investment.investor_email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{investment.fund_name}</div>
                      <div className="text-xs text-muted-foreground">{investment.fund_code}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    ${Number(investment.amount).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono">
                    {Number(investment.shares).toFixed(4)}
                  </TableCell>
                  <TableCell className="capitalize">{investment.transaction_type}</TableCell>
                  <TableCell>{new Date(investment.investment_date).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusBadge(investment.status)}</TableCell>
                  <TableCell className="text-right">
                    {investment.status === "pending" ? (
                      <Button size="sm" onClick={() => handleApprove(investment)}>
                        Review
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InvestmentApprovalDialog
        investment={selectedInvestment}
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        onSuccess={onRefresh}
      />
    </>
  );
}
