import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useInvestorPositions } from "@/hooks";
import AddTransactionDialog from "@/features/admin/transactions/AddTransactionDialog";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { Plus, Loader2, AlertCircle, Info } from "lucide-react";
import { FinancialValue } from "@/components/common/FinancialValue";
import { CryptoIcon } from "@/components/CryptoIcons";

export default function InvestorPositionsTab({ investorId }: { investorId: string }) {
  const queryClient = useQueryClient();

  // Use extracted hook for positions
  const { data: positions, isLoading } = useInvestorPositions(investorId);

  // State for inline Add Transaction modal
  const [showAddTxDialog, setShowAddTxDialog] = useState(false);
  const [selectedFundForTx, setSelectedFundForTx] = useState<string | null>(null);

  // Open Add Transaction modal
  const handleAddTransaction = () => {
    const defaultFundId = positions?.[0]?.fund_id;
    setSelectedFundForTx(defaultFundId || null);
    setShowAddTxDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Asset Positions</h2>
        <Button onClick={handleAddTransaction}>
          <Plus className="mr-2 h-4 w-4" /> Add Transaction
        </Button>
      </div>

      {/* Guidance for ledger-derived positions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Positions are derived from transactions. To correct balances, use the "Add Transaction"
          button to create adjustment entries.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Current Holdings</CardTitle>
          <CardDescription>Token-denominated balances across all funds</CardDescription>
        </CardHeader>
        <CardContent>
          {positions && positions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Realized PnL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos) => (
                  <TableRow key={`${pos.investor_id}-${pos.fund_id}`}>
                    <TableCell className="font-medium">{pos.funds?.name}</TableCell>
                    <TableCell className="font-mono">
                      <FinancialValue value={pos.current_value} asset={pos.funds?.asset} />
                    </TableCell>
                    <TableCell>
                      <CryptoIcon symbol={pos.funds?.asset || ""} className="h-5 w-5" />
                    </TableCell>
                    <TableCell className="font-mono">
                      <FinancialValue
                        value={pos.realized_pnl || 0}
                        asset={pos.funds?.asset}
                        colorize
                        prefix="+"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No positions found for this investor.</p>
              <Button variant="outline" className="mt-4" onClick={handleAddTransaction}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inline Add Transaction Dialog */}
      <AddTransactionDialog
        open={showAddTxDialog}
        onOpenChange={setShowAddTxDialog}
        investorId={investorId}
        fundId={selectedFundForTx || ""}
        onSuccess={() => {
          invalidateAfterTransaction(queryClient, investorId, selectedFundForTx || undefined);
          setShowAddTxDialog(false);
        }}
      />
    </div>
  );
}
