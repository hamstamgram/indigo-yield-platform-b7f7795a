import { useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { createInvestorTransaction } from "@/services/shared";
import type { CreateTransactionUIParams as CreateTransactionParams } from "@/types/domains/transaction";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { QueryClient } from "@tanstack/react-query";
import { INDIGO_FEES_ACCOUNT_ID } from "@/constants/fees";
import { TransactionFormData } from "./useTransactionForm";

interface UseTransactionSubmitParams {
  selectedInvestorId: string;
  hasExistingPosition: boolean;
  queryClient: QueryClient;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
  resetForm: () => void;
  setInvestorError: (error: string | null) => void;
  fundId?: string; // For logging/context
}

export function useTransactionSubmit({
  selectedInvestorId,
  hasExistingPosition,
  queryClient,
  onSuccess,
  onOpenChange,
  resetForm,
  setInvestorError,
  fundId: initialFundId,
}: UseTransactionSubmitParams) {
  const [loading, setLoading] = useState(false);
  const [pendingLargeDeposit, setPendingLargeDeposit] = useState<TransactionFormData | null>(null);
  const [largeDepositConfirmed, setLargeDepositConfirmed] = useState(false);

  const onSubmit = async (data: TransactionFormData) => {
    // Validate investor selection
    if (!selectedInvestorId) {
      setInvestorError("Please select an investor");
      return;
    }
    setInvestorError(null);

    // Block manual deposits to INDIGO FEES account
    if (
      selectedInvestorId === INDIGO_FEES_ACCOUNT_ID &&
      (data.txn_type === "DEPOSIT" || data.txn_type === "FIRST_INVESTMENT")
    ) {
      toast.error(
        "INDIGO FEES cannot receive manual deposits. Fee credits are system-generated only."
      );
      return;
    }

    // Only block FIRST_INVESTMENT if position already exists
    if (hasExistingPosition && data.txn_type === "FIRST_INVESTMENT") {
      toast.error(
        "Cannot use 'First Investment' - investor already has a position. Use 'Deposit' instead."
      );
      return;
    }

    // Bug #3: Large deposit confirmation
    const isDeposit = data.txn_type === "DEPOSIT" || data.txn_type === "FIRST_INVESTMENT";
    const numericAmount = typeof data.amount === "string" ? parseFloat(data.amount) : data.amount;
    const isLargeAmount = isDeposit && numericAmount > 1_000_000;

    if (isLargeAmount && !largeDepositConfirmed) {
      setPendingLargeDeposit(data);
      return;
    }

    // Reset confirmation state after use
    if (largeDepositConfirmed) {
      setLargeDepositConfirmed(false);
    }

    try {
      setLoading(true);

      // Transactions are pure capital flows — no preflow AUM / crystallization

      const result = await createInvestorTransaction({
        investor_id: selectedInvestorId,
        fund_id: data.fund_id,
        type: data.txn_type as CreateTransactionParams["type"],
        asset: data.asset,
        amount: data.amount,
        tx_date: data.tx_date,
        event_ts: `${data.tx_date}T00:00:00.000Z`,
        reference_id: data.reference_id || undefined,
        tx_hash: data.tx_hash || undefined,
        notes: data.notes || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create transaction");
      }

      // Invalidate all relevant queries
      await invalidateAfterTransaction(queryClient, selectedInvestorId, data.fund_id);

      toast.success("Transaction created successfully");
      resetForm();
      // Invoke success callback (typically to refresh parent list or show another toast)
      onSuccess();
      // Close dialog
      onOpenChange(false);
    } catch (error) {
      logError("transaction.create", error, { fundId: data.fund_id || initialFundId });
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error);
      toast.error(errorMessage || "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  };

  const confirmLargeDeposit = () => {
    setLargeDepositConfirmed(true);
    if (pendingLargeDeposit) {
      const data = pendingLargeDeposit;
      setPendingLargeDeposit(null);
      onSubmit(data);
    }
  };

  const cancelLargeDeposit = () => {
    setPendingLargeDeposit(null);
    setLargeDepositConfirmed(false);
  };

  return {
    onSubmit,
    loading,
    pendingLargeDeposit,
    confirmLargeDeposit,
    cancelLargeDeposit,
  };
}
