import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { format } from "date-fns";

interface InternalRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investorId: string;
  investorName: string;
}

export function InternalRouteDialog({
  open,
  onOpenChange,
  investorId,
  investorName,
}: InternalRouteDialogProps) {
  const queryClient = useQueryClient();
  const [fundId, setFundId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [reason, setReason] = useState<string>("");
  const [confirmText, setConfirmText] = useState<string>("");
  const [result, setResult] = useState<{
    transfer_id: string;
    debit_tx_id: string;
    credit_tx_id: string;
  } | null>(null);

  // Fetch investor positions for fund selection
  const { data: positions } = useQuery({
    queryKey: ["investor-positions-for-route", investorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_positions")
        .select(`
          fund_id,
          current_value,
          funds ( id, name, asset )
        `)
        .eq("investor_id", investorId)
        .gt("current_value", 0);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const selectedPosition = positions?.find((p) => p.fund_id === fundId);
  const maxAmount = selectedPosition?.current_value || 0;
  const selectedAsset = (selectedPosition?.funds as any)?.asset || "";

  const routeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("internal_route_to_fees", {
        p_from_investor_id: investorId,
        p_fund_id: fundId,
        p_amount: parseFloat(amount),
        p_effective_date: effectiveDate,
        p_reason: reason,
        p_admin_id: user.id,
      });

      if (error) throw error;
      
      const row = data?.[0];
      if (!row?.success) {
        throw new Error(row?.message || "Internal routing failed");
      }
      
      return row;
    },
    onSuccess: (data) => {
      setResult({
        transfer_id: data.transfer_id,
        debit_tx_id: data.debit_tx_id,
        credit_tx_id: data.credit_tx_id,
      });
      toast.success("Internal transfer completed successfully");
      invalidateAfterTransaction(queryClient, investorId, fundId);
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!fundId || !amount || !reason || confirmText !== "ROUTE") {
      toast.error("Please fill all fields and type ROUTE to confirm");
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast.error("Amount must be positive");
      return;
    }

    if (parseFloat(amount) > maxAmount) {
      toast.error(`Amount exceeds available balance (${maxAmount.toFixed(8)} ${selectedAsset})`);
      return;
    }

    routeMutation.mutate();
  };

  const handleClose = () => {
    setFundId("");
    setAmount("");
    setReason("");
    setConfirmText("");
    setResult(null);
    onOpenChange(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Internal Route to INDIGO FEES</DialogTitle>
          <DialogDescription>
            Transfer tokens from {investorName} to INDIGO FEES account.
            This is an internal ledger movement hidden from the investor.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Internal transfer completed successfully!
              </AlertDescription>
            </Alert>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-muted-foreground">Transfer ID:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs">{result.transfer_id.slice(0, 8)}...</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(result.transfer_id)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-muted-foreground">Debit TX:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs">{result.debit_tx_id.slice(0, 8)}...</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(result.debit_tx_id)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-muted-foreground">Credit TX:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs">{result.credit_tx_id.slice(0, 8)}...</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(result.credit_tx_id)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-amber-500/10 border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                This action will reduce the investor's balance and credit INDIGO FEES.
                The investor will NOT see this transaction.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Fund / Asset</Label>
                <Select value={fundId} onValueChange={setFundId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund..." />
                  </SelectTrigger>
                  <SelectContent>
                    {positions?.map((pos) => (
                      <SelectItem key={pos.fund_id} value={pos.fund_id}>
                        {(pos.funds as any)?.name} ({(pos.funds as any)?.asset}) - 
                        Balance: {Number(pos.current_value).toFixed(8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount ({selectedAsset || "tokens"})</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00000000"
                />
                {fundId && (
                  <p className="text-xs text-muted-foreground">
                    Available: {maxAmount.toFixed(8)} {selectedAsset}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Reason (required)</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Fee recovery, correction, internal settlement..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Type "ROUTE" to confirm</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="ROUTE"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  routeMutation.isPending ||
                  confirmText !== "ROUTE" ||
                  !fundId ||
                  !amount ||
                  !reason
                }
              >
                {routeMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Execute Transfer
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
