import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getTodayString } from "@/utils/dateUtils";
import { useInvestorBalance, useTransactionHistory } from "@/features/shared/hooks/useInvestorBalance";

// Transaction validation schema
export const transactionSchema = z
  .object({
    txn_type: z.enum(["FIRST_INVESTMENT", "DEPOSIT", "WITHDRAWAL", "ADJUSTMENT"], {
      required_error: "Transaction type is required",
    }),
    fund_id: z.string().uuid("Please select a valid fund"),
    asset: z.string().min(1, "Asset is required"),
    amount: z
      .string()
      .trim()
      .min(1, "Amount is required")
      .refine((val) => isFinite(Number(val)) && !isNaN(Number(val)) && Number(val) !== 0, {
        message: "Amount must be a non-zero number",
      })
      .refine((val) => Math.abs(Number(val)) <= 1000000000, {
        message: "Amount must be less than 1 billion",
      }),
    tx_date: z
      .string()
      .min(1, "Transaction date is required")
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format",
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
    full_withdrawal: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    // ADJUSTMENT allows negative amounts (balance reductions); all other types require positive
    if (data.txn_type !== "ADJUSTMENT" && Number(data.amount) < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount must be a positive number",
        path: ["amount"],
      });
    }
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
  };
}
