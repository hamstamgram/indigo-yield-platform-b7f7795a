import { useState, useEffect, useRef } from "react";
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
  Button,
  Input,
  Label,
  Textarea,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui";
import { toast } from "sonner";
import { Loader2, Check, ChevronsUpDown, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAssetAmount } from "@/utils/assets";
import { CryptoIcon } from "@/components/CryptoIcons";
import { NumericInput } from "@/components/common/NumericInput";
import { Badge } from "@/components/ui";
import {
  useInvestorOptions,
  usePositionsForWithdrawal,
  useAvailableBalance,
  useWithdrawalMutations,
} from "@/hooks/data";
// Removed useFundYieldLock

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
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("");
  const [investorSearchOpen, setInvestorSearchOpen] = useState(false);
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [investorError, setInvestorError] = useState<string | null>(null);
  const [fundError, setFundError] = useState<string | null>(null);
  // Ref-based guard to prevent double-submission (works even before React re-renders)
  const isSubmittingRef = useRef(false);

  // Data hooks
  const { data: investors = [], isLoading: isLoadingInvestors } = useInvestorOptions(open, true);
  const { data: positions = [], isLoading: isLoadingPositions } = usePositionsForWithdrawal(
    selectedInvestorId || null
  );

  // Available balance hook (accounts for pending withdrawals - security fix)
  const { data: availableBalanceData } = useAvailableBalance(
    selectedInvestorId || null,
    selectedFundId || null
  );

  // Mutation hook
  const { createMutation } = useWithdrawalMutations();

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

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (preselectedInvestorId) {
        setSelectedInvestorId(preselectedInvestorId);
      } else {
        setSelectedInvestorId("");
      }
      setSelectedFundId("");
      setInvestorError(null);
      setFundError(null);
      reset();
    }
  }, [open, preselectedInvestorId, reset]);

  // Auto-select first position when investor changes and has only one position
  useEffect(() => {
    if (positions.length === 1) {
      setSelectedFundId(positions[0].fund_id);
    } else if (!selectedInvestorId) {
      setSelectedFundId("");
    }
  }, [positions, selectedInvestorId]);

  const selectedInvestor = investors.find((i) => i.id === selectedInvestorId);
  const selectedPosition = positions.find((p) => p.fund_id === selectedFundId);

  // Auto-fill amount when "full" withdrawal is selected
  // Use a ref to track transition so admins can override the amount
  const prevWithdrawalTypeRef = useRef(withdrawalType);
  useEffect(() => {
    if (withdrawalType === "full" && prevWithdrawalTypeRef.current !== "full" && selectedFundId) {
      const maxAmount = availableBalanceData?.availableBalance ?? selectedPosition?.current_value;
      if (maxAmount != null) {
        setValue("amount", String(maxAmount), { shouldValidate: true });
      }
    }
    prevWithdrawalTypeRef.current = withdrawalType;
  }, [withdrawalType, selectedFundId, availableBalanceData, selectedPosition, setValue]);

  const onSubmit = async (data: WithdrawalFormData) => {
    // Double-submission guard - check ref immediately (before React re-renders)
    if (isSubmittingRef.current) {
      return;
    }

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

    const amount = parseFloat(data.amount);

    // Check if amount exceeds AVAILABLE balance (position minus pending withdrawals)
    const maxAmountRaw =
      availableBalanceData?.availableBalance ?? selectedPosition?.current_value ?? 0;
    const maxAmount = typeof maxAmountRaw === "string" ? parseFloat(maxAmountRaw) : maxAmountRaw;
    if (amount > maxAmount) {
      const hasPending = availableBalanceData && availableBalanceData.pendingWithdrawals > 0;
      toast.error(
        hasPending
          ? `Amount exceeds available balance. Position: ${formatAssetAmount(
              availableBalanceData.positionValue,
              selectedPosition?.fund.asset || "USD"
            )}, Pending: ${formatAssetAmount(
              availableBalanceData.pendingWithdrawals,
              selectedPosition?.fund.asset || "USD"
            )}, Available: ${formatAssetAmount(maxAmount, selectedPosition?.fund.asset || "USD")}`
          : `Amount exceeds available balance: ${formatAssetAmount(
              maxAmount,
              selectedPosition?.fund.asset || "USD"
            )}`
      );
      return;
    }

    // Set guard immediately before mutation
    isSubmittingRef.current = true;
    createMutation.mutate(
      {
        investorId: selectedInvestorId,
        fundId: selectedFundId,
        amount: String(amount),
        withdrawalType: data.withdrawal_type,
        notes: data.notes,
      },
      {
        onSuccess: () => {
          reset();
          setSelectedInvestorId("");
          setSelectedFundId("");
          isSubmittingRef.current = false;
          onSuccess();
          onOpenChange(false);
        },
        onError: () => {
          isSubmittingRef.current = false;
        },
      }
    );
  };

  const handleCancel = () => {
    reset();
    setSelectedInvestorId("");
    setSelectedFundId("");
    setInvestorError(null);
    setFundError(null);
    isSubmittingRef.current = false;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                  className={cn("w-full justify-between", investorError && "border-destructive")}
                  disabled={isLoadingInvestors}
                >
                  {isLoadingInvestors ? (
                    <span className="text-muted-foreground">Loading investors...</span>
                  ) : selectedInvestor ? (
                    <span className="truncate flex items-center gap-2">
                      {selectedInvestor.displayName}
                      {selectedInvestor.isSystemAccount && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                          <Shield className="h-3 w-3 mr-0.5" />
                          System
                        </Badge>
                      )}
                      {!selectedInvestor.isSystemAccount &&
                        selectedInvestor.displayName !== selectedInvestor.email && (
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
                            <span className="flex items-center gap-2">
                              {investor.displayName}
                              {investor.isSystemAccount && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1 py-0 font-mono"
                                >
                                  <Shield className="h-3 w-3 mr-0.5" />
                                  System
                                </Badge>
                              )}
                            </span>
                            {!investor.isSystemAccount &&
                              investor.displayName !== investor.email && (
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
                      <CryptoIcon symbol={position.fund.asset} className="h-5 w-5" />
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
            <NumericInput
              id="amount"
              asset={selectedPosition?.fund.asset || ""}
              value={watch("amount") || ""}
              onChange={(val) => setValue("amount", val, { shouldValidate: true })}
              placeholder="Enter amount"
              disabled={!selectedFundId}
              showFormatted
              className={errors.amount ? "border-destructive" : ""}
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
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                isLoadingInvestors ||
                isLoadingPositions ||
                positions.length === 0
              }
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Withdrawal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
