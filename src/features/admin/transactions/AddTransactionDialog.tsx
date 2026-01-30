import { useState, useEffect, useMemo } from "react";
import { FormProvider } from "react-hook-form";
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
} from "@/components/ui";
import { Info, Loader2 } from "lucide-react";
import { useActiveFunds, useInvestorsForTransaction } from "@/hooks";
import { getAssetLogo } from "@/utils/assets";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { cn } from "@/lib/utils";

// Refactored imports
import { useTransactionForm, TransactionFormData } from "./hooks/useTransactionForm";
import { GlobalYieldFlow } from "./components/GlobalYieldFlow";
import { useTransactionSubmit } from "./hooks/useTransactionSubmit";
import { AssetInput } from "./components/AssetInput";
import { InvestorSelect } from "./components/InvestorSelect";
import { TransactionTypeSelect } from "./components/TransactionTypeSelect";
import { TransactionAmountInput } from "./components/TransactionAmountInput";
import { TransactionDateInput } from "./components/TransactionDateInput";
import { TransactionMetadataInputs } from "./components/TransactionMetadataInputs";
import {
  previewDepositYield,
  type YieldPreviewResult,
} from "@/services/admin/depositWithYieldService";
import { toDecimal } from "@/utils/financial";

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
  } = form;

  const txnType = watch("txn_type");
  const selectedFundId = watch("fund_id");
  const txDate = watch("tx_date");
  const amount = watch("amount");
  const closingAum = watch("closing_aum");

  const { onSubmit, loading } = useTransactionSubmit({
    selectedInvestorId,
    hasExistingPosition: Boolean(hasExistingPosition),
    queryClient,
    onSuccess,
    onOpenChange,
    resetForm: reset,
    setInvestorError,
    fundId: selectedFundId,
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
  const requiresYieldPreview = Boolean(isDeposit && selectedFundId && amount && closingAum);

  const [depositYieldPreview, setDepositYieldPreview] = useState<YieldPreviewResult | null>(null);
  const [depositPreviewLoading, setDepositPreviewLoading] = useState(false);
  const [depositPreviewError, setDepositPreviewError] = useState<string | null>(null);

  const yieldPreviewValidation = useMemo(() => {
    if (!depositYieldPreview) {
      return { hasError: false, message: null };
    }
    const grossYield = toDecimal(depositYieldPreview.preDepositYield);
    if (grossYield.isNegative()) {
      return {
        hasError: true,
        message:
          "Negative yield detected. Yield distributions must be zero or positive. Adjust AUM inputs before continuing.",
      };
    }
    return { hasError: false, message: null };
  }, [depositYieldPreview]);

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

  useEffect(() => {
    if (!requiresYieldPreview) {
      setDepositYieldPreview(null);
      setDepositPreviewError(null);
      return;
    }

    let amountDec;
    let closingAumDec;
    try {
      amountDec = toDecimal(amount);
      closingAumDec = toDecimal(closingAum);
    } catch {
      setDepositYieldPreview(null);
      setDepositPreviewError(null);
      return;
    }

    if (amountDec.lte(0) || closingAumDec.lt(0)) {
      setDepositYieldPreview(null);
      setDepositPreviewError(null);
      return;
    }

    const newTotalAum = closingAumDec.plus(amountDec).toFixed(10);
    setDepositPreviewLoading(true);
    previewDepositYield(selectedFundId, amountDec.toFixed(10), newTotalAum)
      .then((preview) => {
        setDepositYieldPreview(preview);
        setDepositPreviewError(null);
      })
      .catch((error) => {
        setDepositYieldPreview(null);
        setDepositPreviewError(
          error instanceof Error ? error.message : "Failed to preview deposit yield"
        );
      })
      .finally(() => setDepositPreviewLoading(false));
  }, [requiresYieldPreview, amount, closingAum, selectedFundId]);

  const handleCancel = () => {
    reset();
    setSelectedInvestorId("");
    setInvestorError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto transition-all duration-300",
          txnType === "YIELD" ? "sm:max-w-4xl" : "sm:max-w-[500px]"
        )}
      >
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            {txnType === "YIELD"
              ? "Distribute algorithmic yield to all investors in the selected fund."
              : "Manually create a transaction for an investor. All fields are validated and logged."}
          </DialogDescription>
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
                        <img
                          src={getAssetLogo(fund.asset)}
                          alt={fund.asset}
                          className="h-5 w-5 rounded-full"
                        />
                        <span>{fund.asset}</span>
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

            {/* CONDITIONAL CONTENT */}
            {txnType === "YIELD" ? (
              /* Global Yield Flow */
              <GlobalYieldFlow
                fundId={selectedFundId}
                onSuccess={() => {
                  onSuccess();
                  onOpenChange(false);
                }}
                onCancel={handleCancel}
              />
            ) : (
              /* Standard Transaction Flow */
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
                  <Alert variant={isFirstInvestment ? "default" : "default"} className="py-2">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {isCheckingBalance ? (
                        "Checking balance..."
                      ) : isFirstInvestment ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          <strong>No existing position</strong> — Use "First Investment" for
                          deposits
                        </span>
                      ) : (
                        <span>
                          <strong>Current balance:</strong> {currentBalance?.toFixed(8)} — Use
                          "Deposit" for top-ups
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Amount */}
                <TransactionAmountInput />

                {/* Transaction Date */}
                <TransactionDateInput />

                {/* Asset Input (Preflow AUM) */}
                {selectedFundId &&
                  txDate &&
                  ["FIRST_INVESTMENT", "DEPOSIT", "WITHDRAWAL"].includes(txnType) && (
                    <AssetInput
                      fundId={selectedFundId}
                      txDate={txDate}
                      asset={selectedFund?.asset || "tokens"}
                    />
                  )}

                {/* Metadata Inputs (Reference ID, Hash, Notes) */}
                <TransactionMetadataInputs />

                {/* Yield preview validation (Deposit / First Investment) */}
                {isDeposit && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold">Yield crystallization preview</h4>
                        <p className="text-xs text-muted-foreground">
                          Preview the yield that will be crystallized before the deposit is applied.
                        </p>
                      </div>
                      {depositPreviewLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>

                    {depositPreviewError && (
                      <p className="mt-3 text-xs text-destructive">{depositPreviewError}</p>
                    )}

                    {depositYieldPreview && (
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Opening AUM</p>
                          <p className="font-medium">
                            {toDecimal(depositYieldPreview.currentAum).toFixed(8)}{" "}
                            {depositYieldPreview.fundAsset}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Pre-deposit yield</p>
                          <p
                            className={cn(
                              "font-medium",
                              toDecimal(depositYieldPreview.preDepositYield).gt(0)
                                ? "text-emerald-600"
                                : "text-muted-foreground"
                            )}
                          >
                            {toDecimal(depositYieldPreview.preDepositYield).gt(0) ? "+" : ""}
                            {toDecimal(depositYieldPreview.preDepositYield).toFixed(8)}{" "}
                            {depositYieldPreview.fundAsset}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Yield %</p>
                          <p className="font-medium">
                            {toDecimal(depositYieldPreview.yieldPercentage).toFixed(6)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Investors impacted</p>
                          <p className="font-medium">{depositYieldPreview.investorCount}</p>
                        </div>
                      </div>
                    )}

                    {yieldPreviewValidation.hasError && (
                      <p className="mt-3 text-xs text-destructive">
                        {yieldPreviewValidation.message}
                      </p>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      loading ||
                      fundsLoading ||
                      isLoadingInvestors ||
                      (isDeposit && (depositPreviewLoading || !!depositPreviewError)) ||
                      (isDeposit && requiresYieldPreview && !depositYieldPreview) ||
                      yieldPreviewValidation.hasError
                    }
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Transaction
                  </Button>
                </DialogFooter>
              </>
            )}
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

export default AddTransactionDialog;
