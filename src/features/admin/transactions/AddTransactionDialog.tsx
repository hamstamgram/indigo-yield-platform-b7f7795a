import { useState, useEffect, useMemo } from "react";
import { toNum } from "@/utils/numeric";
import { FormProvider, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Alert,
  AlertDescription,
  Label,
  Input,
  Switch,
} from "@/components/ui";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { useFunds, useInvestorsForTransaction } from "@/hooks";
import { CryptoIcon } from "@/components/CryptoIcons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { cn } from "@/lib/utils";
import Decimal from "decimal.js";
import { formatAssetAmount } from "@/utils/assets";

// Refactored imports
import { useTransactionForm, TransactionFormData } from "./hooks/useTransactionForm";
import { useTransactionSubmit } from "./hooks/useTransactionSubmit";
// Removed useFundYieldLock per Kelly Criterion/First Principles (No 72h lock)

import { InvestorSelect } from "./components/InvestorSelect";
import { TransactionTypeSelect } from "./components/TransactionTypeSelect";
import { TransactionAmountInput } from "./components/TransactionAmountInput";
import { TransactionDateInput } from "./components/TransactionDateInput";
import { TransactionMetadataInputs } from "./components/TransactionMetadataInputs";
import { formatAUM } from "@/utils/formatters";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investorId?: string;
  fundId?: string;
  defaultType?: TransactionFormData["txn_type"];
  onSuccess: () => void;
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  investorId,
  fundId,
  defaultType,
  onSuccess,
}: AddTransactionDialogProps) {
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("");
  const [investorError, setInvestorError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: funds, isLoading: fundsLoading } = useFunds({ status: "active" });
  const { data: investors = [], isLoading: isLoadingInvestors } = useInvestorsForTransaction(open);

  const { form, isFirstInvestment, hasExistingPosition, isCheckingBalance, currentBalance } =
    useTransactionForm({
      fundId,
      selectedInvestorId,
    });

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control,
  } = form;

  const txnType = watch("txn_type");
  const selectedFundId = watch("fund_id");
  const txDate = watch("tx_date");
  const amount = watch("amount");

  const { onSubmit, loading, pendingLargeDeposit, confirmLargeDeposit, cancelLargeDeposit } =
    useTransactionSubmit({
      selectedInvestorId,
      hasExistingPosition: Boolean(hasExistingPosition),
      queryClient,
      onSuccess,
      onOpenChange,
      resetForm: reset,
      setInvestorError,
      fundId: selectedFundId,
      currentBalance,
    });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (investorId) {
        setSelectedInvestorId(investorId);
      } else {
        setSelectedInvestorId("");
      }
      setInvestorError(null);
      if (defaultType) {
        setValue("txn_type", defaultType);
      }
    }
  }, [open, investorId, defaultType, setValue]);

  const selectedFund = funds?.find((f) => f.id === selectedFundId);
  const isDeposit = txnType === "FIRST_INVESTMENT" || txnType === "DEPOSIT";
  const fullExit = watch("full_withdrawal");
  const asset = selectedFund?.asset || "UNITS";

  const dustPreview = useMemo(() => {
    if (txnType !== "WITHDRAWAL" || !fullExit || currentBalance == null) return null;
    const balance = new Decimal(currentBalance);
    const sendAmount = new Decimal(amount || 0);
    const dust = balance.minus(sendAmount);
    return {
      sendAmount: sendAmount.toString(),
      dustAmount: dust.isNegative() ? "0" : dust.toString(),
      fullBalance: balance.toString(),
    };
  }, [txnType, fullExit, currentBalance, amount]);

  const isDustLarge = useMemo(() => {
    if (!dustPreview) return false;
    const dust = new Decimal(dustPreview.dustAmount);
    const thresholds: Record<string, number> = { BTC: 0.001, ETH: 0.01, USDT: 1, USDC: 1, EURC: 1 };
    const threshold = thresholds[asset.toUpperCase()] ?? 0.01;
    return dust.gt(threshold);
  }, [dustPreview, asset]);

  // Set initial fund and asset when dialog opens or fundId prop changes
  useEffect(() => {
    if (fundId && funds) {
      setValue("fund_id", fundId);
      const fund = funds.find((f) => f.id === fundId);
      if (fund) {
        setValue("asset", fund.asset);
      }
    }
  }, [fundId, funds, setValue]);

  // Update asset when fund selection changes
  useEffect(() => {
    if (selectedFundId && funds) {
      const fund = funds.find((f) => f.id === selectedFundId);
      if (fund) {
        setValue("asset", fund.asset);
      }
    }
  }, [selectedFundId, funds, setValue]);

  const handleCancel = () => {
    reset();
    setSelectedInvestorId("");
    setInvestorError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto transition-all w-[95vw] md:w-full max-w-lg md:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription className="sr-only">Record a new transaction</DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Transaction Type - Always visible */}
            <TransactionTypeSelect
              value={txnType}
              onChange={(val) => setValue("txn_type", val)}
              hasExistingPosition={Boolean(hasExistingPosition)}
              isFirstInvestment={Boolean(isFirstInvestment)}
              error={errors.txn_type?.message}
            />

            {/* Fund Selector - Always visible */}
            <div className="space-y-2">
              <Label htmlFor="fund_id">Fund *</Label>
              <Select
                value={selectedFundId}
                onValueChange={(value) => setValue("fund_id", value)}
                disabled={fundsLoading}
              >
                <SelectTrigger className={errors.fund_id ? "border-destructive" : ""}>
                  <SelectValue placeholder={fundsLoading ? "Loading funds..." : "Select fund"} />
                </SelectTrigger>
                <SelectContent>
                  {funds?.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={fund.asset} className="h-5 w-5" />
                        <span>{fund.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fund_id && (
                <p className="text-sm text-destructive">{errors.fund_id.message}</p>
              )}
              {/* Hidden asset input required for form logic */}
              <Input type="hidden" {...form.register("asset")} />
            </div>

            {/* Standard Transaction Flow */}
            <>
              {/* Investor Selector */}
              <InvestorSelect
                investors={investors}
                isLoading={isLoadingInvestors}
                selectedInvestorId={selectedInvestorId}
                onSelect={setSelectedInvestorId}
                error={investorError}
              />

              {/* Balance indicator */}
              {selectedInvestorId && selectedFundId && (
                <div className="flex items-center justify-between text-sm py-2 px-1 border-b border-border/10">
                  <span className="text-muted-foreground">Available Balance</span>
                  <span className="font-mono font-medium">
                    {isCheckingBalance
                      ? "..."
                      : formatAUM(currentBalance ?? 0, selectedFund?.asset || "tokens")}
                  </span>
                </div>
              )}

              {/* Amount */}
              <TransactionAmountInput />

              {/* Full Withdrawal / Route Dust */}
              {txnType === "WITHDRAWAL" &&
                (hasExistingPosition || (currentBalance !== null && currentBalance > 0)) && (
                  <Controller
                    control={control}
                    name="full_withdrawal"
                    render={({ field }) => (
                      <div className="flex items-center justify-between py-2 px-1 bg-muted/30 rounded-md border border-border/50">
                        <div className="flex flex-col gap-0.5">
                          <Label
                            htmlFor="full-exit"
                            className="text-sm font-semibold cursor-pointer"
                          >
                            Full Exit
                          </Label>
                          <span className="text-[11px] text-muted-foreground">
                            Route remaining balance to Indigo Fees
                          </span>
                        </div>
                        <Switch
                          id="full-exit"
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked && currentBalance) {
                              setValue("amount", currentBalance.toString(), {
                                shouldValidate: true,
                              });
                            }
                          }}
                        />
                      </div>
                    )}
                  />
                )}

              {/* Dust Preview when Full Exit is toggled */}
              {fullExit && dustPreview && (
                <div className="space-y-2 p-3 rounded-lg border border-indigo-500/30 bg-indigo-950/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Position balance</span>
                    <span className="font-mono text-white">
                      {formatAssetAmount(dustPreview.fullBalance, asset)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Send to investor</span>
                    <span className="font-mono text-yield">
                      {formatAssetAmount(dustPreview.sendAmount, asset)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Dust to INDIGO Fees</span>
                    <span className="font-mono text-amber-400">
                      {formatAssetAmount(dustPreview.dustAmount, asset)}
                    </span>
                  </div>
                  {new Decimal(dustPreview.dustAmount).isZero() && (
                    <p className="text-xs text-slate-500">No dust — amount equals full balance</p>
                  )}
                  {isDustLarge && (
                    <Alert className="border-amber-500/50 bg-amber-950/30 mt-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="text-amber-300 text-xs">
                        Dust amount is unusually large. Verify the position balance before
                        proceeding.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Transaction Date */}
              <TransactionDateInput />

              {/* Metadata Inputs (Reference ID, Hash, Notes) */}
              <TransactionMetadataInputs />

              {/* Bug #3: Large deposit confirmation */}
              {pendingLargeDeposit && (
                <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="space-y-3">
                    <p className="font-semibold text-amber-800 dark:text-amber-200">
                      Large deposit — please confirm
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      You are depositing{" "}
                      <strong>
                        {toNum(pendingLargeDeposit.amount).toLocaleString()} {selectedFund?.asset}
                      </strong>
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={confirmLargeDeposit}>
                        Confirm Amount is Correct
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelLargeDeposit}>
                        Cancel
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    isLoadingInvestors ||
                    fundsLoading ||
                    !!investorError ||
                    (!!selectedInvestorId && !!selectedFundId && isCheckingBalance) ||
                    !!pendingLargeDeposit
                  }
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Transaction
                </Button>
              </DialogFooter>
            </>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

export default AddTransactionDialog;
