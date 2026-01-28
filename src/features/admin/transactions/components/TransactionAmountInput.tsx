import { useFormContext } from "react-hook-form";
import { Input, Label } from "@/components/ui";
import { TransactionFormData } from "../hooks/useTransactionForm";

export function TransactionAmountInput() {
  const {
    register,
    formState: { errors },
  } = useFormContext<TransactionFormData>();

  return (
    <div className="space-y-2">
      <Label htmlFor="amount">Amount *</Label>
      <Input
        id="amount"
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        {...register("amount")}
        className={errors.amount ? "border-destructive" : ""}
      />
      {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
    </div>
  );
}
