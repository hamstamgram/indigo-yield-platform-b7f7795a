import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { createAdminTransaction } from "@/services/shared/transactionService";
import { fetchInvestorsForSelector } from "@/services/investor";
import { saveDraftAUMEntry } from "@/services/admin/yieldDistributionService";
import { Loader2, Check, ChevronsUpDown, AlertTriangle, Info, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { INDIGO_FEES_ACCOUNT_ID } from "@/constants/fees";
import { useActiveFunds } from "@/hooks";
import { getAssetLogo } from "@/utils/assets";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
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
  const [investors, setInvestors] = useState<InvestorOption[]>([]);
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("");
  const [investorSearchOpen, setInvestorSearchOpen] = useState(false);
  const [isLoadingInvestors, setIsLoadingInvestors] = useState(false);
  const [investorError, setInvestorError] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  
  // AUM check state
  const [aumExists, setAumExists] = useState<boolean | null>(null);
  const [isCheckingAum, setIsCheckingAum] = useState(false);
  const [showAumForm, setShowAumForm] = useState(false);
  const [aumValue, setAumValue] = useState<string>("");
  const [isRecordingAum, setIsRecordingAum] = useState(false);
  
  const queryClient = useQueryClient();
  const { data: funds, isLoading: fundsLoading } = useActiveFunds();

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
      tx_date: new Date().toISOString().split("T")[0],
      fund_id: fundId || "",
      asset: "",
    },
  });

  const txnType = watch("txn_type");
  const selectedFundId = watch("fund_id");
  const txDate = watch("tx_date");

  // Check investor's current balance in selected fund
  useEffect(() => {
    const checkBalance = async () => {
      if (!selectedInvestorId || !selectedFundId) {
        setCurrentBalance(null);
        return;
      }
      
      setIsCheckingBalance(true);
      try {
        const { data } = await supabase
          .from("investor_positions")
          .select("current_value")
          .eq("investor_id", selectedInvestorId)
          .eq("fund_id", selectedFundId)
          .maybeSingle();
        
        setCurrentBalance(data?.current_value ?? 0);
      } catch (error) {
        console.error("Error checking balance:", error);
        setCurrentBalance(0);
      } finally {
        setIsCheckingBalance(false);
      }
    };
    
    checkBalance();
  }, [selectedInvestorId, selectedFundId]);

  // Check AUM existence when fund and date are selected
  useEffect(() => {
    const checkAumExists = async () => {
      if (!selectedFundId || !txDate) {
        setAumExists(null);
        setShowAumForm(false);
        return;
      }
      
      setIsCheckingAum(true);
      try {
        const { data, error } = await supabase
          .from("fund_daily_aum")
          .select("id")
          .eq("fund_id", selectedFundId)
          .eq("aum_date", txDate)
          .eq("purpose", "transaction")
          .maybeSingle();
        
        if (error) {
          console.error("Error checking AUM:", error);
          setAumExists(null);
        } else {
          setAumExists(!!data);
        }
      } catch (error) {
        console.error("Error checking AUM:", error);
        setAumExists(null);
      } finally {
        setIsCheckingAum(false);
      }
    };
    
    checkAumExists();
    setShowAumForm(false); // Reset form visibility on fund/date change
  }, [selectedFundId, txDate]);

  // Auto-select transaction type based on balance
  useEffect(() => {
    if (currentBalance === null || isCheckingBalance) return;
    
    // Only auto-select if no type is selected yet
    if (!txnType) {
      if (currentBalance === 0) {
        setValue("txn_type", "FIRST_INVESTMENT");
      }
    }
    // Clear invalid selection when balance changes
    else if (currentBalance === 0 && txnType === "DEPOSIT") {
      setValue("txn_type", "FIRST_INVESTMENT");
    }
    else if (currentBalance > 0 && txnType === "FIRST_INVESTMENT") {
      setValue("txn_type", "DEPOSIT");
    }
  }, [currentBalance, isCheckingBalance, txnType, setValue]);

  // Clear transaction type when fund changes (balance may differ)
  useEffect(() => {
    if (selectedFundId && !fundId) {
      // Only clear if fund wasn't pre-selected
      setValue("txn_type", undefined as any);
    }
  }, [selectedFundId, fundId, setValue]);

  // Determine if this is a first investment scenario
  const isFirstInvestment = currentBalance !== null && currentBalance === 0;
  const hasExistingPosition = currentBalance !== null && currentBalance > 0;

  // Load investors when dialog opens
  useEffect(() => {
    if (open) {
      loadInvestors();
      // Set initial investor if provided
      if (investorId) {
        setSelectedInvestorId(investorId);
      } else {
        setSelectedInvestorId("");
      }
      setInvestorError(null);
      setCurrentBalance(null);
      setAumExists(null);
      setShowAumForm(false);
      setAumValue("");
    }
  }, [open, investorId]);

  const loadInvestors = async () => {
    setIsLoadingInvestors(true);
    try {
      const options = await fetchInvestorsForSelector();
      setInvestors(options);
    } catch (error) {
      console.error("Failed to load investors:", error);
      toast.error("Failed to load investors");
    } finally {
      setIsLoadingInvestors(false);
    }
  };

  const selectedInvestor = investors.find((i) => i.id === selectedInvestorId);
  const selectedFund = funds?.find((f) => f.id === selectedFundId);

  // Set initial fund and asset when dialog opens or fundId prop changes
  useEffect(() => {
    if (fundId && funds) {
      setValue("fund_id", fundId);
      const fund = funds.find(f => f.id === fundId);
      if (fund) {
        setValue("asset", fund.asset);
      }
    }
  }, [fundId, funds, setValue]);

  // Update asset when fund selection changes
  useEffect(() => {
    if (selectedFundId && funds) {
      const fund = funds.find(f => f.id === selectedFundId);
      if (fund) {
        setValue("asset", fund.asset);
      }
    }
  }, [selectedFundId, funds, setValue]);

  // Handle AUM recording
  const handleRecordAum = async () => {
    if (!aumValue || !selectedFundId || !txDate) {
      toast.error("Please enter an AUM value");
      return;
    }

    const numericAum = Number(aumValue);
    if (isNaN(numericAum) || numericAum < 0) {
      toast.error("AUM must be a valid positive number");
      return;
    }

    setIsRecordingAum(true);
    try {
      const user = await supabase.auth.getUser();
      await saveDraftAUMEntry(
        selectedFundId,
        new Date(txDate),
        numericAum,
        "Recorded for transaction creation",
        user.data.user?.id
      );
      
      setAumExists(true);
      setShowAumForm(false);
      setAumValue("");
      toast.success("AUM recorded successfully");
      
      // Invalidate AUM queries
      queryClient.invalidateQueries({ queryKey: ["fund-aum"] });
    } catch (error) {
      console.error("Error recording AUM:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to record AUM";
      // Show more helpful message for permission errors
      if (errorMsg.includes("Permission denied") || errorMsg.includes("policy")) {
        toast.error("Permission denied: You need admin access to record AUM.");
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsRecordingAum(false);
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    // Validate investor selection
    if (!selectedInvestorId) {
      setInvestorError("Please select an investor");
      return;
    }
    setInvestorError(null);

    // Block manual deposits to INDIGO FEES account
    if (selectedInvestorId === INDIGO_FEES_ACCOUNT_ID && (data.txn_type === "DEPOSIT" || data.txn_type === "FIRST_INVESTMENT")) {
      toast.error("INDIGO FEES cannot receive manual deposits. Fee credits are system-generated only.");
      return;
    }

    // Validate transaction type based on current balance
    if (isFirstInvestment && data.txn_type === "DEPOSIT") {
      toast.error("Use 'First Investment' when investor has no existing position in this fund.");
      return;
    }
    if (hasExistingPosition && data.txn_type === "FIRST_INVESTMENT") {
      toast.error("Cannot use 'First Investment' - investor already has a position. Use 'Deposit' instead.");
      return;
    }
    
    try {
      setLoading(true);

      // Auto-create AUM record if it doesn't exist (for deposit/withdrawal transactions)
      const requiresAum = ["FIRST_INVESTMENT", "DEPOSIT", "WITHDRAWAL"].includes(data.txn_type);
      if (requiresAum && aumExists === false) {
        console.log("Auto-creating AUM record for transaction...");
        try {
          const user = await supabase.auth.getUser();
          // Use 0 as default AUM - the transaction will update the position anyway
          await saveDraftAUMEntry(
            data.fund_id,
            new Date(data.tx_date),
            0,
            "Auto-created for transaction",
            user.data.user?.id
          );
          setAumExists(true);
          console.log("AUM record auto-created successfully");
        } catch (aumError) {
          console.error("Failed to auto-create AUM:", aumError);
          const errorMsg = aumError instanceof Error ? aumError.message : "Failed to create AUM record";
          if (errorMsg.includes("Permission denied") || errorMsg.includes("policy")) {
            toast.error("Permission denied: Admin access required to create transactions.");
          } else {
            toast.error(`Failed to prepare transaction: ${errorMsg}`);
          }
          setLoading(false);
          return;
        }
      }

      // The service now handles FIRST_INVESTMENT -> DEPOSIT mapping internally
      const result = await createAdminTransaction({
        investor_id: selectedInvestorId,
        fund_id: data.fund_id,
        type: data.txn_type as "FIRST_INVESTMENT" | "DEPOSIT" | "WITHDRAWAL" | "YIELD" | "INTEREST" | "FEE",
        asset: data.asset,
        amount: Number(data.amount),
        tx_date: data.tx_date,
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
      setCurrentBalance(null);
      setAumExists(null);
      setShowAumForm(false);
      setAumValue("");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setSelectedInvestorId("");
    setInvestorError(null);
    setAumExists(null);
    setShowAumForm(false);
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
                  className={cn(
                    "w-full justify-between",
                    investorError && "border-destructive"
                  )}
                  disabled={isLoadingInvestors}
                >
                  {isLoadingInvestors ? (
                    <span className="text-muted-foreground">Loading investors...</span>
                  ) : selectedInvestor ? (
                    <TooltipProvider>
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
                    </TooltipProvider>
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
            {investorError && (
              <p className="text-sm text-destructive">{investorError}</p>
            )}
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
                    <strong>Current balance:</strong> {currentBalance?.toFixed(8)} — Use "Deposit" for top-ups
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="txn_type">Transaction Type *</Label>
            <Select value={txnType} onValueChange={(value) => setValue("txn_type", value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                {/* Show First Investment if no position exists */}
                <SelectItem 
                  value="FIRST_INVESTMENT" 
                  disabled={hasExistingPosition}
                  className={cn(
                    hasExistingPosition && "opacity-50"
                  )}
                >
                  First Investment {hasExistingPosition && "(position exists)"}
                </SelectItem>
                {/* Show Deposit/Top-up if position exists */}
                <SelectItem 
                  value="DEPOSIT" 
                  disabled={isFirstInvestment}
                  className={cn(
                    isFirstInvestment && "opacity-50"
                  )}
                >
                  Deposit / Top-up {isFirstInvestment && "(no position yet)"}
                </SelectItem>
                <SelectItem 
                  value="WITHDRAWAL" 
                  disabled={isFirstInvestment}
                  className={cn(
                    isFirstInvestment && "opacity-50"
                  )}
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
            {errors.fund_id && (
              <p className="text-sm text-destructive">{errors.fund_id.message}</p>
            )}
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

          {/* AUM Warning and Inline Form */}
          {selectedFundId && txDate && (
            <>
              {isCheckingAum && (
                <Alert className="py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>Checking AUM for this date...</AlertDescription>
                </Alert>
              )}
              
              {!isCheckingAum && aumExists === false && (
                <Alert variant="destructive" className="py-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="space-y-3">
                    <p>
                      <strong>No AUM recorded</strong> for {selectedFund?.asset || "this fund"} on {txDate}.
                      Transactions require AUM data for proper allocation calculations.
                    </p>
                    
                    {!showAumForm ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAumForm(true)}
                        className="mt-2"
                      >
                        Record AUM Now
                      </Button>
                    ) : (
                      <div className="space-y-2 pt-2 border-t border-destructive/20">
                        <Label htmlFor="aum_value" className="text-sm">
                          Total Fund AUM ({selectedFund?.asset || "tokens"})
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="aum_value"
                            type="number"
                            step="0.00000001"
                            placeholder="Enter AUM value"
                            value={aumValue}
                            onChange={(e) => setAumValue(e.target.value)}
                            className="flex-1"
                            disabled={isRecordingAum}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleRecordAum}
                            disabled={isRecordingAum || !aumValue}
                          >
                            {isRecordingAum && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Record
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This will create an AUM record for yield distribution calculations.
                        </p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              {!isCheckingAum && aumExists === true && (
                <Alert className="py-2 border-green-500/50 bg-green-50 dark:bg-green-950/20">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    AUM recorded for {txDate}
                  </AlertDescription>
                </Alert>
              )}
            </>
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
            <Button 
              type="submit" 
              disabled={loading || fundsLoading || isLoadingInvestors || (aumExists === false && showAumForm)}
            >
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
