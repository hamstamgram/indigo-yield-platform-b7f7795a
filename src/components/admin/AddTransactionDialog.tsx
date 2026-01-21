import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Badge,
  Calendar,
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
  Alert,
  AlertDescription,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { createAdminTransaction, fundService } from "@/services";
import type { CreateTransactionUIParams as CreateTransactionParams } from "@/types/domains/transaction";
import { Loader2, Check, ChevronsUpDown, Info, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { getTodayString } from "@/utils/dateUtils";
import { INDIGO_FEES_ACCOUNT_ID } from "@/constants/fees";
import {
  useActiveFunds,
  useInvestorBalance,
  useTransactionHistory,
  useInvestorsForTransaction,
} from "@/hooks";
import { getAssetLogo } from "@/utils/assets";
import { cn } from "@/lib/utils";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";

interface InvestorOption {
  id: string;
  email: string;
  displayName: string;
  isSystemAccount?: boolean;
}

// Transaction validation schema
const transactionSchema = z.object({
  txn_type: z.enum(["FIRST_INVESTMENT", "DEPOSIT", "WITHDRAWAL", "YIELD", "INTEREST", "FEE"], {
    required_error: "Transaction type is required",
  }),
  fund_id: z.string().uuid("Please select a valid fund"),
  asset: z.string().min(1, "Asset is required"),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    })
    .refine((val) => Number(val) <= 1000000000, {
      message: "Amount must be less than 1 billion",
    }),
  tx_date: z
    .string()
    .min(1, "Transaction date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
  closing_aum: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: "Preflow AUM must be a valid non-negative number",
    }),
  reference_id: z
    .string()
    .trim()
    .max(100, "Reference ID must be less than 100 characters")
    .optional(),
  tx_hash: z
    .string()
    .trim()
    .max(255, "Transaction hash must be less than 255 characters")
    .optional(),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investorId?: string;
  fundId?: string;
  onSuccess: () => void;
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  investorId,
  fundId,
  onSuccess,
}: AddTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("");
  const [investorSearchOpen, setInvestorSearchOpen] = useState(false);
  const [investorError, setInvestorError] = useState<string | null>(null);

  // AUM form state (for inline recording as fallback)
  const [aumValue, setAumValue] = useState<string>("");

  const queryClient = useQueryClient();
  const { data: funds, isLoading: fundsLoading } = useActiveFunds();
  const { data: investors = [], isLoading: isLoadingInvestors } = useInvestorsForTransaction(open);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      tx_date: getTodayString(),
      fund_id: fundId || "",
      asset: "",
    },
  });

  const txnType = watch("txn_type");
  const selectedFundId = watch("fund_id");
  const txDate = watch("tx_date");

  // Use React Query hooks for balance, transaction history, and AUM checks
  const { data: currentBalance, isLoading: isCheckingBalance } = useInvestorBalance(
    selectedInvestorId || undefined,
    selectedFundId || undefined
  );

  const { data: hasTransactionHistory = false } = useTransactionHistory(
    selectedInvestorId || undefined,
    selectedFundId || undefined
  );

  // Auto-select transaction type based on balance (only for initial selection, no forcing)
  useEffect(() => {
    if (currentBalance === null || currentBalance === undefined || isCheckingBalance) return;

    // Only auto-select if no type is selected yet
    if (!txnType) {
      if (currentBalance === 0 && !hasTransactionHistory) {
        setValue("txn_type", "FIRST_INVESTMENT");
      } else if (currentBalance > 0 || hasTransactionHistory) {
        setValue("txn_type", "DEPOSIT");
      }
    }
    // Only auto-switch from FIRST_INVESTMENT to DEPOSIT if position exists (not vice versa)
    else if (currentBalance > 0 && txnType === "FIRST_INVESTMENT") {
      setValue("txn_type", "DEPOSIT");
    }
  }, [currentBalance, isCheckingBalance, hasTransactionHistory, txnType, setValue]);

  // Clear transaction type when fund changes (balance may differ)
  useEffect(() => {
    if (selectedFundId && !fundId) {
      // Only clear if fund wasn't pre-selected
      // Reset transaction type - casting undefined is necessary due to form library constraints
      setValue("txn_type", undefined as unknown as TransactionFormData["txn_type"]);
    }
  }, [selectedFundId, fundId, setValue]);

  // Determine if this is a first investment scenario
  // Only force FIRST_INVESTMENT if balance is 0 AND no prior transactions exist
  const isFirstInvestment =
    currentBalance !== null &&
    currentBalance !== undefined &&
    currentBalance === 0 &&
    !hasTransactionHistory;
  const hasExistingPosition =
    currentBalance !== null &&
    currentBalance !== undefined &&
    (currentBalance > 0 || hasTransactionHistory);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      // Set initial investor if provided
      if (investorId) {
        setSelectedInvestorId(investorId);
      } else {
        setSelectedInvestorId("");
      }
      setInvestorError(null);
      setAumValue("");
    }
  }, [open, investorId]);

  const selectedInvestor = investors.find((i) => i.id === selectedInvestorId);
  const selectedFund = funds?.find((f) => f.id === selectedFundId);

  // Set initial fund and asset when dialog opens or fundId prop changes
  useEffect(() => {
    if (fundId && funds) {
      setValue("fund_id", fundId);
      const fund = funds.find((f) => f.id === fundId);
      if (fund) {
        setValue("asset", fund.asset);
      }
    }
  }, [fundId, funds, setValue]);

  // Update asset when fund selection changes
  useEffect(() => {
    if (selectedFundId && funds) {
      const fund = funds.find((f) => f.id === selectedFundId);
      if (fund) {
        setValue("asset", fund.asset);
      }
    }
  }, [selectedFundId, funds, setValue]);
  const onSubmit = async (data: TransactionFormData) => {
    // Validate investor selection
    if (!selectedInvestorId) {
      setInvestorError("Please select an investor");
      return;
    }
    setInvestorError(null);

    // Block manual deposits to INDIGO FEES account
    if (
      selectedInvestorId === INDIGO_FEES_ACCOUNT_ID &&
      (data.txn_type === "DEPOSIT" || data.txn_type === "FIRST_INVESTMENT")
    ) {
      toast.error(
        "INDIGO FEES cannot receive manual deposits. Fee credits are system-generated only."
      );
      return;
    }

    // Only block FIRST_INVESTMENT if position already exists
    if (hasExistingPosition && data.txn_type === "FIRST_INVESTMENT") {
      toast.error(
        "Cannot use 'First Investment' - investor already has a position. Use 'Deposit' instead."
      );
      return;
    }

    try {
      setLoading(true);

      // For DEPOSIT/WITHDRAWAL, require closing_aum (preflow AUM snapshot)
      const requiresAum = ["FIRST_INVESTMENT", "DEPOSIT", "WITHDRAWAL"].includes(data.txn_type);

      // Use the form's closing_aum field or the inline aumValue as fallback
      const closingAumValue = data.closing_aum || aumValue;

      if (requiresAum && !closingAumValue) {
        toast.error("Preflow AUM Snapshot is required for deposits and withdrawals.");
        setLoading(false);
        return;
      }

      // The service now handles FIRST_INVESTMENT -> DEPOSIT mapping internally
      const result = await createAdminTransaction({
        investor_id: selectedInvestorId,
        fund_id: data.fund_id,
        type: data.txn_type as CreateTransactionParams["type"],
        asset: data.asset,
        amount: data.amount, // Keep as string for NUMERIC precision preservation
        tx_date: data.tx_date,
        closing_aum: closingAumValue || undefined,
        event_ts: `${data.tx_date}T00:00:00.000Z`,
        reference_id: data.reference_id || undefined,
        tx_hash: data.tx_hash || undefined,
        notes: data.notes || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create transaction");
      }

      // Invalidate all relevant queries using centralized helper
      invalidateAfterTransaction(queryClient, selectedInvestorId, data.fund_id);

      toast.success("Transaction created successfully");
      reset();
      setSelectedInvestorId("");
      setAumValue("");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      logError("transaction.create", error, { fundId: selectedFundId });
      toast.error(error instanceof Error ? error.message : "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setSelectedInvestorId("");
    setInvestorError(null);
    setAumValue("");
    onOpenChange(false);
  };

  // Format investor display with truncation
  const formatInvestorDisplay = (investor: InvestorOption) => {
    const displayName = investor.displayName;
    const showEmail = displayName !== investor.email;
    return { displayName, email: showEmail ? investor.email : null };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Manually create a transaction for an investor. All fields are validated and logged.
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 min-w-0 max-w-[350px]">
                          <span className="truncate font-medium">
                            {selectedInvestor.displayName}
                          </span>
                          {selectedInvestor.displayName !== selectedInvestor.email && (
                            <span className="text-muted-foreground text-xs truncate max-w-[150px]">
                              ({selectedInvestor.email})
                            </span>
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[400px]">
                        <p className="font-medium">{selectedInvestor.displayName}</p>
                        {selectedInvestor.displayName !== selectedInvestor.email && (
                          <p className="text-sm text-muted-foreground">{selectedInvestor.email}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
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
                      {investors.map((investor) => {
                        const { displayName, email } = formatInvestorDisplay(investor);
                        return (
                          <CommandItem
                            key={investor.id}
                            value={`${investor.displayName} ${investor.email}`}
                            onSelect={() => {
                              setSelectedInvestorId(investor.id);
                              setInvestorError(null);
                              setInvestorSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                selectedInvestorId === investor.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate">{displayName}</span>
                                {investor.isSystemAccount && (
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                                    System
                                  </Badge>
                                )}
                              </div>
                              {email && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {email}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {investorError && <p className="text-sm text-destructive">{investorError}</p>}
          </div>

          {/* Balance indicator */}
          {selectedInvestorId && selectedFundId && (
            <Alert variant={isFirstInvestment ? "default" : "default"} className="py-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {isCheckingBalance ? (
                  "Checking balance..."
                ) : isFirstInvestment ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    <strong>No existing position</strong> — Use "First Investment" for deposits
                  </span>
                ) : (
                  <span>
                    <strong>Current balance:</strong> {currentBalance?.toFixed(8)} — Use "Deposit"
                    for top-ups
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="txn_type">Transaction Type *</Label>
            <Select
              value={txnType}
              onValueChange={(value) =>
                setValue("txn_type", value as TransactionFormData["txn_type"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                {/* Show First Investment - only disabled if position exists */}
                <SelectItem
                  value="FIRST_INVESTMENT"
                  disabled={hasExistingPosition}
                  className={cn(hasExistingPosition && "opacity-50")}
                >
                  First Investment {hasExistingPosition && "(position exists)"}
                </SelectItem>
                {/* Deposit is always available */}
                <SelectItem value="DEPOSIT">Deposit / Top-up</SelectItem>
                <SelectItem
                  value="WITHDRAWAL"
                  disabled={isFirstInvestment}
                  className={cn(isFirstInvestment && "opacity-50")}
                >
                  Withdrawal {isFirstInvestment && "(no position)"}
                </SelectItem>
                <SelectItem value="YIELD">Yield</SelectItem>
                <SelectItem value="INTEREST">Interest</SelectItem>
                <SelectItem value="FEE">Fee</SelectItem>
              </SelectContent>
            </Select>
            {errors.txn_type && (
              <p className="text-sm text-destructive">{errors.txn_type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fund_id">Fund *</Label>
            <Select
              value={selectedFundId}
              onValueChange={(value) => setValue("fund_id", value)}
              disabled={fundsLoading}
            >
              <SelectTrigger className={errors.fund_id ? "border-destructive" : ""}>
                <SelectValue placeholder={fundsLoading ? "Loading funds..." : "Select fund"} />
              </SelectTrigger>
              <SelectContent>
                {funds?.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    <div className="flex items-center gap-2">
                      <img
                        src={getAssetLogo(fund.asset)}
                        alt={fund.asset}
                        className="h-5 w-5 rounded-full"
                      />
                      <span>{fund.asset}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.fund_id && <p className="text-sm text-destructive">{errors.fund_id.message}</p>}
            <input type="hidden" {...register("asset")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.00000001"
              placeholder="0.00"
              {...register("amount")}
              className={errors.amount ? "border-destructive" : ""}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Transaction Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !txDate && "text-muted-foreground",
                    errors.tx_date && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {txDate ? format(new Date(txDate), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={txDate ? new Date(txDate) : undefined}
                  onSelect={(date) => date && setValue("tx_date", format(date, "yyyy-MM-dd"))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.tx_date && <p className="text-sm text-destructive">{errors.tx_date.message}</p>}
          </div>

          {/* Preflow AUM Snapshot - Required for DEPOSIT/WITHDRAWAL */}
          {selectedFundId &&
            txDate &&
            ["FIRST_INVESTMENT", "DEPOSIT", "WITHDRAWAL"].includes(txnType) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="closing_aum">
                    Preflow AUM Snapshot ({selectedFund?.asset || "tokens"}) *
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        The authoritative fund AUM <strong>immediately before</strong> this
                        transaction is applied. This is used to crystallize any accrued yield before
                        the capital flow.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <PreflowAumInput
                  fundId={selectedFundId}
                  txDate={txDate}
                  asset={selectedFund?.asset || "tokens"}
                  register={register}
                  setValue={setValue}
                  errorMessage={errors.closing_aum?.message}
                />
                <p className="text-xs text-muted-foreground">
                  Fund AUM snapshot used for yield crystallization before this{" "}
                  {txnType?.toLowerCase() || "transaction"}.
                </p>
              </div>
            )}

          <div className="space-y-2">
            <Label htmlFor="reference_id">Reference ID</Label>
            <Input
              id="reference_id"
              placeholder="Optional reference number"
              {...register("reference_id")}
              className={errors.reference_id ? "border-destructive" : ""}
            />
            {errors.reference_id && (
              <p className="text-sm text-destructive">{errors.reference_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx_hash">Transaction Hash</Label>
            <Input
              id="tx_hash"
              placeholder="Optional blockchain transaction hash"
              {...register("tx_hash")}
              className={errors.tx_hash ? "border-destructive" : ""}
            />
            {errors.tx_hash && <p className="text-sm text-destructive">{errors.tx_hash.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes about this transaction"
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
            <Button type="submit" disabled={loading || fundsLoading || isLoadingInvestors}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddTransactionDialog;

function PreflowAumInput(props: {
  fundId: string;
  txDate: string;
  asset: string;
  register: ReturnType<typeof useForm<TransactionFormData>>["register"];
  setValue: ReturnType<typeof useForm<TransactionFormData>>["setValue"];
  errorMessage?: string;
}) {
  const { fundId, txDate, asset, register, setValue, errorMessage } = props;
  const requiresCheck = Boolean(fundId && txDate);

  // Fetch LIVE AUM from positions - always use this as the source of truth
  const { data: liveNavData, isLoading } = useQuery({
    queryKey: ["fund-live-aum", fundId],
    queryFn: async () => {
      return fundService.getLatestNav(fundId);
    },
    enabled: requiresCheck,
    staleTime: 10_000,
  });

  const hasLiveAum = liveNavData?.aum !== undefined && liveNavData.aum !== null;

  // Auto-populate AUM value with LIVE AUM from positions
  useEffect(() => {
    if (liveNavData?.aum !== undefined && liveNavData.aum !== null) {
      setValue("closing_aum", String(liveNavData.aum), { shouldValidate: true });
    }
  }, [liveNavData?.aum, setValue]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading current fund AUM…</div>;
  }

  return (
    <div className="space-y-2">
      {hasLiveAum && (
        <span className="text-xs text-blue-600 font-medium">
          (Live: {Number(liveNavData.aum).toLocaleString()} {asset})
        </span>
      )}
      <Input
        id="closing_aum"
        type="number"
        step="0.00000001"
        min="0"
        placeholder={`Enter preflow AUM (${asset})`}
        {...register("closing_aum")}
        className={errorMessage ? "border-destructive" : ""}
      />
      <p className="text-xs text-muted-foreground">
        Fund AUM immediately before this transaction. Pre-filled with current positions total.
      </p>
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
    </div>
  );
}
