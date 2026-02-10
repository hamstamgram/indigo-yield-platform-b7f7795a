import { useFormContext } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui";
import { TransactionFormData } from "../hooks/useTransactionForm";

export function TransactionMetadataInputs() {
  const {
    register,
    formState: { errors },
  } = useFormContext<TransactionFormData>();

  return (
    <>
      {/* Reference ID */}
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

      {/* Notes */}
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
    </>
  );
}
