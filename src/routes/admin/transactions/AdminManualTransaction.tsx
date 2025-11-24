import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { adminTransactionService } from "@/services/adminTransactionService";
import { Loader2, ArrowRightLeft, DollarSign } from "lucide-react";

// Form Schema
const transactionSchema = z.object({
  investorId: z.string().min(1, "Investor is required"),
  fundId: z.string().min(1, "Fund is required"),
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  description: z.string().optional(),
  txHash: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export default function AdminManualTransaction() {
  const [investors, setInvestors] = useState<{ id: string; name: string; email: string }[]>([]);
  const [funds, setFunds] = useState<{ id: string; name: string; code: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "DEPOSIT",
      amount: "",
      description: "",
      txHash: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Investors
        const { data: investorsData } = await supabase
          .from("profiles") // Using profiles assuming joined with investors or role check
          .select("id, first_name, last_name, email")
          .eq("role", "investor"); // Assuming role column or join logic

        // Fetch Funds
        const { data: fundsData } = await supabase
          .from("funds")
          .select("id, name, code")
          .eq("status", "active");

        // Fallback mapping if profiles table structure differs (using direct table if needed)
        // Ideally we query the 'investors' view/table if it exists and links to profiles
        // For now using profiles directly

        if (investorsData) {
          // We actually need the 'investor_id' which is usually the same as profile_id or linked
          // Let's assume profiles.id IS the investor_id or we need to look up 'investors' table
          // Based on previous files, 'investors' table has 'id' and 'profile_id'.
          // Let's query 'investors' table instead for safety.
          const { data: realInvestors } = await supabase
            .from("investors")
            .select("id, email, name"); // Assuming name/email denormalized or joined
          // If investors table is simple:
          setInvestors(
            realInvestors?.map((i: any) => ({
              id: i.id,
              name: i.name || i.email,
              email: i.email,
            })) || []
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
      await adminTransactionService.createTransaction({
        investorId: data.investorId,
        fundId: data.fundId,
        type: data.type,
        amount: parseFloat(data.amount),
        description: data.description,
        txHash: data.txHash,
      });

      toast({
        title: "Transaction Created",
        description: `Successfully created ${data.type.toLowerCase()} of ${data.amount}.`,
      });

      form.reset({
        type: "DEPOSIT",
        amount: "",
        description: "",
        txHash: "",
        investorId: "", // Reset selections too if desired
        fundId: "",
      });
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
    return <div className="p-8 text-center">Loading form data...</div>;
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
                onValueChange={(val) => form.setValue("investorId", val)}
                defaultValue={form.getValues("investorId")}
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
                <p className="text-sm text-red-500">{form.formState.errors.investorId.message}</p>
              )}
            </div>

            {/* Fund Selection */}
            <div className="space-y-2">
              <Label>Fund</Label>
              <Select
                onValueChange={(val) => form.setValue("fundId", val)}
                defaultValue={form.getValues("fundId")}
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
                <p className="text-sm text-red-500">{form.formState.errors.fundId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  onValueChange={(val: "DEPOSIT" | "WITHDRAWAL") => form.setValue("type", val)}
                  defaultValue={form.getValues("type")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPOSIT">Deposit</SelectItem>
                    <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...form.register("amount")}
                    placeholder="0.00"
                    className="pl-9"
                    type="number"
                    step="any"
                  />
                </div>
                {form.formState.errors.amount && (
                  <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
                )}
              </div>
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
