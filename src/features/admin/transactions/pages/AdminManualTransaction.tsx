import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { useToast } from "@/hooks";
import { createInvestorTransaction, createQuickTransaction } from "@/services/shared";
import type { CreateTransactionUIParams as CreateTransactionParams } from "@/types/domains/transaction";
import { Loader2, ArrowRightLeft, Info, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { formatAUM } from "@/utils/formatters";
import { useTransactionFormInvestors, useTransactionFormFunds, useTransactionFormBalanceCheck, useTransactionFormAumCheck } from "@/features/admin/transactions/hooks/useTransactionFormData";
import { logError } from "@/lib/logger";
import { getTodayString } from "@/utils/dateUtils";
import { PageShell } from "@/components/layout/PageShell";

import Decimal from "decimal.js";
// Form Schema — clean transaction form, no AUM/yield fields
const transactionSchema = z.object({
  investorId: z.string().min(1, "Investor is required"),
  fundId: z.string().min(1, "Fund is required"),
  type: z.enum(["FIRST_INVESTMENT", "DEPOSIT", "WITHDRAWAL"]),
  amount: z.string().refine((val) => {
    try {
      const d = new Decimal(val || "0");
      return d.gt(0);
    } catch {
      return false;
    }
  }, {
    message: "Amount must be a positive number",
  }),
  txDate: z.string().min(1, "Transaction date is required"),
  description: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export default function AdminManualTransaction() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: investors = [], isLoading: investorsLoading } = useTransactionFormInvestors();
  const { data: funds = [], isLoading: fundsLoading } = useTransactionFormFunds();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "DEPOSIT",
      amount: "",
      txDate: getTodayString(),
      description: "",
    },
  });

  const selectedInvestorId = form.watch("investorId");
  const selectedFundId = form.watch("fundId");
  const txnType = form.watch("type");
  const txDate = form.watch("txDate");

  // Balance check for selected investor + fund
  const { data: balanceCheck, isLoading: isCheckingBalance } = useTransactionFormBalanceCheck(
    selectedInvestorId,
    selectedFundId
  );

  // AUM pre-check for selected fund + date
  const { data: aumExists } = useTransactionFormAumCheck(selectedFundId, txDate);

  const currentBalance = balanceCheck?.currentBalance ?? null;
  const hasTransactionHistory = balanceCheck?.hasTransactionHistory ?? false;

  // Auto-correct transaction type based on balance
  useEffect(() => {
    if (currentBalance === null || isCheckingBalance) return;
    if (currentBalance > 0 && txnType === "FIRST_INVESTMENT") {
      form.setValue("type", "DEPOSIT");
    }
  }, [currentBalance, isCheckingBalance, txnType, form]);

  const isFirstInvestment =
    currentBalance !== null && currentBalance === 0 && !hasTransactionHistory;
  const hasExistingPosition =
    currentBalance !== null && (currentBalance > 0 || hasTransactionHistory);
  const isLoading = investorsLoading || fundsLoading;
  const selectedFundAsset = funds.find((f) => f.id === selectedFundId)?.asset || "tokens";

  const onSubmit = async (data: TransactionFormValues) => {
    setIsSubmitting(true);
    try {
      const selectedFund = funds.find((f) => f.id === data.fundId);
      if (!selectedFund) throw new Error("Selected fund not found");

      // Block FIRST_INVESTMENT if position exists
      if (hasExistingPosition && data.type === "FIRST_INVESTMENT") {
        throw new Error(
          "Cannot use 'First Investment' — investor already has a position. Use 'Deposit' instead."
        );
      }

      const result = await createInvestorTransaction({
        investor_id: data.investorId,
        fund_id: data.fundId,
        type: data.type as CreateTransactionParams["type"],
        asset: selectedFund.asset,
        amount: data.amount,
        tx_date: data.txDate,
        event_ts: `${data.txDate}T00:00:00.000Z`,
        reference_id: undefined,
        tx_hash: undefined,
        notes: data.description || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create transaction");
      }

      invalidateAfterTransaction(queryClient, data.investorId, data.fundId);

      toast({
        title: "Transaction Created",
        description: `${data.type.replace(/_/g, " ")} of ${data.amount} ${selectedFund.asset} recorded successfully.`,
      });

      form.reset({
        type: "DEPOSIT",
        amount: "",
        txDate: getTodayString(),
        description: "",
        investorId: "",
        fundId: "",
      });
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
    <PageShell maxWidth="narrow">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            Manual Transaction
          </CardTitle>
          <CardDescription>
            Record a deposit, first investment, or withdrawal. Yield distribution is handled
            separately via the "Record Yield" menu.
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
                <p className="text-sm text-destructive">
                  {form.formState.errors.investorId.message}
                </p>
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
                      <span className="flex items-center gap-2">
                        <CryptoIcon symbol={fund.asset} className="h-4 w-4" />
                        {fund.name}
                      </span>
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
                      <strong>Current balance:</strong>{" "}
                      {formatAUM(currentBalance ?? 0, selectedFundAsset)} — Use "Deposit" for
                      top-ups
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* AUM duplicate warning */}
            {aumExists && selectedFundId && txDate && (
              <Alert
                variant="default"
                className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 py-2"
              >
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                  An AUM record already exists for this fund on {txDate}. A pre-flow crystallization
                  may have already been recorded. Submitting will reuse the existing AUM snapshot.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.watch("type") || ""}
                  onValueChange={(val: "FIRST_INVESTMENT" | "DEPOSIT" | "WITHDRAWAL") =>
                    form.setValue("type", val)
                  }
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
                    <SelectItem value="DEPOSIT">Deposit / Top-up</SelectItem>
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
                  type="text"
                  inputMode="decimal"
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
                <PopoverContent className="w-[340px] p-0" align="start">
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

            {/* Description */}
            <div className="space-y-2">
              <Label>Description / Notes</Label>
              <Textarea {...form.register("description")} placeholder="Admin notes..." />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
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
    </PageShell>
  );
}
