import { useState } from "react";
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
import { useToast } from "@/hooks";
import { MinusCircle, Info } from "lucide-react";

interface AdminWithdrawalFormProps {
  investors: any[];
  assets: any[];
}

const AdminWithdrawalForm: React.FC<AdminWithdrawalFormProps> = ({ investors, assets }) => {
  const availableBalance = 0;
  const [formData, setFormData] = useState({
    investor_id: "",
    asset_id: "",
    amount: "",
    notes: "",
  });
  const { toast } = useToast();

  // Temporarily disable the form during schema migration
  const isDisabled = true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    toast({
      title: "Feature Temporarily Disabled",
      description: "Withdrawal processing is being updated for the new database schema",
      variant: "destructive",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Process Withdrawal</CardTitle>
        <CardDescription>
          Record a withdrawal for an investor. This will update their portfolio balance immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <Info className="h-5 w-5 text-yellow-600" />
          <div className="text-sm text-yellow-800">
            This feature is temporarily unavailable while we update the database schema. All
            existing investor data remains safe and accessible.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 opacity-50">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="investor">Investor *</Label>
              <Select
                value={formData.investor_id}
                onValueChange={(value) => setFormData({ ...formData, investor_id: value })}
                disabled={isDisabled}
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
                disabled={isDisabled}
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
                disabled={isDisabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Available Balance</Label>
              <div className="p-2 bg-muted rounded border">{availableBalance.toFixed(6)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              type="text"
              placeholder="Optional notes about this withdrawal"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={isDisabled}
            />
          </div>

          <Button type="submit" disabled={isDisabled} className="w-full">
            <MinusCircle className="mr-2 h-4 w-4" />
            Process Withdrawal (Temporarily Disabled)
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminWithdrawalForm;
