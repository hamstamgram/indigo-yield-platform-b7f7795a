import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getTodayString } from "@/utils/dateUtils";
import { useInvestorBalance, useTransactionHistory } from "@/features/shared/hooks/useInvestorBalance";
import {
  createTransactionFormSchema,
  type CreateTransactionFormData,
} from "@/lib/validation/schemas";

// Re-export for backward compatibility with existing components
export const transactionSchema = createTransactionFormSchema;
export type TransactionFormData = CreateTransactionFormData;

interface UseTransactionFormParams {
  fundId?: string;
  selectedInvestorId?: string;
}

export function useTransactionForm({ fundId, selectedInvestorId }: UseTransactionFormParams) {
  const form = useForm<TransactionFormData>({
    resolver: zodResolver(createTransactionFormSchema),
    defaultValues: {
      tx_date: getTodayString(),
      fund_id: fundId || "",
      asset: "",
    },
  });

  const { setValue, watch } = form;
  const txnType = watch("txn_type");
  const selectedFundId = watch("fund_id");

  // Guard: prevent auto-select from overwriting user-edited type
  const hasUserEditedType = useRef(false);

  // Use React Query hooks for balance and transaction history
  const { data: currentBalance, isLoading: isCheckingBalance } = useInvestorBalance(
    selectedInvestorId || undefined,
    selectedFundId || undefined
  );

  const { data: hasTransactionHistory = false } = useTransactionHistory(
    selectedInvestorId || undefined,
    selectedFundId || undefined
  );

  // Auto-select transaction type based on balance (only for initial selection, no forcing)
  useEffect(() => {
    if (currentBalance === null || currentBalance === undefined || isCheckingBalance) return;

    // Only auto-select if user has not manually edited the type
    if (!hasUserEditedType.current) {
      if (!txnType) {
        if (currentBalance === 0 && !hasTransactionHistory) {
          setValue("txn_type", "FIRST_INVESTMENT");
        } else if (currentBalance > 0 || hasTransactionHistory) {
          setValue("txn_type", "DEPOSIT");
        }
      }
      // Only auto-switch from FIRST_INVESTMENT to DEPOSIT if position exists (not vice versa)
      else if (currentBalance > 0 && txnType === "FIRST_INVESTMENT") {
        setValue("txn_type", "DEPOSIT");
      }
    }
  }, [currentBalance, isCheckingBalance, hasTransactionHistory, txnType, setValue]);

  // Note: do NOT clear txn_type on fund change — user may have manually selected it.
  // The auto-select effect above only fires when txn_type is empty (initial load).

  const isFirstInvestment =
    currentBalance !== null &&
    currentBalance !== undefined &&
    currentBalance === 0 &&
    !hasTransactionHistory;

  const hasExistingPosition =
    currentBalance !== null &&
    currentBalance !== undefined &&
    (currentBalance > 0 || hasTransactionHistory);

  return {
    form,
    isFirstInvestment,
    hasExistingPosition,
    isCheckingBalance,
    currentBalance,
    hasUserEditedType,
  };
}
