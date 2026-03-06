import { useState, useEffect } from "react";
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
import { useActiveFunds, useInvestorsForTransaction } from "@/hooks";
import { CryptoIcon } from "@/components/CryptoIcons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { cn } from "@/lib/utils";

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
  onSuccess: () => void;
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  investorId,
  fundId,
  onSuccess,
}: AddTransactionDialogProps) {
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("");
  const [investorError, setInvestorError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: funds, isLoading: fundsLoading } = useActiveFunds();
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
    }
  }, [open, investorId]);

  const selectedFund = funds?.find((f) => f.id === selectedFundId);
  const isDeposit = txnType === "FIRST_INVESTMENT" || txnType === "DEPOSIT";

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
                            Route remaining decimals to Indigo Fees
                          </span>
                        </div>
                        <Switch
                          id="full-exit"
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked && currentBalance) {
                              const roundedAmount = Math.floor(currentBalance * 1000) / 1000;
                              setValue("amount", roundedAmount.toString(), {
                                shouldValidate: true,
                              });
                            }
                          }}
                        />
                      </div>
                    )}
                  />
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
                        {parseFloat(String(pendingLargeDeposit.amount)).toLocaleString()}{" "}
                        {selectedFund?.asset}
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
