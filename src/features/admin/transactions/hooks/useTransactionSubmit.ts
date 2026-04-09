import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { createInvestorTransaction } from "@/services/shared";
import { toNum } from "@/utils/numeric";
import type { CreateTransactionUIParams as CreateTransactionParams } from "@/types/domains/transaction";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { QueryClient } from "@tanstack/react-query";
import { TransactionFormData } from "./useTransactionForm";
import { supabase } from "@/integrations/supabase/client";
import { withdrawalService } from "@/features/shared/services/withdrawalService";

interface UseTransactionSubmitParams {
  selectedInvestorId: string;
  hasExistingPosition: boolean;
  queryClient: QueryClient;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
  resetForm: () => void;
  setInvestorError: (error: string | null) => void;
  fundId?: string; // For logging/context
  currentBalance?: number | null;
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
  currentBalance,
}: UseTransactionSubmitParams) {
  const [loading, setLoading] = useState(false);
  const [pendingLargeDeposit, setPendingLargeDeposit] = useState<TransactionFormData | null>(null);
  const [largeDepositConfirmed, setLargeDepositConfirmed] = useState(false);

  // First Principles: use ref to avoid stale closure -- ensures onSubmit
  // always sees the latest selectedInvestorId regardless of React re-renders
  const investorIdRef = useRef(selectedInvestorId);
  useEffect(() => {
    investorIdRef.current = selectedInvestorId;
  }, [selectedInvestorId]);

  const onSubmit = async (data: TransactionFormData) => {
    // Validate investor selection -- use ref for latest value
    const currentInvestorId = investorIdRef.current;
    if (!currentInvestorId) {
      setInvestorError("Please select an investor");
      return;
    }
    setInvestorError(null);

    // Only block FIRST_INVESTMENT if position already exists
    if (hasExistingPosition && data.txn_type === "FIRST_INVESTMENT") {
      toast.error(
        "Cannot use 'First Investment' - investor already has a position. Use 'Deposit' instead."
      );
      return;
    }

    // Large deposit confirmation
    const isDeposit = data.txn_type === "DEPOSIT" || data.txn_type === "FIRST_INVESTMENT";
    const numericAmount =
      typeof data.amount === "string" ? toNum(data.amount) : data.amount;
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

      // WITHDRAWAL path: route through withdrawal_requests for full audit trail
      if (data.txn_type === "WITHDRAWAL") {
        const isFullExit = !!data.full_withdrawal;
        const amountStr = typeof data.amount === "string" ? data.amount : String(data.amount);

        // Step 1: Insert withdrawal_requests record (status: pending)
        const { data: insertedRow, error: insertError } = await supabase
          .from("withdrawal_requests")
          .insert({
            investor_id: currentInvestorId,
            fund_id: data.fund_id,
            requested_amount: amountStr,
            withdrawal_type: isFullExit ? "full" : "partial",
            status: "pending",
            is_full_exit: isFullExit,
            request_date: data.tx_date,
            settlement_date: data.tx_date,
            notes: data.notes || `Manual withdrawal via Add Transaction`,
          } as any)
          .select("id")
          .single();

        if (insertError || !insertedRow) {
          throw new Error(insertError?.message || "Failed to create withdrawal request");
        }

        const requestId = (insertedRow as any).id as string;

        // Step 2: Approve and complete atomically via battle-tested RPC
        // This handles: ledger entry, dust sweep (for full exit), position update
        await withdrawalService.approveAndComplete(
          requestId,
          amountStr,
          data.tx_hash || undefined,
          data.notes || "Manual withdrawal via Add Transaction",
          isFullExit
        );
      } else {
        // Non-withdrawal path: DEPOSIT, FIRST_INVESTMENT, ADJUSTMENT, etc.
        const result = await createInvestorTransaction({
          investor_id: currentInvestorId,
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
      }

      // Invalidate all relevant queries
      await invalidateAfterTransaction(queryClient, currentInvestorId, data.fund_id);

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
