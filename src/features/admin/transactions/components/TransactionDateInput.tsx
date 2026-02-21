import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseDateFromDB } from "@/utils/dateUtils";
import { Label, Input } from "@/components/ui";
import { TransactionFormData } from "../hooks/useTransactionForm";

export function TransactionDateInput() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<TransactionFormData>();

  const txDate = watch("tx_date");

  return (
    <div className="space-y-2">
      <Label htmlFor="tx-date">Transaction Date *</Label>
      <div className="relative">
        <Input
          id="tx-date"
          type="date"
          value={txDate || ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              setValue("tx_date", val);
            }
          }}
          className={cn("w-full pl-3 pr-10", errors.tx_date && "border-destructive")}
        />
      </div>
      {errors.tx_date && <p className="text-sm text-destructive">{errors.tx_date.message}</p>}
    </div>
  );
}
