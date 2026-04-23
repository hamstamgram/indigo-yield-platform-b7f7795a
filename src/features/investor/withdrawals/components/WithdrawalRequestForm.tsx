/**
 * Withdrawal Request Form Component
 *
 * Allows investors to request withdrawals with amount validation
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { withdrawalRequestSchema, type WithdrawalRequestInput } from "@/lib/validation/schemas";
import { toDecimal, parseFinancial } from "@/utils/financial";
import { formatInvestorAmount } from "@/utils/assets";
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
import { useSubmitWithdrawal } from "@/features/investor/shared/hooks/useInvestorWithdrawals";
import { CryptoIcon } from "@/components/CryptoIcons";

export interface WithdrawalPosition {
  fund_id: string;
  asset_symbol: string;
  amount: string;
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

  const availableBalance = positions.find((p) => p.asset_symbol === selectedAsset);

  const reqAmt = parseFinancial(requestedAmount);
  const hasValidAmount = requestedAmount && reqAmt.gt(0);

  const isAmountValid =
    availableBalance && hasValidAmount
      ? reqAmt.lte(parseFinancial(availableBalance.amount))
      : false;

  const isFullWithdrawal =
    availableBalance && hasValidAmount && toDecimal(availableBalance.amount).greaterThan(0)
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
        amount: requested.toString(),
        assetCode: data.assetCode,
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
                        {formatInvestorAmount(position.amount, position.asset_symbol)}
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
                Available:{" "}
                {formatInvestorAmount(availableBalance.amount, availableBalance.asset_symbol)}
              </AlertDescription>
            </Alert>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount">Amount</Label>
              {availableBalance && (
                <button
                  type="button"
                  onClick={() => setValue("amount", availableBalance.amount)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Withdraw All
                </button>
              )}
            </div>
            <Input
              id="amount"
              type="number"
              step="0.001"
              placeholder="0.000"
              {...register("amount")}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            {hasValidAmount && availableBalance && !isAmountValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Amount exceeds available balance</AlertDescription>
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
          <Button type="submit" disabled={submitMutation.isPending || !isAmountValid}>
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
