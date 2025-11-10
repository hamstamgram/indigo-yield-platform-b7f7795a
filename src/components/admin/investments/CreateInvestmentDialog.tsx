import { useState, useEffect } from "react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { investmentFormSchema, type InvestmentFormValues } from "@/lib/validations/investment";
import { investmentService } from "@/services/investmentService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateInvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateInvestmentDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateInvestmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [investors, setInvestors] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: {
      investment_date: new Date().toISOString().split("T")[0],
      transaction_type: "initial",
    },
  });

  useEffect(() => {
    if (open) {
      loadInvestorsAndFunds();
    }
  }, [open]);

  const loadInvestorsAndFunds = async () => {
    try {
      const [investorsRes, fundsRes] = await Promise.all([
        supabase.from("investors").select("id, name, email").eq("status", "active"),
        supabase.from("funds").select("id, name, code").eq("status", "active"),
      ]);

      if (investorsRes.data) setInvestors(investorsRes.data);
      if (fundsRes.data) setFunds(fundsRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load investors and funds");
    }
  };

  const onSubmit = async (values: InvestmentFormValues) => {
    setLoading(true);
    try {
      await investmentService.createInvestment(values);
      toast.success("Investment created successfully");
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating investment:", error);
      toast.error(error.message || "Failed to create investment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Investment</DialogTitle>
          <DialogDescription>
            Enter investment details. The investment will be pending until approved.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="investor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select investor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {investors.map((investor) => (
                        <SelectItem key={investor.id} value={investor.id}>
                          {investor.name} ({investor.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fund_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fund" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {funds.map((fund) => (
                        <SelectItem key={fund.id} value={fund.id}>
                          {fund.name} ({fund.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="10000.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="investment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="initial">Initial Investment</SelectItem>
                      <SelectItem value="additional">Additional Investment</SelectItem>
                      <SelectItem value="redemption">Redemption</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="INV-2025-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this investment..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Investment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
