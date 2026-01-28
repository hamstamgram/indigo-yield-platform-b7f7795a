import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Calendar, Label, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
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
      <Label>Transaction Date *</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !txDate && "text-muted-foreground",
              errors.tx_date && "border-destructive"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {txDate ? format(new Date(txDate), "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={txDate ? new Date(txDate) : undefined}
            onSelect={(date) => date && setValue("tx_date", format(date, "yyyy-MM-dd"))}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      {errors.tx_date && <p className="text-sm text-destructive">{errors.tx_date.message}</p>}
    </div>
  );
}
