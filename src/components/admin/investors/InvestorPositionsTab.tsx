import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddTransactionDialog } from "@/components/admin/AddTransactionDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function InvestorPositionsTab({ investorId }: { investorId: string }) {
  const queryClient = useQueryClient();

  // Fetch Positions - filter out zero-value positions
  const { data: positions, isLoading } = useQuery({
    queryKey: ["investor-positions", investorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_positions")
        .select(
          `
          investor_id,
          fund_id,
          shares,
          cost_basis,
          current_value,
          realized_pnl,
          fund_class,
          updated_at,
          funds ( id, name, asset )
        `
        )
        .eq("investor_id", investorId)
        // Filter out zero-value positions (deleted or fully withdrawn)
        .or("current_value.gt.0,cost_basis.gt.0,shares.gt.0");

      if (error) throw error;
      return data;
    },
  });

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
          Positions are derived from transactions. To correct balances, use the "Add Transaction" button to create adjustment entries.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Current Holdings</CardTitle>
          <CardDescription>
            Token-denominated balances across all funds
          </CardDescription>
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
                    <TableCell className="font-medium">{(pos.funds as any)?.name}</TableCell>
                    <TableCell className="font-mono">{Number(pos.current_value).toFixed(8)}</TableCell>
                    <TableCell>{((pos.funds as any)?.asset || "").toUpperCase()}</TableCell>
                    <TableCell className="text-green-600 font-mono">
                      +{Number(pos.realized_pnl || 0).toFixed(8)}
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
          queryClient.invalidateQueries({ queryKey: ["investor-positions", investorId] });
          setShowAddTxDialog(false);
        }}
      />
    </div>
  );
}
