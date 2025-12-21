import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";

export default function InvestorPositionsTab({ investorId }: { investorId: string }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [deletePosition, setDeletePosition] = useState<{ fundId: string; fundName: string } | null>(null);
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

  // Update Position Mutation
  const updatePositionMutation = useMutation({
    mutationFn: async (position: any) => {
      const { error } = await supabase
        .from("investor_positions")
        .update({
          shares: parseFloat(position.shares),
        })
        .eq("investor_id", investorId)
        .eq("fund_id", position.fund_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investor-positions", investorId] });
      setIsEditOpen(false);
      toast.success("Position updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Error updating position: ${error.message}`);
    },
  });

  // Delete Position Mutation
  const deletePositionMutation = useMutation({
    mutationFn: async (fundId: string) => {
      const { error } = await supabase
        .from("investor_positions")
        .delete()
        .eq("investor_id", investorId)
        .eq("fund_id", fundId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ["investor-positions", investorId] });
      queryClient.invalidateQueries({ queryKey: ["investor-asset-stats", investorId] });
      queryClient.invalidateQueries({ queryKey: ["per-asset-stats"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Position deleted successfully");
    },
    onError: (error: any) => {
      toast.error(`Error deleting position: ${error.message}`);
    },
  });

  const handleEdit = (position: any) => {
    setSelectedPosition(position);
    setIsEditOpen(true);
  };

  // State for inline Add Transaction modal
  const [showAddTxDialog, setShowAddTxDialog] = useState(false);
  const [selectedFundForTx, setSelectedFundForTx] = useState<string | null>(null);

  // Open Add Transaction modal instead of navigating
  const handleAddTransaction = () => {
    // Default to first position's fund if available
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

      <Card>
        <CardHeader>
          <CardTitle>Current Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {positions && positions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead>Shares/Balance</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Realized PnL</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos) => (
                  <TableRow key={`${pos.investor_id}-${pos.fund_id}`}>
                    <TableCell className="font-medium">{(pos.funds as any)?.name}</TableCell>
                    <TableCell className="font-mono">{Number(pos.shares).toFixed(4)}</TableCell>
                    <TableCell>{((pos.funds as any)?.asset || "").toUpperCase()}</TableCell>
                    <TableCell className="text-green-600 font-mono">
                      +{Number(pos.realized_pnl || 0).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(pos)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletePosition({ 
                            fundId: pos.fund_id, 
                            fundName: (pos.funds as any)?.name || "this position" 
                          })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Position</DialogTitle>
          </DialogHeader>
          {selectedPosition && (
            <EditPositionForm
              position={selectedPosition}
              onSubmit={(data: any) =>
                updatePositionMutation.mutate({ ...data, fund_id: selectedPosition.fund_id })
              }
              isLoading={updatePositionMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePosition} onOpenChange={(open) => !open && setDeletePosition(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the position for {deletePosition?.fundName}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletePosition) {
                  deletePositionMutation.mutate(deletePosition.fundId);
                  setDeletePosition(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

function EditPositionForm({ position, onSubmit, isLoading }: any) {
  const [shares, setShares] = useState(position.shares.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ shares });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Current Balance (Shares)</Label>
        <Input
          type="number"
          step="0.000001"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save Changes
      </Button>
    </form>
  );
}
