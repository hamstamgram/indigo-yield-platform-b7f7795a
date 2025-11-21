/**
 * Withdrawal Request Form Component
 *
 * PHASE 2: Feature Completion
 * Allows investors to request withdrawals with multi-step validation
 *
 * Security Features:
 * - TOTP 2FA required
 * - Amount validation with available balance check
 * - Wallet address validation
 * - Rate limiting on submission
 * - Audit logging
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { withdrawalRequestSchema, type WithdrawalRequestInput } from "@/lib/validation/schemas";
import { toDecimal, formatMoney, formatCrypto } from "@/utils/financial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Position {
  asset_symbol: string;
  amount: string;
  value_usd: string;
}

interface WithdrawalRequestFormProps {
  positions: Position[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function WithdrawalRequestForm({
  positions,
  onSuccess,
  onCancel,
}: WithdrawalRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WithdrawalRequestInput>({
    resolver: zodResolver(withdrawalRequestSchema),
  });

  const selectedAsset = watch("assetCode");
  const requestedAmount = watch("amount");

  // Get available balance for selected asset
  const availableBalance = positions.find((p) => p.asset_symbol === selectedAsset);

  // Calculate if amount is valid
  const isAmountValid =
    availableBalance && requestedAmount
      ? toDecimal(requestedAmount).lessThanOrEqualTo(toDecimal(availableBalance.amount))
      : false;

  const onSubmit = async (data: WithdrawalRequestInput) => {
    setIsSubmitting(true);

    try {
      // Validate amount against balance
      if (!availableBalance) {
        throw new Error("Asset not found in portfolio");
      }

      const requested = toDecimal(data.amount);
      const available = toDecimal(availableBalance.amount);

      if (requested.greaterThan(available)) {
        throw new Error("Insufficient balance");
      }

      // Submit withdrawal request
      const response = await fetch("/api/withdrawals/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: requested.toString(),
          asset_symbol: data.assetCode,
          destination_address: data.destinationAddress,
          reason: data.reason,
          notes: data.notes,
          totp_code: data.totpCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Withdrawal request failed");
      }

      const result = await response.json();

      toast({
        title: "Withdrawal Request Submitted",
        description: `Your request for ${formatCrypto(data.amount, 8, data.assetCode)} has been submitted for approval.`,
      });

      // Log audit event
      await fetch("/api/audit/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "WITHDRAWAL_REQUEST_CREATED",
          resource_type: "withdrawal_requests",
          resource_id: result.id,
          metadata: {
            amount: data.amount,
            asset: data.assetCode,
            destination: data.destinationAddress.substring(0, 10) + "...",
          },
        }),
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: "Withdrawal Request Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Request Withdrawal</CardTitle>
        <CardDescription>
          Submit a withdrawal request. All requests are reviewed by our admin team before
          processing.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {/* Asset Selection */}
          <div className="space-y-2">
            <Label htmlFor="assetCode">Asset</Label>
            <Select
              value={selectedAsset}
              onValueChange={(value) => setValue("assetCode", value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset to withdraw" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position.asset_symbol} value={position.asset_symbol}>
                    <div className="flex justify-between items-center w-full">
                      <span>{position.asset_symbol}</span>
                      <span className="text-sm text-muted-foreground ml-4">
                        {formatCrypto(position.amount, 8)} ({formatMoney(position.value_usd)})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assetCode && (
              <p className="text-sm text-destructive">{errors.assetCode.message}</p>
            )}
          </div>

          {/* Available Balance Display */}
          {availableBalance && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Available: {formatCrypto(availableBalance.amount, 8, availableBalance.asset_symbol)}{" "}
                ({formatMoney(availableBalance.value_usd)})
              </AlertDescription>
            </Alert>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.00000001"
              placeholder="0.00000000"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            {requestedAmount && availableBalance && !isAmountValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Amount exceeds available balance</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Destination Address */}
          <div className="space-y-2">
            <Label htmlFor="destinationAddress">Destination Wallet Address</Label>
            <Input
              id="destinationAddress"
              placeholder={selectedAsset === "BTC" ? "bc1..." : "0x..."}
              {...register("destinationAddress")}
            />
            {errors.destinationAddress && (
              <p className="text-sm text-destructive">{errors.destinationAddress.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Double-check your wallet address. Incorrect addresses result in permanent loss of
              funds.
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Withdrawal</Label>
            <Select
              value={watch("reason")}
              onValueChange={(value) => setValue("reason", value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal Use</SelectItem>
                <SelectItem value="investment">Investment Opportunity</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information..."
              rows={3}
              {...register("notes")}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </div>

          {/* TOTP Code (2FA) */}
          <div className="space-y-2">
            <Label htmlFor="totpCode">2FA Code</Label>
            <Input
              id="totpCode"
              type="text"
              maxLength={6}
              placeholder="000000"
              {...register("totpCode")}
            />
            {errors.totpCode && (
              <p className="text-sm text-destructive">{errors.totpCode.message}</p>
            )}
            <p className="text-sm text-muted-foreground">Enter your 6-digit authenticator code</p>
          </div>

          {/* Warning Notice */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Withdrawal requests are reviewed by our admin team within
              24-48 hours. You will receive an email notification once your request is approved or
              rejected.
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !isAmountValid}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
