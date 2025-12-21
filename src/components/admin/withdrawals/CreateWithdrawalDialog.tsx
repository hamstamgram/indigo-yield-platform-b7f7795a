import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getAssetLogo, formatAssetAmount } from "@/utils/assets";

interface InvestorOption {
  id: string;
  email: string;
  displayName: string;
}

interface InvestorPosition {
  fund_id: string;
  current_value: number;
  shares: number;
  fund: {
    name: string;
    code: string;
    asset: string;
  };
}

const withdrawalSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
  withdrawal_type: z.enum(["partial", "full"], {
    required_error: "Withdrawal type is required",
  }),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional(),
});

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

interface CreateWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedInvestorId?: string;
}

export function CreateWithdrawalDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedInvestorId,
}: CreateWithdrawalDialogProps) {
  const [loading, setLoading] = useState(false);
  const [investors, setInvestors] = useState<InvestorOption[]>([]);
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("");
  const [investorSearchOpen, setInvestorSearchOpen] = useState(false);
  const [isLoadingInvestors, setIsLoadingInvestors] = useState(false);
  const [positions, setPositions] = useState<InvestorPosition[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [investorError, setInvestorError] = useState<string | null>(null);
  const [fundError, setFundError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      withdrawal_type: "partial",
    },
  });

  const withdrawalType = watch("withdrawal_type");

  // Load investors when dialog opens
  useEffect(() => {
    if (open) {
      loadInvestors();
      if (preselectedInvestorId) {
        setSelectedInvestorId(preselectedInvestorId);
      } else {
        setSelectedInvestorId("");
      }
      setSelectedFundId("");
      setPositions([]);
      setInvestorError(null);
      setFundError(null);
      reset();
    }
  }, [open, preselectedInvestorId, reset]);

  // Load positions when investor is selected
  useEffect(() => {
    if (selectedInvestorId) {
      loadPositions(selectedInvestorId);
    } else {
      setPositions([]);
      setSelectedFundId("");
    }
  }, [selectedInvestorId]);

  const loadInvestors = async () => {
    setIsLoadingInvestors(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .eq("is_admin", false)
        .order("email");

      if (error) throw error;

      const options: InvestorOption[] = (data || []).map((p) => ({
        id: p.id,
        email: p.email || "",
        displayName:
          p.first_name && p.last_name
            ? `${p.first_name} ${p.last_name}`
            : p.email || p.id,
      }));
      setInvestors(options);
    } catch (error) {
      console.error("Failed to load investors:", error);
      toast.error("Failed to load investors");
    } finally {
      setIsLoadingInvestors(false);
    }
  };

  const loadPositions = async (investorId: string) => {
    setIsLoadingPositions(true);
    try {
      const { data, error } = await supabase
        .from("investor_positions")
        .select(
          `
          fund_id,
          current_value,
          shares,
          funds:fund_id (
            name,
            code,
            asset
          )
        `
        )
        .eq("investor_id", investorId)
        .gt("current_value", 0);

      if (error) throw error;

      const mappedPositions: InvestorPosition[] = (data || []).map((p: any) => ({
        fund_id: p.fund_id,
        current_value: Number(p.current_value) || 0,
        shares: Number(p.shares) || 0,
        fund: p.funds || { name: "Unknown", code: "UNK", asset: "N/A" },
      }));

      setPositions(mappedPositions);
      
      // Auto-select first position if only one
      if (mappedPositions.length === 1) {
        setSelectedFundId(mappedPositions[0].fund_id);
      }
    } catch (error) {
      console.error("Failed to load positions:", error);
      toast.error("Failed to load investor positions");
    } finally {
      setIsLoadingPositions(false);
    }
  };

  const selectedInvestor = investors.find((i) => i.id === selectedInvestorId);
  const selectedPosition = positions.find((p) => p.fund_id === selectedFundId);

  const onSubmit = async (data: WithdrawalFormData) => {
    // Validate investor selection
    if (!selectedInvestorId) {
      setInvestorError("Please select an investor");
      return;
    }
    setInvestorError(null);

    // Validate fund selection
    if (!selectedFundId) {
      setFundError("Please select a fund position");
      return;
    }
    setFundError(null);

    const amount = Number(data.amount);

    // Check if amount exceeds position value
    if (selectedPosition && amount > selectedPosition.current_value) {
      toast.error(
        `Amount exceeds available balance: ${formatAssetAmount(
          selectedPosition.current_value,
          selectedPosition.fund.asset
        )}`
      );
      return;
    }

    try {
      setLoading(true);

      // Use RPC to create withdrawal request
      const { error } = await supabase.rpc("create_withdrawal_request", {
        p_investor_id: selectedInvestorId,
        p_fund_id: selectedFundId,
        p_amount: amount,
        p_type: data.withdrawal_type,
        p_notes: data.notes || null,
      });

      if (error) throw error;

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });

      toast.success("Withdrawal request created successfully");
      reset();
      setSelectedInvestorId("");
      setSelectedFundId("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating withdrawal:", error);
      toast.error(error.message || "Failed to create withdrawal request");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setSelectedInvestorId("");
    setSelectedFundId("");
    setInvestorError(null);
    setFundError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Withdrawal Request</DialogTitle>
          <DialogDescription>
            Create a withdrawal request on behalf of an investor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Investor Selector */}
          <div className="space-y-2">
            <Label>Investor *</Label>
            <Popover open={investorSearchOpen} onOpenChange={setInvestorSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={investorSearchOpen}
                  className={cn(
                    "w-full justify-between",
                    investorError && "border-destructive"
                  )}
                  disabled={isLoadingInvestors}
                >
                  {isLoadingInvestors ? (
                    <span className="text-muted-foreground">Loading investors...</span>
                  ) : selectedInvestor ? (
                    <span className="truncate">
                      {selectedInvestor.displayName}
                      {selectedInvestor.displayName !== selectedInvestor.email && (
                        <span className="ml-1 text-muted-foreground">
                          ({selectedInvestor.email})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select investor...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name or email..." />
                  <CommandList>
                    <CommandEmpty>No investor found.</CommandEmpty>
                    <CommandGroup>
                      {investors.map((investor) => (
                        <CommandItem
                          key={investor.id}
                          value={`${investor.displayName} ${investor.email}`}
                          onSelect={() => {
                            setSelectedInvestorId(investor.id);
                            setSelectedFundId("");
                            setInvestorError(null);
                            setInvestorSearchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedInvestorId === investor.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{investor.displayName}</span>
                            {investor.displayName !== investor.email && (
                              <span className="text-xs text-muted-foreground">
                                {investor.email}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {investorError && <p className="text-sm text-destructive">{investorError}</p>}
          </div>

          {/* Fund Position Selector */}
          <div className="space-y-2">
            <Label>Fund Position *</Label>
            <Select
              value={selectedFundId}
              onValueChange={(value) => {
                setSelectedFundId(value);
                setFundError(null);
              }}
              disabled={!selectedInvestorId || isLoadingPositions}
            >
              <SelectTrigger className={fundError ? "border-destructive" : ""}>
                <SelectValue
                  placeholder={
                    isLoadingPositions
                      ? "Loading positions..."
                      : !selectedInvestorId
                      ? "Select an investor first"
                      : positions.length === 0
                      ? "No positions with balance"
                      : "Select fund position"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position.fund_id} value={position.fund_id}>
                    <div className="flex items-center gap-2">
                      <img
                        src={getAssetLogo(position.fund.asset)}
                        alt={position.fund.asset}
                        className="h-5 w-5 rounded-full"
                      />
                      <span>
                        {position.fund.name} -{" "}
                        {formatAssetAmount(position.current_value, position.fund.asset)} available
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fundError && <p className="text-sm text-destructive">{fundError}</p>}
            {selectedPosition && (
              <p className="text-sm text-muted-foreground">
                Maximum withdrawal:{" "}
                {formatAssetAmount(selectedPosition.current_value, selectedPosition.fund.asset)}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount ({selectedPosition?.fund.asset || "Select fund"}) *
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.00000001"
              placeholder="0.00"
              {...register("amount")}
              className={errors.amount ? "border-destructive" : ""}
              disabled={!selectedFundId}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          {/* Withdrawal Type */}
          <div className="space-y-2">
            <Label>Withdrawal Type *</Label>
            <Select
              value={withdrawalType}
              onValueChange={(value) => setValue("withdrawal_type", value as "partial" | "full")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select withdrawal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partial">Partial Withdrawal</SelectItem>
                <SelectItem value="full">Full Withdrawal</SelectItem>
              </SelectContent>
            </Select>
            {errors.withdrawal_type && (
              <p className="text-sm text-destructive">{errors.withdrawal_type.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this withdrawal request"
              {...register("notes")}
              className={errors.notes ? "border-destructive" : ""}
              rows={3}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || isLoadingInvestors || isLoadingPositions || positions.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Withdrawal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}