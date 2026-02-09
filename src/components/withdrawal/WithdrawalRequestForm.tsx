/**
 * Withdrawal Request Form Component
 *
 * Allows investors to request withdrawals with multi-step validation
 *
 * Security Features:
 * - Amount validation with available balance check
 * - Wallet address validation
 * - Rate limiting on submission
 * - Audit logging
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { withdrawalRequestSchema, type WithdrawalRequestInput } from "@/lib/validation/schemas";
import { toDecimal } from "@/utils/financial";
import { formatAssetAmount } from "@/utils/assets";
import {
  Button,
  Input,
  Label,
  Textarea,
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Loader2, AlertTriangle, Info } from "lucide-react";
import { useSubmitWithdrawal } from "@/hooks/data";
import { CryptoIcon } from "@/components/CryptoIcons";

export interface WithdrawalPosition {
  fund_id: string;
  asset_symbol: string;
  amount: number;
  min_withdrawal_amount?: number | null;
}

interface WithdrawalRequestFormProps {
  positions: WithdrawalPosition[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function WithdrawalRequestForm({
  positions,
  onSuccess,
  onCancel,
}: WithdrawalRequestFormProps) {
  const submitMutation = useSubmitWithdrawal();

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

  // Check if amount is below fund minimum withdrawal
  const isBelowMinimum =
    availableBalance?.min_withdrawal_amount != null && requestedAmount
      ? toDecimal(requestedAmount).lessThan(toDecimal(availableBalance.min_withdrawal_amount))
      : false;

  // Full withdrawals (100% of balance) are allowed
  const isFullWithdrawal =
    availableBalance && requestedAmount && availableBalance.amount > 0
      ? toDecimal(requestedAmount)
          .dividedBy(toDecimal(availableBalance.amount))
          .greaterThanOrEqualTo(0.99)
      : false;

  const onSubmit = async (data: WithdrawalRequestInput) => {
    if (!availableBalance) return;

    const requested = toDecimal(data.amount);
    const available = toDecimal(availableBalance.amount);

    if (requested.greaterThan(available)) {
      return;
    }

    submitMutation.mutate(
      {
        fundId: availableBalance.fund_id,
        amount: requested.toNumber(),
        assetCode: data.assetCode,
        destinationAddress: data.destinationAddress,
        reason: data.reason,
        notes: data.notes,
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
      }
    );
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
              onValueChange={(value) =>
                setValue("assetCode", value as WithdrawalRequestInput["assetCode"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset to withdraw" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position.asset_symbol} value={position.asset_symbol}>
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={position.asset_symbol} className="h-4 w-4" />
                        <span>{position.asset_symbol}</span>
                      </div>
                      <span className="text-sm text-muted-foreground ml-4">
                        {formatAssetAmount(position.amount, position.asset_symbol)}
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

          {/* Available Balance Display - Token denominated only */}
          {availableBalance && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Available:{" "}
                {formatAssetAmount(availableBalance.amount, availableBalance.asset_symbol)}
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
            {availableBalance?.min_withdrawal_amount != null && (
              <p className="text-xs text-muted-foreground">
                Minimum:{" "}
                {formatAssetAmount(
                  availableBalance.min_withdrawal_amount,
                  availableBalance.asset_symbol
                )}{" "}
                {availableBalance.asset_symbol}
              </p>
            )}
            {requestedAmount && availableBalance && !isAmountValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Amount exceeds available balance</AlertDescription>
              </Alert>
            )}
            {requestedAmount &&
              isBelowMinimum &&
              availableBalance?.min_withdrawal_amount != null && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Minimum withdrawal is{" "}
                    {formatAssetAmount(
                      availableBalance.min_withdrawal_amount,
                      availableBalance.asset_symbol
                    )}{" "}
                    {availableBalance.asset_symbol}
                  </AlertDescription>
                </Alert>
              )}
            {isAmountValid && isFullWithdrawal && (
              <Alert className="border-amber-500/50 bg-amber-950/20">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-200">
                  <strong>Full Account Withdrawal</strong>
                  <br />
                  This will close your position in this fund. Any accrued yield will be crystallized
                  before the withdrawal is processed.
                </AlertDescription>
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
              onValueChange={(value) =>
                setValue("reason", value as WithdrawalRequestInput["reason"])
              }
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
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitMutation.isPending || !isAmountValid || isBelowMinimum}
          >
            {submitMutation.isPending ? (
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
