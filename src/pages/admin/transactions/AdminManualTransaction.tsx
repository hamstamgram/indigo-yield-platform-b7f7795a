import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks";
import { supabase } from "@/integrations/supabase/client";
import { createAdminTransaction, type CreateTransactionParams } from "@/services/shared/transactionService";
import { saveDraftAUMEntry } from "@/services/admin/yieldDistributionService";
import { Loader2, ArrowRightLeft, Info, AlertTriangle, Check, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { QUERY_KEYS } from "@/constants/queryKeys";

// Form Schema - aligned with AddTransactionDialog
const transactionSchema = z.object({
  investorId: z.string().min(1, "Investor is required"),
  fundId: z.string().min(1, "Fund is required"),
  type: z.enum(["FIRST_INVESTMENT", "DEPOSIT", "WITHDRAWAL"]),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  txDate: z.string().min(1, "Transaction date is required"),
  description: z.string().optional(),
  txHash: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export default function AdminManualTransaction() {
  const [investors, setInvestors] = useState<{ id: string; name: string; email: string }[]>([]);
  const [funds, setFunds] = useState<{ id: string; name: string; code: string; asset: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [hasTransactionHistory, setHasTransactionHistory] = useState<boolean>(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  
  // AUM check state
  const [aumExists, setAumExists] = useState<boolean | null>(null);
  const [isCheckingAum, setIsCheckingAum] = useState(false);
  const [showAumForm, setShowAumForm] = useState(false);
  const [aumValue, setAumValue] = useState<string>("");
  const [isRecordingAum, setIsRecordingAum] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "DEPOSIT",
      amount: "",
      txDate: new Date().toISOString().split("T")[0],
      description: "",
      txHash: "",
    },
  });

  const selectedInvestorId = form.watch("investorId");
  const selectedFundId = form.watch("fundId");
  const txnType = form.watch("type");
  const txDate = form.watch("txDate");

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
    setShowAumForm(false);
  }, [selectedFundId, txDate]);

  // Handle AUM recording
  const handleRecordAum = async () => {
    if (!aumValue || !selectedFundId || !txDate) {
      toast({
        title: "Error",
        description: "Please enter an AUM value",
        variant: "destructive",
      });
      return;
    }

    const numericAum = Number(aumValue);
    if (isNaN(numericAum) || numericAum < 0) {
      toast({
        title: "Error",
        description: "AUM must be a valid positive number",
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: "AUM recorded successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundAumAll });
    } catch (error) {
      console.error("Error recording AUM:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to record AUM";
      toast({
        title: "Error",
        description: errorMsg.includes("Permission") 
          ? "Permission denied: Admin access required." 
          : errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsRecordingAum(false);
    }
  };

  // Check investor's current balance and transaction history when investor/fund changes
  useEffect(() => {
    const checkBalanceAndHistory = async () => {
      if (!selectedInvestorId || !selectedFundId) {
        setCurrentBalance(null);
        setHasTransactionHistory(false);
        return;
      }
      
      setIsCheckingBalance(true);
      try {
        // Check current position balance
        const { data: positionData } = await supabase
          .from("investor_positions")
          .select("current_value")
          .eq("investor_id", selectedInvestorId)
          .eq("fund_id", selectedFundId)
          .maybeSingle();
        
        // Also check for any existing transaction history (deposits indicate prior investment)
        const { count: txCount } = await supabase
          .from("transactions_v2")
          .select("id", { count: "exact", head: true })
          .eq("investor_id", selectedInvestorId)
          .eq("fund_id", selectedFundId)
          .eq("type", "DEPOSIT");
        
        setCurrentBalance(positionData?.current_value ?? 0);
        setHasTransactionHistory((txCount ?? 0) > 0);
      } catch (error) {
        console.error("Error checking balance:", error);
        setCurrentBalance(0);
        setHasTransactionHistory(false);
      } finally {
        setIsCheckingBalance(false);
      }
    };
    
    checkBalanceAndHistory();
  }, [selectedInvestorId, selectedFundId]);

  // Auto-select transaction type based on balance (only auto-switch away from invalid FIRST_INVESTMENT)
  useEffect(() => {
    if (currentBalance === null || isCheckingBalance) return;
    
    // Only auto-switch from FIRST_INVESTMENT to DEPOSIT if position exists
    if (currentBalance > 0 && txnType === "FIRST_INVESTMENT") {
      form.setValue("type", "DEPOSIT");
    }
  }, [currentBalance, isCheckingBalance, txnType, form]);

  // Only force FIRST_INVESTMENT if balance is 0 AND no prior transactions exist
  const isFirstInvestment = currentBalance !== null && currentBalance === 0 && !hasTransactionHistory;
  const hasExistingPosition = currentBalance !== null && (currentBalance > 0 || hasTransactionHistory);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Investors directly from profiles table
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .eq("status", "active")
          .eq("is_admin", false)
          .order("first_name");

        if (profilesError) throw profilesError;

        // Fetch Funds
        const { data: fundsData, error: fundsError } = await supabase
          .from("funds")
          .select("id, name, code, asset")
          .eq("status", "active");

        if (fundsError) throw fundsError;

        if (profilesData) {
          setInvestors(
            profilesData.map((p) => ({
              id: p.id,
              name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
              email: p.email,
            }))
          );
        }

        if (fundsData) {
          setFunds(fundsData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (data: TransactionFormValues) => {
    setIsSubmitting(true);
    try {
      const selectedFund = funds.find(f => f.id === data.fundId);
      if (!selectedFund) {
        throw new Error("Selected fund not found");
      }

      // Auto-create AUM record if it doesn't exist (for deposit/withdrawal transactions)
      const requiresAum = ["FIRST_INVESTMENT", "DEPOSIT", "WITHDRAWAL"].includes(data.type);
      if (requiresAum && aumExists === false) {
        console.log("Auto-creating AUM record for transaction...");
        try {
          const user = await supabase.auth.getUser();
          await saveDraftAUMEntry(
            data.fundId,
            new Date(data.txDate),
            0,
            "Auto-created for transaction",
            user.data.user?.id
          );
          setAumExists(true);
          console.log("AUM record auto-created successfully");
        } catch (aumError) {
          console.error("Failed to auto-create AUM:", aumError);
          const errorMsg = aumError instanceof Error ? aumError.message : "Failed to create AUM record";
          toast({
            title: "Error",
            description: errorMsg.includes("Permission") 
              ? "Permission denied: Admin access required." 
              : `Failed to prepare transaction: ${errorMsg}`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Use the unified createAdminTransaction service
      const result = await createAdminTransaction({
        investor_id: data.investorId,
        fund_id: data.fundId,
        type: data.type as CreateTransactionParams["type"],
        amount: parseFloat(data.amount),
        tx_date: data.txDate,
        asset: selectedFund.asset,
        notes: data.description,
        tx_hash: data.txHash,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create transaction");
      }

      // Comprehensive cache invalidation using centralized helper
      invalidateAfterTransaction(queryClient, data.investorId, data.fundId);

      toast({
        title: "Transaction Created",
        description: `Successfully created ${data.type.toLowerCase().replace(/_/g, ' ')} of ${data.amount} ${selectedFund.asset}.`,
      });

      form.reset({
        type: "DEPOSIT",
        amount: "",
        txDate: new Date().toISOString().split("T")[0],
        description: "",
        txHash: "",
        investorId: "",
        fundId: "",
      });
      setCurrentBalance(null);
      setAumExists(null);
      setShowAumForm(false);
      setAumValue("");
    } catch (error: any) {
      console.error("Transaction error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create transaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading form data...</span>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            Manual Transaction
          </CardTitle>
          <CardDescription>
            Manually record a deposit or withdrawal for an investor. This will update their ledger
            and position.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Investor Selection */}
            <div className="space-y-2">
              <Label>Investor</Label>
              <Select
                value={form.watch("investorId") || ""}
                onValueChange={(val) => form.setValue("investorId", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Investor" />
                </SelectTrigger>
                <SelectContent>
                  {investors.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.name} ({inv.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.investorId && (
                <p className="text-sm text-destructive">{form.formState.errors.investorId.message}</p>
              )}
            </div>

            {/* Fund Selection */}
            <div className="space-y-2">
              <Label>Fund</Label>
              <Select
                value={form.watch("fundId") || ""}
                onValueChange={(val) => form.setValue("fundId", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Fund" />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.name} ({fund.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.fundId && (
                <p className="text-sm text-destructive">{form.formState.errors.fundId.message}</p>
              )}
            </div>

            {/* Balance indicator */}
            {selectedInvestorId && selectedFundId && (
              <Alert variant="default" className="py-2">
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

            <div className="grid grid-cols-2 gap-4">
              {/* Type Selection - aligned with AddTransactionDialog */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.watch("type") || ""}
                  onValueChange={(val: "FIRST_INVESTMENT" | "DEPOSIT" | "WITHDRAWAL") => form.setValue("type", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem 
                      value="FIRST_INVESTMENT"
                      disabled={hasExistingPosition}
                      className={cn(hasExistingPosition && "opacity-50")}
                    >
                      First Investment {hasExistingPosition && "(position exists)"}
                    </SelectItem>
                    {/* Deposit is always available */}
                    <SelectItem value="DEPOSIT">
                      Deposit / Top-up
                    </SelectItem>
                    <SelectItem 
                      value="WITHDRAWAL"
                      disabled={isFirstInvestment}
                      className={cn(isFirstInvestment && "opacity-50")}
                    >
                      Withdrawal {isFirstInvestment && "(no position)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  {...form.register("amount")}
                  placeholder="0.00000000"
                  type="number"
                  step="any"
                />
                {form.formState.errors.amount && (
                  <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
                )}
              </div>
            </div>

            {/* Transaction Date */}
            <div className="space-y-2">
              <Label>Transaction Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !txDate && "text-muted-foreground"
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
                    onSelect={(date) => date && form.setValue("txDate", format(date, "yyyy-MM-dd"))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.txDate && (
                <p className="text-sm text-destructive">{form.formState.errors.txDate.message}</p>
              )}
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
                        <strong>No AUM recorded</strong> for this fund on {txDate}.
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
                            Total Fund AUM
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

            {/* Optional Fields */}
            <div className="space-y-2">
              <Label>Transaction Hash (Optional)</Label>
              <Input {...form.register("txHash")} placeholder="0x..." />
            </div>

            <div className="space-y-2">
              <Label>Description / Notes</Label>
              <Textarea {...form.register("description")} placeholder="Admin notes..." />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || (aumExists === false && showAumForm)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Create Transaction"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
