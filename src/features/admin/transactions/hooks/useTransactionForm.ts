import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getTodayString } from "@/utils/dateUtils";
import { useInvestorBalance, useTransactionHistory } from "@/hooks";

// Transaction validation schema
export const transactionSchema = z.object({
  txn_type: z.enum(["FIRST_INVESTMENT", "DEPOSIT", "WITHDRAWAL", "YIELD", "INTEREST", "FEE"], {
    required_error: "Transaction type is required",
  }),
  fund_id: z.string().uuid("Please select a valid fund"),
  asset: z.string().min(1, "Asset is required"),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    })
    .refine((val) => Number(val) <= 1000000000, {
      message: "Amount must be less than 1 billion",
    }),
  tx_date: z
    .string()
    .min(1, "Transaction date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
  closing_aum: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: "Preflow AUM must be a valid non-negative number",
    }),
  reference_id: z
    .string()
    .trim()
    .max(100, "Reference ID must be less than 100 characters")
    .optional(),
  tx_hash: z
    .string()
    .trim()
    .max(255, "Transaction hash must be less than 255 characters")
    .optional(),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional(),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

interface UseTransactionFormParams {
  fundId?: string;
  selectedInvestorId?: string;
}

export function useTransactionForm({ fundId, selectedInvestorId }: UseTransactionFormParams) {
  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      tx_date: getTodayString(),
      fund_id: fundId || "",
      asset: "",
    },
  });

  const { setValue, watch } = form;
  const txnType = watch("txn_type");
  const selectedFundId = watch("fund_id");

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

    // Only auto-select if no type is selected yet
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
  }, [currentBalance, isCheckingBalance, hasTransactionHistory, txnType, setValue]);

  // Clear transaction type when fund changes (balance may differ)
  useEffect(() => {
    if (selectedFundId && !fundId) {
      // Only clear if fund wasn't pre-selected
      setValue("txn_type", undefined as unknown as TransactionFormData["txn_type"]);
    }
  }, [selectedFundId, fundId, setValue]);

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
  };
}
