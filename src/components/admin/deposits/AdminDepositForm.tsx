import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle, Loader2 } from "lucide-react";

interface AdminDepositFormProps {
  investors: any[];
  assets: any[];
  onSuccess?: () => void;
}

const AdminDepositForm: React.FC<AdminDepositFormProps> = ({ investors, assets, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    investor_id: "",
    asset_id: "",
    amount: "",
    tx_hash: "",
    notes: "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.investor_id || !formData.asset_id || !formData.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user (admin)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Record the deposit
      const { data: deposit, error: depositError } = await supabase
        .from("deposits")
        .insert({
          user_id: formData.investor_id,
          asset_symbol: assets.find((a) => a.id === parseInt(formData.asset_id))?.symbol || "USDT",
          amount: parseFloat(formData.amount),
          transaction_hash: formData.tx_hash || null,
          status: "confirmed",
          created_by: user.id,
        })
        .select()
        .single();

      if (depositError) throw depositError;

      // Update portfolio balance (using positions table)
      const selectedAsset = assets.find((a) => a.id === parseInt(formData.asset_id));
      const assetCode =
        (selectedAsset?.symbol as "BTC" | "ETH" | "SOL" | "USDT" | "USDC" | "EURC") || "USDT";

      const { data: existingPosition } = await supabase
        .from("positions")
        .select("*")
        .eq("user_id", formData.investor_id)
        .eq("asset_code", assetCode)
        .maybeSingle();

      if (existingPosition) {
        // Update existing position
        const { error: updateError } = await supabase
          .from("positions")
          .update({
            current_balance: existingPosition.current_balance + parseFloat(formData.amount),
            principal: existingPosition.principal + parseFloat(formData.amount),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPosition.id);

        if (updateError) throw updateError;
      } else {
        // Create new position entry
        const { error: createError } = await supabase.from("positions").insert({
          user_id: formData.investor_id,
          asset_code: assetCode,
          current_balance: parseFloat(formData.amount),
          principal: parseFloat(formData.amount),
          total_earned: 0,
        });

        if (createError) throw createError;
      }

      // Skip transaction recording for now - needs proper schema alignment
      console.log("Deposit recorded successfully, skipping transaction log");

      // Log to audit trail
      const { error: auditError } = await supabase.from("audit_log").insert({
        actor_user: user.id,
        action: "CREATE_DEPOSIT",
        entity: "deposits",
        entity_id: deposit.id,
        new_values: {
          investor_id: formData.investor_id,
          asset_id: formData.asset_id,
          amount: formData.amount,
          tx_hash: formData.tx_hash,
        },
        meta: {
          notes: formData.notes,
        },
      });

      if (auditError) console.error("Audit log error:", auditError);

      toast({
        title: "Deposit Recorded",
        description: `Successfully added ${formData.amount} ${assets.find((a) => a.id === parseInt(formData.asset_id))?.symbol} deposit`,
      });

      // Reset form
      setFormData({
        investor_id: "",
        asset_id: "",
        amount: "",
        tx_hash: "",
        notes: "",
      });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Deposit error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record deposit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record New Deposit</CardTitle>
        <CardDescription>
          Add a new deposit for an investor. This will update their portfolio balance immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="investor">Investor *</Label>
              <Select
                value={formData.investor_id}
                onValueChange={(value) => setFormData({ ...formData, investor_id: value })}
                disabled={loading}
              >
                <SelectTrigger id="investor">
                  <SelectValue placeholder="Select investor" />
                </SelectTrigger>
                <SelectContent>
                  {investors.map((investor) => (
                    <SelectItem key={investor.id} value={investor.id}>
                      {investor.first_name} {investor.last_name} ({investor.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset">Asset *</Label>
              <Select
                value={formData.asset_id}
                onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
                disabled={loading}
              >
                <SelectTrigger id="asset">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id.toString()}>
                      {asset.symbol} - {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.000001"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx_hash">Transaction Hash</Label>
              <Input
                id="tx_hash"
                type="text"
                placeholder="Optional blockchain transaction hash"
                value={formData.tx_hash}
                onChange={(e) => setFormData({ ...formData, tx_hash: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              type="text"
              placeholder="Optional notes about this deposit"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={loading}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Record Deposit
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminDepositForm;
