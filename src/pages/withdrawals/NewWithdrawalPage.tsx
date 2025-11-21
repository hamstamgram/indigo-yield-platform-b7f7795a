import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

const formSchema = z.object({
  fund_id: z.string().uuid("Please select a fund"),
  requested_amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Amount must be greater than 0"
    ),
  withdrawal_type: z.enum(["partial", "full"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function NewWithdrawalPage() {
  const navigate = useNavigate();
  const [selectedFund, setSelectedFund] = useState<any>(null);
  const [maxWithdrawal, setMaxWithdrawal] = useState<number>(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      withdrawal_type: "partial",
    },
  });

  const withdrawalType = watch("withdrawal_type");
  const fundId = watch("fund_id");

  // Fetch user's funds and positions
  const { data: userFunds, isLoading: fundsLoading } = useQuery({
    queryKey: ["user-funds-with-positions"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Get investor record
      const { data: investor } = await supabase
        .from("investors")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!investor) throw new Error("No investor record found");

      // Get all positions with fund details
      const { data, error } = await supabase
        .from("investor_positions")
        .select(
          `
          *,
          funds:fund_id(id, name, code, fund_class)
        `
        )
        .eq("investor_id", investor.id)
        .gt("current_value", 0);

      if (error) throw error;
      return data;
    },
  });

  // Update selected fund when fundId changes
  useEffect(() => {
    if (fundId && userFunds) {
      const fund = userFunds.find((f: any) => f.fund_id === fundId);
      setSelectedFund(fund);
      setMaxWithdrawal(fund?.current_value || 0);

      // If withdrawal type is 'full', set amount to max
      if (withdrawalType === "full" && fund) {
        setValue("requested_amount", fund.current_value.toString());
      }
    }
  }, [fundId, userFunds, withdrawalType, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Get investor record
      const { data: investor } = await supabase
        .from("investors")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!investor) throw new Error("No investor record found");

      if (!investor) throw new Error("No investor record found");

      // Get fund details
      const { data: fund } = await supabase
        .from("funds")
        .select("fund_class")
        .eq("id", data.fund_id)
        .maybeSingle();

      if (!fund) throw new Error("Fund not found");

      if (!fund) throw new Error("Fund not found");

      // Create withdrawal request
      const { error } = await supabase.from("withdrawal_requests").insert({
        investor_id: investor.id,
        fund_id: data.fund_id,
        fund_class: fund.fund_class,
        requested_amount: parseFloat(data.requested_amount),
        withdrawal_type: data.withdrawal_type,
        notes: data.notes || null,
        status: "pending",
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Withdrawal request submitted successfully");
      navigate("/withdrawals/history");
    } catch (error: any) {
      console.error("Error creating withdrawal request:", error);
      toast.error(error.message || "Failed to submit withdrawal request");
    }
  };

  if (fundsLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!userFunds || userFunds.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Request Withdrawal</h1>
          <p className="text-muted-foreground">Withdraw funds from your investments</p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have any active positions to withdraw from. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Request Withdrawal</h1>
        <p className="text-muted-foreground">Withdraw funds from your investments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Details</CardTitle>
          <CardDescription>Fill out the form below to request a withdrawal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Fund Selection */}
            <div className="space-y-2">
              <Label htmlFor="fund_id">Select Fund</Label>
              <Select onValueChange={(value) => setValue("fund_id", value)} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a fund to withdraw from" />
                </SelectTrigger>
                <SelectContent>
                  {userFunds.map((position: any) => (
                    <SelectItem key={position.fund_id} value={position.fund_id}>
                      {position.funds.name} ({position.funds.fund_class}) - Available:{" "}
                      {position.current_value.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fund_id && (
                <p className="text-sm text-destructive">{errors.fund_id.message}</p>
              )}
            </div>

            {/* Withdrawal Type */}
            <div className="space-y-2">
              <Label htmlFor="withdrawal_type">Withdrawal Type</Label>
              <Select
                onValueChange={(value: "partial" | "full") => setValue("withdrawal_type", value)}
                defaultValue="partial"
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partial">Partial Withdrawal</SelectItem>
                  <SelectItem value="full">Full Withdrawal (Close Position)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="requested_amount">
                Amount{" "}
                {selectedFund &&
                  `(Max: ${maxWithdrawal.toFixed(2)} ${selectedFund.funds.fund_class})`}
              </Label>
              <Input
                id="requested_amount"
                type="number"
                step="0.01"
                {...register("requested_amount")}
                disabled={isSubmitting || withdrawalType === "full"}
                placeholder="Enter amount to withdraw"
              />
              {errors.requested_amount && (
                <p className="text-sm text-destructive">{errors.requested_amount.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                disabled={isSubmitting}
                placeholder="Add any additional information about this withdrawal"
                rows={3}
              />
            </div>

            {/* Info Alert */}
            {selectedFund && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your withdrawal request will be reviewed by an administrator. You will be notified
                  once it has been processed.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/withdrawals/history")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
