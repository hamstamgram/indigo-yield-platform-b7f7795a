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

  // Fetch Positions
  const { data: positions, isLoading } = useQuery({
    queryKey: ["investor-positions", investorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_positions")
        .select(
          `
          *,
          funds ( id, name, asset_symbol )
        `
        )
        .eq("investor_id", investorId);

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
          status: "active",
          total_yield_earned: 0,
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
          status: position.status,
        })
        .eq("id", position.id);
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("investor_positions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investor-positions", investorId] });
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
      const { data, error } = await supabase.from("funds").select("id, name, asset_symbol");
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
              onSubmit={(data) => addPositionMutation.mutate(data)}
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
                  <TableHead>Total Yield</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell className="font-medium">{pos.funds?.name}</TableCell>
                    <TableCell className="font-mono">{Number(pos.shares).toFixed(4)}</TableCell>
                    <TableCell>{pos.funds?.asset_symbol}</TableCell>
                    <TableCell className="text-green-600 font-mono">
                      +{Number(pos.total_yield_earned).toFixed(4)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={pos.status === "active" ? "default" : "secondary"}>
                        {pos.status}
                      </Badge>
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
                              deletePositionMutation.mutate(pos.id);
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
              onSubmit={(data) =>
                updatePositionMutation.mutate({ ...data, id: selectedPosition.id })
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
                {f.name} ({f.asset_symbol})
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
  const [status, setStatus] = useState(position.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ shares, status });
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
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="frozen">Frozen</SelectItem>
            <SelectItem value="liquidated">Liquidated</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save Changes
      </Button>
    </form>
  );
}
