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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createAdminTransaction } from "@/services/shared/transactionService";
import { Loader2, ArrowRightLeft, Info } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
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

  // Check investor's current balance when investor/fund changes
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

  // Auto-select transaction type based on balance
  useEffect(() => {
    if (currentBalance === null || isCheckingBalance) return;
    
    if (currentBalance === 0 && txnType === "DEPOSIT") {
      form.setValue("type", "FIRST_INVESTMENT");
    } else if (currentBalance > 0 && txnType === "FIRST_INVESTMENT") {
      form.setValue("type", "DEPOSIT");
    }
  }, [currentBalance, isCheckingBalance, txnType, form]);

  const isFirstInvestment = currentBalance !== null && currentBalance === 0;
  const hasExistingPosition = currentBalance !== null && currentBalance > 0;

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

      // Use the unified createAdminTransaction service
      await createAdminTransaction({
        investor_id: data.investorId,
        fund_id: data.fundId,
        type: data.type,
        amount: parseFloat(data.amount),
        tx_date: data.txDate,
        asset: selectedFund.asset,
        notes: data.description,
        tx_hash: data.txHash,
      });

      // Comprehensive cache invalidation - matches AddTransactionDialog
      queryClient.invalidateQueries({ queryKey: ["investor-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["investor-ledger", data.investorId] });
      queryClient.invalidateQueries({ queryKey: ["investor-positions"] });
      queryClient.invalidateQueries({ queryKey: ["investor-positions", data.investorId] });
      queryClient.invalidateQueries({ queryKey: ["fund-aum"] });
      queryClient.invalidateQueries({ queryKey: ["fund-aum-unified"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });

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
                    <SelectItem 
                      value="DEPOSIT"
                      disabled={isFirstInvestment}
                      className={cn(isFirstInvestment && "opacity-50")}
                    >
                      Deposit / Top-up {isFirstInvestment && "(no position yet)"}
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
              <Input
                {...form.register("txDate")}
                type="date"
              />
              {form.formState.errors.txDate && (
                <p className="text-sm text-destructive">{form.formState.errors.txDate.message}</p>
              )}
            </div>

            {/* Optional Fields */}
            <div className="space-y-2">
              <Label>Transaction Hash (Optional)</Label>
              <Input {...form.register("txHash")} placeholder="0x..." />
            </div>

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
    </div>
  );
}
