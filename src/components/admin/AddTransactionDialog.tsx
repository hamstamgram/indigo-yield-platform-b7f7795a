import { useState } from "react";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createAdminTransaction } from "@/services/transactionService";
import { Loader2 } from "lucide-react";

// Transaction validation schema
const transactionSchema = z.object({
  txn_type: z.enum(["DEPOSIT", "WITHDRAWAL", "YIELD", "INTEREST", "FEE"], {
    required_error: "Transaction type is required",
  }),
  asset: z
    .string()
    .trim()
    .min(1, "Asset is required")
    .max(10, "Asset code must be less than 10 characters")
    .regex(/^[A-Z0-9]+$/, "Asset code must be uppercase letters and numbers only"),
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

type TransactionFormData = z.infer<typeof transactionSchema>;

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investorId: string;
  fundId: string;
  onSuccess: () => void;
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  investorId,
  fundId,
  onSuccess,
}: AddTransactionDialogProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      tx_date: new Date().toISOString().split("T")[0],
      asset: "BTC",
    },
  });

  const txnType = watch("txn_type");

  const onSubmit = async (data: TransactionFormData) => {
    try {
      setLoading(true);

      const result = await createAdminTransaction({
        investorId,
        fundId,
        type: data.txn_type as "DEPOSIT" | "WITHDRAWAL" | "YIELD" | "INTEREST" | "FEE",
        asset: data.asset,
        amount: Number(data.amount),
        txDate: data.tx_date,
        referenceId: data.reference_id || undefined,
        txHash: data.tx_hash || undefined,
        notes: data.notes || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create transaction");
      }

      toast.success("Transaction created successfully");
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Manually create a transaction for this investor. All fields are validated and logged.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="txn_type">Transaction Type *</Label>
            <Select value={txnType} onValueChange={(value) => setValue("txn_type", value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEPOSIT">Deposit</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                <SelectItem value="YIELD">Yield</SelectItem>
                <SelectItem value="INTEREST">Interest</SelectItem>
                <SelectItem value="FEE">Fee</SelectItem>
              </SelectContent>
            </Select>
            {errors.txn_type && (
              <p className="text-sm text-destructive">{errors.txn_type.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset">Asset *</Label>
              <Input
                id="asset"
                placeholder="e.g., BTC, ETH"
                {...register("asset")}
                className={errors.asset ? "border-destructive" : ""}
              />
              {errors.asset && <p className="text-sm text-destructive">{errors.asset.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                placeholder="0.00"
                {...register("amount")}
                className={errors.amount ? "border-destructive" : ""}
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx_date">Transaction Date *</Label>
            <Input
              id="tx_date"
              type="date"
              {...register("tx_date")}
              className={errors.tx_date ? "border-destructive" : ""}
            />
            {errors.tx_date && <p className="text-sm text-destructive">{errors.tx_date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_id">Reference ID</Label>
            <Input
              id="reference_id"
              placeholder="Optional reference number"
              {...register("reference_id")}
              className={errors.reference_id ? "border-destructive" : ""}
            />
            {errors.reference_id && (
              <p className="text-sm text-destructive">{errors.reference_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx_hash">Transaction Hash</Label>
            <Input
              id="tx_hash"
              placeholder="Optional blockchain transaction hash"
              {...register("tx_hash")}
              className={errors.tx_hash ? "border-destructive" : ""}
            />
            {errors.tx_hash && <p className="text-sm text-destructive">{errors.tx_hash.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes about this transaction"
              {...register("notes")}
              className={errors.notes ? "border-destructive" : ""}
              rows={3}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
