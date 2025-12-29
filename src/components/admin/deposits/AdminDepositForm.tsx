import React, { useState } from "react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Calendar,
} from "@/components/ui";
import { useToast } from "@/hooks";
import { depositService } from "@/services/investor/depositService";
import { PlusCircle, Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
      // Map the selected asset to its symbol
      const selectedAsset = assets.find((a) => a.id === parseInt(formData.asset_id));
      const assetSymbol =
        (selectedAsset?.symbol as "BTC" | "ETH" | "SOL" | "USDT" | "EURC" | "xAUT" | "XRP") || "USDT";

      await depositService.createDeposit({
        user_id: formData.investor_id,
        asset_symbol: assetSymbol,
        amount: parseFloat(formData.amount),
        transaction_hash: formData.tx_hash || undefined,
        tx_date: format(selectedDate, "yyyy-MM-dd"),
      });

      const symbolLabel = (selectedAsset?.symbol || "ASSET").toUpperCase();
      toast({
        title: "Deposit Recorded",
        description: `Successfully added ${formData.amount} ${symbolLabel} deposit`,
      });

      // Reset form
      setFormData({
        investor_id: "",
        asset_id: "",
        amount: "",
        tx_hash: "",
        notes: "",
      });
      setSelectedDate(new Date());

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
              <Label htmlFor="asset">Fund / Asset *</Label>
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
                      {(asset.symbol || "").toUpperCase()} - {asset.name}
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
              <Label>Transaction Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={loading}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
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
