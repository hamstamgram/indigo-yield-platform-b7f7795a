import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Button, Input, Label, Calendar,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Popover, PopoverContent, PopoverTrigger,
  Alert, AlertDescription,
} from "@/components/ui";
import { AlertTriangle, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { depositService, fundDailyAumService, profileService } from "@/services";
import { supabase } from "@/integrations/supabase/client";
import type { DepositFormData } from "@/types/domains";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateAfterDeposit } from "@/utils/cacheInvalidation";

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
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [aumValue, setAumValue] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  // Fetch users for dropdown (exclude system accounts like INDIGO FEES)
  const { data: users } = useQuery({
    queryKey: QUERY_KEYS.usersForDeposits,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, is_system_account")
        .eq("is_system_account", false)
        .order("first_name");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch funds to avoid free-text symbols
  const { data: funds } = useQuery({
    queryKey: QUERY_KEYS.fundsForDeposits,
    queryFn: () => profileService.getActiveFunds(),
    enabled: open,
  });

  // Check if AUM exists for the selected fund on selected date
  const { data: aumRecord, isLoading: isCheckingAum } = useQuery({
    queryKey: selectedFundId && formattedDate 
      ? QUERY_KEYS.fundAumCheck(selectedFundId, formattedDate) 
      : ["fund-aum-check"],
    queryFn: async () => {
      return fundDailyAumService.getByFundAndDate(selectedFundId, formattedDate);
    },
    enabled: !!selectedFundId && open,
  });

  const needsAum = selectedFundId && !isCheckingAum && !aumRecord;

  // Create AUM mutation
  const createAumMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFundId || !aumValue) {
        throw new Error("Fund and AUM value are required");
      }
      await fundDailyAumService.createAumRecord({
        fundId: selectedFundId,
        date: formattedDate,
        totalAum: parseFloat(aumValue),
        source: "manual_deposit_dialog",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundAum(selectedFundId) });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DepositFormData) => {
      // If AUM is needed, create it first
      if (needsAum && aumValue) {
        await createAumMutation.mutateAsync();
      }
      return depositService.createDeposit({
        ...data,
        tx_date: formattedDate,
      });
    },
    onSuccess: () => {
      toast.success("Deposit created successfully");
      invalidateAfterDeposit(queryClient, formData.user_id);
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create deposit: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      user_id: "",
      asset_symbol: "",
      amount: 0,
      transaction_hash: "",
    });
    setSelectedFundId("");
    setAumValue("");
    setSelectedDate(new Date());
  };

  // Update asset_symbol and selectedFundId together when fund is selected
  const handleFundChange = (fundId: string) => {
    setSelectedFundId(fundId);
    const fund = funds?.find((f) => f.id === fundId);
    if (fund) {
      setFormData({ ...formData, asset_symbol: (fund.asset || "").toUpperCase() });
    }
    setAumValue(""); // Reset AUM value when fund changes
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id || !formData.asset_symbol || formData.amount <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (needsAum && !aumValue) {
      toast.error("Please enter the fund AUM before creating the deposit");
      return;
    }

    createMutation.mutate(formData);
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const selectedFund = funds?.find((f) => f.id === selectedFundId);

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
              <Label htmlFor="asset_symbol">Fund / Asset *</Label>
              <Select value={selectedFundId} onValueChange={handleFundChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a fund" />
                </SelectTrigger>
                <SelectContent>
                  {funds?.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.name} ({(fund.asset || "").toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transaction Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
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
          </div>

          {/* AUM Warning and Input */}
          {needsAum && (
            <Alert variant="destructive" className="bg-warning/10 border-warning">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="ml-2">
                <div className="space-y-3">
                  <p className="font-medium">
                    No AUM record for {selectedFund?.name || "this fund"} on {formattedDate}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Enter the current fund AUM to record this deposit:
                  </p>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="aum_value" className="text-sm whitespace-nowrap">
                      Fund AUM ({selectedFund?.asset?.toUpperCase()}):
                    </Label>
                    <Input
                      id="aum_value"
                      type="number"
                      step="0.00000001"
                      min="0"
                      value={aumValue}
                      onChange={(e) => setAumValue(e.target.value)}
                      className="w-48"
                      placeholder="Enter AUM"
                    />
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || isCheckingAum}>
              {createMutation.isPending ? "Creating..." : "Create Deposit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
