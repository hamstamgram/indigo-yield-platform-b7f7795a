import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Alert, AlertDescription,
  Calendar,
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui";
import { useToast } from "@/hooks";
import { supabase } from "@/integrations/supabase/client";
import { createAdminTransaction } from "@/services";
import type { CreateTransactionUIParams as CreateTransactionParams } from "@/types/domains/transaction";
import { processDepositWithYield, previewDepositYield, getCurrentFundAum, type YieldPreviewResult } from "@/services/admin/depositWithYieldService";
import { Loader2, ArrowRightLeft, Info, AlertTriangle, Check, CalendarIcon, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { invalidateAfterTransaction, invalidateAfterYieldOp } from "@/utils/cacheInvalidation";
import { toDecimal } from "@/utils/financial";
import {
  useTransactionFormInvestors,
  useTransactionFormFunds,
  useTransactionFormBalanceCheck,
} from "@/hooks/data/admin";
import { logError } from "@/lib/logger";

// Form Schema
const transactionSchema = z.object({
  investorId: z.string().min(1, "Investor is required"),
  fundId: z.string().min(1, "Fund is required"),
  type: z.enum(["FIRST_INVESTMENT", "DEPOSIT", "WITHDRAWAL"]),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  txDate: z.string().min(1, "Transaction date is required"),
  newTotalAum: z.string().optional(),
  description: z.string().optional(),
  txHash: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export default function AdminManualTransaction() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [yieldPreview, setYieldPreview] = useState<YieldPreviewResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [currentAum, setCurrentAum] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use hooks for data fetching
  const { data: investors = [], isLoading: investorsLoading } = useTransactionFormInvestors();
  const { data: funds = [], isLoading: fundsLoading } = useTransactionFormFunds();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "DEPOSIT",
      amount: "",
      txDate: new Date().toISOString().split("T")[0],
      newTotalAum: "",
      description: "",
      txHash: "",
    },
  });

  const selectedInvestorId = form.watch("investorId");
  const selectedFundId = form.watch("fundId");
  const txnType = form.watch("type");
  const txDate = form.watch("txDate");
  const depositAmount = form.watch("amount");
  const newTotalAum = form.watch("newTotalAum");

  // Use hook for balance check
  const { data: balanceCheck, isLoading: isCheckingBalance } = useTransactionFormBalanceCheck(
    selectedInvestorId,
    selectedFundId
  );

  const currentBalance = balanceCheck?.currentBalance ?? null;
  const hasTransactionHistory = balanceCheck?.hasTransactionHistory ?? false;

  // Load current AUM when fund changes
  useEffect(() => {
    if (!selectedFundId) {
      setCurrentAum(null);
      return;
    }

    getCurrentFundAum(selectedFundId)
      .then(setCurrentAum)
      .catch(() => setCurrentAum(null));
  }, [selectedFundId]);

  // Update yield preview when amount or AUM changes
  useEffect(() => {
    if (!selectedFundId || !depositAmount || !newTotalAum || txnType === "WITHDRAWAL") {
      setYieldPreview(null);
      return;
    }

    let amountDec;
    let aumDec;
    try {
      amountDec = toDecimal(depositAmount);
      aumDec = toDecimal(newTotalAum);
    } catch {
      setYieldPreview(null);
      return;
    }

    if (amountDec.lte(0) || aumDec.lte(0)) {
      setYieldPreview(null);
      return;
    }

    setIsLoadingPreview(true);
    previewDepositYield(selectedFundId, amountDec.toFixed(10), aumDec.toFixed(10))
      .then(setYieldPreview)
      .catch(() => setYieldPreview(null))
      .finally(() => setIsLoadingPreview(false));
  }, [selectedFundId, depositAmount, newTotalAum, txnType]);

  // Auto-select transaction type based on balance
  useEffect(() => {
    if (currentBalance === null || isCheckingBalance) return;
    
    if (currentBalance > 0 && txnType === "FIRST_INVESTMENT") {
      form.setValue("type", "DEPOSIT");
    }
  }, [currentBalance, isCheckingBalance, txnType, form]);

  const isFirstInvestment = currentBalance !== null && currentBalance === 0 && !hasTransactionHistory;
  const hasExistingPosition = currentBalance !== null && (currentBalance > 0 || hasTransactionHistory);
  const isDeposit = txnType === "DEPOSIT" || txnType === "FIRST_INVESTMENT";
  const isLoading = investorsLoading || fundsLoading;
  const yieldPreviewAum = yieldPreview ? toDecimal(yieldPreview.currentAum) : null;
  const yieldPreviewGross = yieldPreview ? toDecimal(yieldPreview.preDepositYield) : null;
  const yieldPreviewPct = yieldPreview ? toDecimal(yieldPreview.yieldPercentage) : null;
  const depositAmountDec = depositAmount ? toDecimal(depositAmount || "0") : null;

  const onSubmit = async (data: TransactionFormValues) => {
    setIsSubmitting(true);
    try {
      const selectedFund = funds.find(f => f.id === data.fundId);
      if (!selectedFund) {
        throw new Error("Selected fund not found");
      }

      // For deposits with AUM, use the combined yield + deposit flow
      if (isDeposit && data.newTotalAum) {
        let aumValue;
        try {
          aumValue = toDecimal(data.newTotalAum);
        } catch {
          throw new Error("Please enter a valid New Total AUM");
        }

        if (aumValue.lte(0)) {
          throw new Error("Please enter a valid New Total AUM");
        }

        const result = await processDepositWithYield({
          investorId: data.investorId,
          fundId: data.fundId,
          amount: toDecimal(data.amount).toFixed(10),
          newTotalAum: aumValue.toFixed(10),
          txDate: data.txDate,
          notes: data.description,
          txHash: data.txHash,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to process deposit");
        }

        // Invalidate caches
        invalidateAfterTransaction(queryClient, data.investorId, data.fundId);
        if (result.yieldDistributed > 0) {
          invalidateAfterYieldOp(queryClient);
        }

        const yieldMsg = result.yieldDistributed > 0 
          ? ` Yield of ${result.yieldDistributed.toFixed(8)} ${selectedFund.asset} distributed to ${result.yieldInvestorsAffected} investors.`
          : "";

        toast({
          title: "Transaction Created",
          description: `Successfully created ${data.type.toLowerCase().replace(/_/g, ' ')} of ${data.amount} ${selectedFund.asset}.${yieldMsg}`,
        });
      } else {
        // Standard transaction (withdrawal or deposit without AUM)
        const isFlow = data.type === "DEPOSIT" || data.type === "WITHDRAWAL" || data.type === "FIRST_INVESTMENT";
        if (isFlow && !data.newTotalAum) {
          throw new Error("New Total AUM is required for deposits/withdrawals (crystallize-before-flow).");
        }

        const result = await createAdminTransaction({
          investor_id: data.investorId,
          fund_id: data.fundId,
          type: data.type as CreateTransactionParams["type"],
          amount: toDecimal(data.amount).toFixed(10),
          tx_date: data.txDate,
          asset: selectedFund.asset,
          notes: data.description,
          tx_hash: data.txHash,
          closing_aum: data.newTotalAum || undefined,
          event_ts: `${data.txDate}T00:00:00.000Z`,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create transaction");
        }

        invalidateAfterTransaction(queryClient, data.investorId, data.fundId);

        toast({
          title: "Transaction Created",
          description: `Successfully created ${data.type.toLowerCase().replace(/_/g, ' ')} of ${data.amount} ${selectedFund.asset}.`,
        });
      }

      form.reset({
        type: "DEPOSIT",
        amount: "",
        txDate: new Date().toISOString().split("T")[0],
        newTotalAum: "",
        description: "",
        txHash: "",
        investorId: "",
        fundId: "",
      });
      setYieldPreview(null);
      setCurrentAum(null);
    } catch (error: unknown) {
      logError("AdminManualTransaction.onSubmit", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create transaction",
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
            Record a deposit or withdrawal. For deposits, enter the new total AUM to automatically distribute yield before the deposit is processed.
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
              {/* Type Selection */}
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

            {/* New Total AUM - Required for deposits */}
            {isDeposit && selectedFundId && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  New Total AUM
                  <span className="text-xs text-muted-foreground">(After yield + deposit)</span>
                </Label>
                <Input
                  {...form.register("newTotalAum")}
                  placeholder="Enter new total fund AUM"
                  type="text"
                  inputMode="decimal"
                />
                {currentAum !== null && (
                  <p className="text-xs text-muted-foreground">
                    Current AUM: {currentAum.toFixed(8)}
                  </p>
                )}
                {!newTotalAum && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Enter the new total AUM to calculate and distribute yield before this deposit.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Yield Preview */}
            {isDeposit && yieldPreview && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <TrendingUp className="h-4 w-4" />
                    Yield Preview
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Current AUM</p>
                      <p className="font-medium">{yieldPreviewAum?.toFixed(8)} {yieldPreview.fundAsset}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Yield to Distribute</p>
                      <p className={cn(
                        "font-medium",
                        yieldPreviewGross?.gt(0) ? "text-green-600" : "text-muted-foreground"
                      )}>
                        {yieldPreviewGross?.gt(0) ? "+" : ""}{yieldPreviewGross?.toFixed(8)} {yieldPreview.fundAsset}
                        {yieldPreviewGross?.gt(0) && (
                          <span className="text-xs ml-1">({yieldPreviewPct?.toFixed(4)}%)</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">This Deposit</p>
                      <p className="font-medium">+{depositAmountDec?.abs().toFixed(8)} {yieldPreview.fundAsset}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Investors Affected</p>
                      <p className="font-medium">{yieldPreview.investorCount} investors</p>
                    </div>
                  </div>
                  {yieldPreviewGross?.gt(0) && (
                    <Alert className="py-2 border-green-500/50 bg-green-50 dark:bg-green-950/20">
                      <Check className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700 dark:text-green-400 text-sm">
                        Yield will be distributed to {yieldPreview.investorCount} existing investors before the deposit is processed.
                      </AlertDescription>
                    </Alert>
                  )}
                  {yieldPreviewGross?.lte(0) && (
                    <Alert className="py-2">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        No yield to distribute. The deposit will be processed directly.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {isLoadingPreview && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating yield preview...
              </div>
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
              disabled={isSubmitting || (isDeposit && !newTotalAum)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                isDeposit && yieldPreview && yieldPreviewGross?.gt(0)
                  ? "Distribute Yield & Create Deposit"
                  : "Create Transaction"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
