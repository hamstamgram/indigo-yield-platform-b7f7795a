import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { createInvestorTransaction } from "@/services/shared";
import { executeInternalRoute } from "@/services/admin/internalRouteService";
import { parseFinancial } from "@/utils/financial";
import type { CreateTransactionUIParams as CreateTransactionParams } from "@/types/domains/transaction";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { QueryClient } from "@tanstack/react-query";
import { INDIGO_FEES_ACCOUNT_ID } from "@/constants/fees";
import { TransactionFormData } from "./useTransactionForm";
import { supabase } from "@/integrations/supabase/client";

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

  // First Principles: use ref to avoid stale closure — ensures onSubmit
  // always sees the latest selectedInvestorId regardless of React re-renders
  const investorIdRef = useRef(selectedInvestorId);
  useEffect(() => {
    investorIdRef.current = selectedInvestorId;
  }, [selectedInvestorId]);

  const onSubmit = async (data: TransactionFormData) => {
    // Validate investor selection — use ref for latest value
    const currentInvestorId = investorIdRef.current;
    if (!currentInvestorId) {
      setInvestorError("Please select an investor");
      return;
    }
    setInvestorError(null);

    // Block manual deposits to INDIGO FEES account
    if (
      currentInvestorId === INDIGO_FEES_ACCOUNT_ID &&
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
    const numericAmount =
      typeof data.amount === "string" ? parseFinancial(data.amount).toNumber() : data.amount;
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

      // Handle Full Exit (Dust Routing)
      // Re-fetch live position balance to avoid stale prop race condition
      if (data.full_withdrawal && data.txn_type === "WITHDRAWAL") {
        try {
          const { data: positionData } = await supabase
            .from("investor_positions")
            .select("current_value")
            .eq("investor_id", currentInvestorId)
            .eq("fund_id", data.fund_id)
            .single();

          const actualDust = positionData?.current_value ?? 0;

          if (actualDust > 0) {
            toast.info(`Routing ${Number(actualDust).toFixed(10)} ${data.asset} dust to Indigo Fees...`);
            await executeInternalRoute({
              fromInvestorId: currentInvestorId,
              fundId: data.fund_id,
              amount: Number(actualDust),
              effectiveDate: data.tx_date,
              reason: `Full Exit Dust Cleanup - ${currentInvestorId}`,
            });
          }
        } catch (routeError) {
          console.error("Dust routing failed:", routeError);
          toast.warning("Withdrawal succeeded, but dust routing failed. Please check manually.");
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
