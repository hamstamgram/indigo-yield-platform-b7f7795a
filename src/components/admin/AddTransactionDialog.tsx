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
import { toast } from "sonner";
import { createAdminTransaction } from "@/services/shared/transactionService";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { INDIGO_FEES_ACCOUNT_ID } from "@/constants/fees";
import { useActiveFunds } from "@/hooks/useActiveFunds";
import { getAssetLogo } from "@/utils/assets";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface InvestorOption {
  id: string;
  email: string;
  displayName: string;
}

// Transaction validation schema
const transactionSchema = z.object({
  txn_type: z.enum(["DEPOSIT", "WITHDRAWAL", "YIELD", "INTEREST", "FEE"], {
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
    }
  }, [open, investorId]);

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
        displayName: p.first_name && p.last_name 
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

  const selectedInvestor = investors.find((i) => i.id === selectedInvestorId);

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

  const onSubmit = async (data: TransactionFormData) => {
    // Validate investor selection
    if (!selectedInvestorId) {
      setInvestorError("Please select an investor");
      return;
    }
    setInvestorError(null);

    // Block manual deposits to INDIGO FEES account
    if (selectedInvestorId === INDIGO_FEES_ACCOUNT_ID && data.txn_type === "DEPOSIT") {
      toast.error("INDIGO FEES cannot receive manual deposits. Fee credits are system-generated only.");
      return;
    }
    
    try {
      setLoading(true);

      const result = await createAdminTransaction({
        investorId: selectedInvestorId,
        fundId: data.fund_id,
        type: data.txn_type as "DEPOSIT" | "WITHDRAWAL" | "YIELD" | "INTEREST" | "FEE",
        asset: data.asset,
        amount: Number(data.amount),
        txDate: data.tx_date,
        referenceId: data.reference_id || undefined,
        txHash: data.tx_hash || undefined,
        notes: data.notes || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create transaction");
      }

      // Invalidate relevant queries to refresh data everywhere
      queryClient.invalidateQueries({ queryKey: ["admin-transactions-history"] });
      queryClient.invalidateQueries({ queryKey: ["investor-positions"] });
      queryClient.invalidateQueries({ queryKey: ["investor-transactions"] });

      toast.success("Transaction created successfully");
      reset();
      setSelectedInvestorId("");
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
            {investorError && (
              <p className="text-sm text-destructive">{investorError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="txn_type">Transaction Type *</Label>
            <Select value={txnType} onValueChange={(value) => setValue("txn_type", value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEPOSIT">Deposit</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
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
            <Label htmlFor="tx_date">Transaction Date *</Label>
            <Input
              id="tx_date"
              type="date"
              {...register("tx_date")}
              className={errors.tx_date ? "border-destructive" : ""}
            />
            {errors.tx_date && <p className="text-sm text-destructive">{errors.tx_date.message}</p>}
          </div>

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