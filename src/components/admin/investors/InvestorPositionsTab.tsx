import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function InvestorPositionsTab({ investorId }: { investorId: string }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
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

  // Add Position Mutation
  const addPositionMutation = useMutation({
    mutationFn: async (newPosition: any) => {
      const { error } = await supabase.from("investor_positions").insert([
        {
          investor_id: investorId,
          fund_id: newPosition.fundId,
          shares: parseFloat(newPosition.shares),
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investor-positions", investorId] });
      setIsAddOpen(false);
      toast.success("Position added successfully");
    },
    onError: (error: any) => {
      toast.error(`Error adding position: ${error.message}`);
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

  // Fetch Funds for Dropdown
  const { data: funds } = useQuery({
    queryKey: ["active-funds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funds")
        .select("id, name, asset")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (position: any) => {
    setSelectedPosition(position);
    setIsEditOpen(true);
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
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Position
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Position</DialogTitle>
            </DialogHeader>
            <AddPositionForm
              funds={funds || []}
              onSubmit={(data: any) => addPositionMutation.mutate(data)}
              isLoading={addPositionMutation.isPending}
            />
          </DialogContent>
        </Dialog>
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
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this position?")) {
                              deletePositionMutation.mutate(pos.fund_id);
                            }
                          }}
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
              No positions found for this investor.
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
    </div>
  );
}

function AddPositionForm({ funds, onSubmit, isLoading }: any) {
  const [fundId, setFundId] = useState("");
  const [shares, setShares] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ fundId, shares });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Fund</Label>
        <Select value={fundId} onValueChange={setFundId} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a fund" />
          </SelectTrigger>
          <SelectContent>
            {funds.map((f: any) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name} ({f.asset})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Initial Balance (Shares)</Label>
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
        Create Position
      </Button>
    </form>
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
// @ts-nocheck
// @ts-nocheck
