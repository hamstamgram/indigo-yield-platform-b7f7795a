/**
 * Void and Reissue Transaction Dialog
 *
 * Finance-grade workflow for correcting transactions.
 * Instead of editing (which breaks ledger immutability), this dialog:
 * 1. Voids the original transaction
 * 2. Creates a new corrected transaction
 * 3. Links them for audit trail
 *
 * This replaces EditTransactionDialog per CFO policy.
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  Lock,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTransactionMutations } from "@/hooks/data";
import {
  getTransactionContext,
  type TransactionContextResult,
  type RelatedTransaction,
} from "@/services/admin/adminTransactionHistoryService";
import { Badge } from "@/components/ui/badge";
import { FinancialValue } from "@/components/common/FinancialValue";
import { parseFinancial } from "@/utils/financial";
import usePlatformError, { routeErrorAction } from "@/hooks/usePlatformError";
import { PlatformErrorCode } from "@/types/errors/platformErrors";
import { getCurrentUser } from "@/services/auth/authService";
import { logError } from "@/lib/logger";

const reissueSchema = z
  .object({
    tx_date: z.string().min(1, "Transaction date is required"),
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine((val) => !isNaN(Number(val)) && Number(val) !== 0, {
        message: "Amount must be a non-zero number",
      }),
    notes: z.string().optional(),
    reason: z
      .string()
      .min(10, "Reason must be at least 10 characters for audit trail")
      .max(1000, "Reason must be 1000 characters or fewer"),
    originalType: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Only ADJUSTMENT allows negative amounts in reissue
    if (data.originalType !== "ADJUSTMENT" && Number(data.amount) < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount must be a positive number",
        path: ["amount"],
      });
    }
  });

type ReissueFormData = z.infer<typeof reissueSchema>;

type TransactionContext = TransactionContextResult;

/**
 * Transaction data required for void and reissue
 */
interface ReissuableTransaction {
  id: string;
  type: string;
  amount: string; // String for NUMERIC precision preservation
  asset: string;
  investorName: string;
  investorId?: string;
  fundId?: string | null;
  txDate: string;
  notes: string | null;
  txHash?: string | null;
  isSystemGenerated?: boolean;
}

interface VoidAndReissueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: ReissuableTransaction | null;
  onSuccess: () => void;
}

