import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { depositService } from "@/services/depositService";
import { supabase } from "@/integrations/supabase/client";
import type { DepositFormData } from "@/types/deposit";

interface CreateDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDepositDialog({ open, onOpenChange }: CreateDepositDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<DepositFormData>({
    user_id: "",
    asset_symbol: "",
    amount: 0,
    transaction_hash: "",
  });

  // Fetch users for dropdown
  const { data: users } = useQuery({
    queryKey: ["users-for-deposits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .order("first_name");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data: DepositFormData) => depositService.createDeposit(data),
    onSuccess: () => {
      toast.success("Deposit created successfully");
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      queryClient.invalidateQueries({ queryKey: ["deposit-stats"] });
      onOpenChange(false);
      setFormData({
        user_id: "",
        asset_symbol: "",
        amount: 0,
        transaction_hash: "",
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create deposit: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id || !formData.asset_symbol || formData.amount <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Deposit</DialogTitle>
          <DialogDescription>Manually record a new deposit for a user</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_id">User *</Label>
            <Select
              value={formData.user_id}
              onValueChange={(value) => setFormData({ ...formData, user_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset_symbol">Asset Symbol *</Label>
              <Input
                id="asset_symbol"
                value={formData.asset_symbol}
                onChange={(e) => setFormData({ ...formData, asset_symbol: e.target.value })}
                placeholder="e.g., BTC, ETH, USDT"
                required
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction_hash">Transaction Hash</Label>
            <Input
              id="transaction_hash"
              value={formData.transaction_hash}
              onChange={(e) => setFormData({ ...formData, transaction_hash: e.target.value })}
              placeholder="Optional blockchain transaction hash"
              maxLength={255}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Deposit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
