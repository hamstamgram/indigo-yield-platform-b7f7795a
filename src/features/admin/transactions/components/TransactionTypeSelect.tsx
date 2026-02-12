import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { TransactionFormData } from "../hooks/useTransactionForm";

interface TransactionTypeSelectProps {
  value: string;
  onChange: (value: TransactionFormData["txn_type"]) => void;
  hasExistingPosition: boolean;
  isFirstInvestment: boolean;
  error?: string;
}

export function TransactionTypeSelect({
  value,
  onChange,
  hasExistingPosition,
  isFirstInvestment,
  error,
}: TransactionTypeSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="txn_type">Transaction Type *</Label>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as TransactionFormData["txn_type"])}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select transaction type" />
        </SelectTrigger>
        <SelectContent>
          {/* Show First Investment - only disabled if position exists */}
          <SelectItem
            value="FIRST_INVESTMENT"
            disabled={hasExistingPosition}
            className={cn(hasExistingPosition && "opacity-50")}
          >
            First Investment {hasExistingPosition && "(position exists)"}
          </SelectItem>
          {/* Deposit is always available */}
          <SelectItem value="DEPOSIT">Deposit / Top-up</SelectItem>
          <SelectItem
            value="WITHDRAWAL"
            disabled={isFirstInvestment}
            className={cn(isFirstInvestment && "opacity-50")}
          >
            Withdrawal {isFirstInvestment && "(no position)"}
          </SelectItem>
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