export function VoidAndReissueDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: VoidAndReissueDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [activeTab, setActiveTab] = useState<"changes" | "review">("changes");
  const [txContext, setTxContext] = useState<TransactionContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const { voidAndReissueMutation, voidAndReissueFullExitMutation } = useTransactionMutations();
  const { handleError, error: platformError, clearError } = usePlatformError();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReissueFormData>({
    resolver: zodResolver(reissueSchema),
    defaultValues: {
      reason: "",
    },
  });

  const watchedValues = watch();

  // Fetch transaction context when dialog opens
  useEffect(() => {
    if (transaction && open) {
      setLoadingContext(true);
      getTransactionContext(transaction.id)
        .then(setTxContext)
        .catch(() => setTxContext(null))
        .finally(() => setLoadingContext(false));
    } else {
      setTxContext(null);
    }
  }, [transaction?.id, open]);

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction) {
      // Use absolute amount for the form — ledger stores negatives for
      // withdrawals/fees but the user should work with positive values.
      // The RPC handles sign based on transaction type.
      const absAmount = transaction.amount.startsWith("-")
        ? transaction.amount.slice(1)
        : transaction.amount;
      reset({
        tx_date: transaction.txDate,
        amount: absAmount,
        notes: transaction.notes || "",
        reason: "",
        originalType: transaction.type,
      });
      setConfirmText("");
      setActiveTab("changes");
      clearError();
    }
  }, [transaction, reset, clearError]);

  // Compute what changed
  const getChanges = () => {
    if (!transaction) return [];
    const changes: { field: string; oldValue: string; newValue: string }[] = [];

    if (watchedValues.tx_date !== transaction.txDate) {
      changes.push({
        field: "Date",
        oldValue: transaction.txDate,
        newValue: watchedValues.tx_date || "",
      });
    }
    const absOriginal = transaction.amount.startsWith("-")
      ? transaction.amount.slice(1)
      : transaction.amount;
    if (watchedValues.amount !== absOriginal) {
      changes.push({
        field: "Amount",
        oldValue: `${absOriginal} ${transaction.asset}`,
        newValue: `${watchedValues.amount || "0"} ${transaction.asset}`,
      });
    }
    if ((watchedValues.notes || "") !== (transaction.notes || "")) {
      changes.push({
        field: "Notes",
        oldValue: transaction.notes || "(empty)",
        newValue: watchedValues.notes || "(empty)",
      });
    }
    return changes;
  };

  const changes = getChanges();
  const hasChanges = changes.length > 0;
  const isFullExit = txContext?.isFullExit ?? false;

  const onSubmit = async (data: ReissueFormData) => {
    if (!transaction) return;

    if (confirmText !== "REISSUE") {
      toast.error("Please type REISSUE to confirm");
      return;
    }

    // Allow reissue even without field changes — voiding and recreating
    // with the same values is a valid correction workflow (e.g., to fix
    // associated records or re-trigger position recalculation)

    // Re-apply negative sign for debit types — form shows absolute value
    // but RPC expects the original sign convention (negative for outflows)
    const DEBIT_TYPES = ["WITHDRAWAL", "FEE", "INTERNAL_WITHDRAWAL", "IB_DEBIT"];
    const isDebit = DEBIT_TYPES.includes(transaction.type);
    const signedAmount = isDebit ? `-${data.amount.replace(/^-/, "")}` : data.amount;

    if (isFullExit) {
      voidAndReissueFullExitMutation.mutate(
        {
          transactionId: transaction.id,
          newAmount: data.amount,
          reason: data.reason.trim(),
          investorId: transaction.investorId,
          fundId: transaction.fundId || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Full-exit withdrawal corrected", {
              description: "Original voided, withdrawal re-processed with dust recalculation",
            });
            reset();
            setConfirmText("");
            onSuccess();
            onOpenChange(false);
          },
          onError: (err) => {
            handleError(err, {
              onUIAction: (_action, error) => {
                routeErrorAction(error, {
                  onFocusDateField: () => setActiveTab("changes"),
                });
              },
            });
          },
        }
      );
      return;
    }

    voidAndReissueMutation.mutate(
      {
        transactionId: transaction.id,
        newValues: {
          tx_date: data.tx_date,
          amount: signedAmount,
          notes: data.notes || null,
        },
        reason: data.reason.trim(),
        investorId: transaction.investorId,
        fundId: transaction.fundId || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Transaction voided and reissued", {
            description: "Original voided, new transaction created",
          });
          reset();
          setConfirmText("");
          onSuccess();
          onOpenChange(false);
        },
        onError: (err) => {
          handleError(err, {
            onUIAction: (_action, error) => {
              routeErrorAction(error, {
                onFocusDateField: () => setActiveTab("changes"),
              });
            },
          });
        },
      }
    );
  };

  const handleClose = () => {
    reset();
    setConfirmText("");
    clearError();
    onOpenChange(false);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Void and Reissue Transaction
          </DialogTitle>
          <DialogDescription>
            Correct this transaction by voiding the original and creating a new one with the updated
            values. This maintains ledger immutability and full audit trail.
          </DialogDescription>
        </DialogHeader>

        {/* Transaction info banner */}
        <Alert>
          <AlertDescription>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <strong>Investor:</strong> {transaction.investorName}
              </div>
              <div>
                <strong>Type:</strong> {transaction.type}
              </div>
              <div>
                <strong>Current Amount:</strong>{" "}
                <FinancialValue value={transaction.amount} asset={transaction.asset} showAsset />
              </div>
              <div>
                <strong>Current Date:</strong> {transaction.txDate}
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {transaction.isSystemGenerated && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>System-generated transactions cannot be modified.</strong>
              <p className="text-sm mt-1">
                This transaction was created automatically (yield distribution, fee, etc.). Contact
                support if correction is needed.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {isFullExit && (
          <div className="space-y-3">
            <Alert className="border-amber-500/20 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertDescription className="text-amber-200">
                <strong>Full-exit withdrawal detected.</strong>
                <p className="text-sm mt-1">
                  All transactions below will be voided and the full exit re-processed with the
                  corrected amount. Dust will be recalculated automatically.
                </p>
              </AlertDescription>
            </Alert>

            {/* Affected transactions table */}
            {txContext?.relatedTransactions && txContext.relatedTransactions.length > 0 && (
              <div className="rounded-md border border-white/10 overflow-hidden">
                <div className="px-3 py-2 bg-white/5 border-b border-white/10">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Transactions to be voided ({txContext.relatedTransactions.length})
                  </p>
                </div>
                <div className="divide-y divide-white/5">
                  {txContext.relatedTransactions.map((rt) => (
                    <div key={rt.id} className="px-3 py-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase tracking-wider shrink-0 ${
                            rt.type === "WITHDRAWAL"
                              ? "border-red-500/30 text-red-400"
                              : "border-amber-500/30 text-amber-400"
                          }`}
                        >
                          {rt.type.replace("_", " ")}
                        </Badge>
                        <span className="text-sm text-muted-foreground truncate">
                          {rt.investorName}
                        </span>
                      </div>
                      <FinancialValue
                        value={rt.amount}
                        asset={rt.asset}
                        showAsset
                        colorize
                        className="text-sm font-mono shrink-0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview of NEW transactions that will be created */}
            {(() => {
              const newAmount = watchedValues.amount;
              const balance = txContext?.investorBalance;
              const asset = txContext?.asset || transaction?.asset || "";
              const investorName = txContext?.investorName || transaction?.investorName || "";

              if (!newAmount || !balance) return null;

              try {
                const balanceDec = parseFinancial(balance);
                const amountDec = parseFinancial(newAmount);
                // Full exit: TRUNC(balance, 3) for withdrawal, remainder for dust
                const truncated = balanceDec.toDecimalPlaces(3, 1); // 1 = ROUND_DOWN (floor)
                const dust = balanceDec.minus(truncated);
                const feesAccountName = "Indigo Fees";

                return (
                  <div className="rounded-md border border-emerald-500/20 overflow-hidden">
                    <div className="px-3 py-2 bg-emerald-500/5 border-b border-emerald-500/20">
                      <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                        New transactions (preview)
                      </p>
                    </div>
                    <div className="divide-y divide-white/5">
                      {truncated.gt(0) && (
                        <div className="px-3 py-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase tracking-wider shrink-0 border-emerald-500/30 text-emerald-400"
                            >
                              Withdrawal
                            </Badge>
                            <span className="text-sm text-muted-foreground truncate">
                              {investorName}
                            </span>
                          </div>
                          <FinancialValue
                            value={`-${truncated.toString()}`}
                            asset={asset}
                            showAsset
                            colorize
                            className="text-sm font-mono shrink-0"
                          />
                        </div>
                      )}
                      {dust.gt(0) && (
                        <>
                          <div className="px-3 py-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase tracking-wider shrink-0 border-amber-500/30 text-amber-400"
                              >
                                Dust Sweep
                              </Badge>
                              <span className="text-sm text-muted-foreground truncate">
                                {investorName}
                              </span>
                            </div>
                            <FinancialValue
                              value={`-${dust.toString()}`}
                              asset={asset}
                              showAsset
                              colorize
                              className="text-sm font-mono shrink-0"
                            />
                          </div>
                          <div className="px-3 py-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase tracking-wider shrink-0 border-amber-500/30 text-amber-400"
                              >
                                Dust Sweep
                              </Badge>
                              <span className="text-sm text-muted-foreground truncate">
                                {feesAccountName}
                              </span>
                            </div>
                            <FinancialValue
                              value={dust.toString()}
                              asset={asset}
                              showAsset
                              colorize
                              className="text-sm font-mono shrink-0"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              } catch {
                return null;
              }
            })()}
          </div>
        )}

        {/* Platform error display */}
        {platformError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{platformError.code}</strong>
              <p className="text-sm">{platformError.message}</p>
              {platformError.user_action_hint && (
                <p className="text-xs text-muted-foreground mt-1">
                  {platformError.user_action_hint}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "changes" | "review")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="changes">1. Enter Corrections</TabsTrigger>
              <TabsTrigger value="review">2. Review & Confirm</TabsTrigger>
            </TabsList>

            <TabsContent value="changes" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tx_date">Transaction Date *</Label>
                  <Input
                    id="tx_date"
                    type="date"
                    {...register("tx_date")}
                    disabled={transaction.isSystemGenerated}
                  />
                  {errors.tx_date && (
                    <p className="text-sm text-destructive">{errors.tx_date.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ({transaction.asset}) *</Label>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00000000"
                    {...register("amount")}
                    disabled={transaction.isSystemGenerated}
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Transaction notes"
                  {...register("notes")}
                  rows={2}
                  disabled={transaction.isSystemGenerated}
                />
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={transaction.isSystemGenerated}
                onClick={() => setActiveTab("review")}
              >
                Continue to Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </TabsContent>

            <TabsContent value="review" className="space-y-4 mt-4">
              {/* Changes summary */}
              <div className="rounded-md border p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-yield" />
                  Changes to Apply
                </h4>
                {changes.map((change, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 text-sm">
                    <div className="font-medium">{change.field}:</div>
                    <div className="text-muted-foreground line-through">{change.oldValue}</div>
                    <div className="text-yield font-medium">{change.newValue}</div>
                  </div>
                ))}
              </div>

              {/* Workflow explanation */}
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>What will happen:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Original transaction will be voided (marked as void, not deleted)</li>
                    <li>New transaction will be created with corrected values</li>
                    <li>Both transactions will be linked in the audit trail</li>
                    <li>Investor position and AUM will be recalculated</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <hr />

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for correction *</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why this transaction needs to be corrected (minimum 10 characters)..."
                  {...register("reason")}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Required for audit trail. Be specific about the error and correction.
                </p>
                {errors.reason && (
                  <p className="text-sm text-destructive">{errors.reason.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmText">Type REISSUE to confirm</Label>
                <Input
                  id="confirmText"
                  placeholder="Type REISSUE"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={
                voidAndReissueMutation.isPending || voidAndReissueFullExitMutation.isPending
              }
            >
              Cancel
            </Button>
            {transaction.isSystemGenerated ? (
              <Button type="button" variant="secondary" disabled className="cursor-not-allowed">
                <Lock className="mr-2 h-4 w-4" />
                Cannot Modify System Transaction
              </Button>
            ) : activeTab === "review" ? (
              <Button
                type="submit"
                disabled={
                  voidAndReissueMutation.isPending ||
                  voidAndReissueFullExitMutation.isPending ||
                  confirmText !== "REISSUE" ||
                  !!errors.reason
                }
              >
                {(voidAndReissueMutation.isPending || voidAndReissueFullExitMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <RefreshCw className="mr-2 h-4 w-4" />
                Void and Reissue
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default VoidAndReissueDialog;
