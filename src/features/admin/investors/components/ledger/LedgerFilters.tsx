/**
 * Ledger Filters Component
 * Filter controls for type, purpose, and date range
 */

import {
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Calendar } from "lucide-react";
import { TX_TYPES, TX_PURPOSE } from "./types";

interface LedgerFiltersProps {
  txType: string;
  txPurpose: string;
  dateFrom: string;
  dateTo: string;
  onTypeChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

export function LedgerFilters({
  txType,
  txPurpose,
  dateFrom,
  dateTo,
  onTypeChange,
  onPurposeChange,
  onDateFromChange,
  onDateToChange,
}: LedgerFiltersProps) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Type Filter */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={txType} onValueChange={onTypeChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                {TX_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purpose Filter */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Purpose</label>
            <Select value={txPurpose} onValueChange={onPurposeChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Purpose" />
              </SelectTrigger>
              <SelectContent>
                {TX_PURPOSE.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="h-8 text-xs pl-7"
              />
            </div>
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="h-8 text-xs pl-7"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
