import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Button,
  Calendar,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Input,
} from "@/components/ui";
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
        <PopoverContent className="w-auto p-3" align="start">
          <div className="flex flex-col space-y-3">
            <Input
              type="date"
              value={txDate || ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  setValue("tx_date", val);
                }
              }}
              className="w-full"
            />
            <Calendar
              mode="single"
              selected={txDate ? new Date(txDate) : undefined}
              onSelect={(date) => date && setValue("tx_date", format(date, "yyyy-MM-dd"))}
              initialFocus
              className="p-0 pointer-events-auto"
            />
          </div>
        </PopoverContent>
      </Popover>
      {errors.tx_date && <p className="text-sm text-destructive">{errors.tx_date.message}</p>}
    </div>
  );
}
