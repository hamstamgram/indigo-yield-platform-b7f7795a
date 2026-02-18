/**
 * Yields Filter Bar
 * Fund, purpose, and date range filters for yields table
 */

import { CryptoIcon } from "@/components/CryptoIcons";
import {
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Input,
  Label,
} from "@/components/ui";
import { Filter } from "lucide-react";
import type { YieldFilters } from "@/services/admin";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

interface YieldsFilterBarProps {
  filters: YieldFilters;
  funds: Fund[];
  onFilterChange: (key: string, value: string | null) => void;
  onReset: () => void;
}

export function YieldsFilterBar({ filters, funds, onFilterChange, onReset }: YieldsFilterBarProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Fund</Label>
            <Select
              value={filters.fundId || "all"}
              onValueChange={(v) => onFilterChange("fundId", v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Funds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Funds</SelectItem>
                {funds.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    <span className="flex items-center gap-2">
                      <CryptoIcon symbol={f.asset} className="h-4 w-4" />
                      {f.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Purpose</Label>
            <Select
              value={filters.purpose || "all"}
              onValueChange={(v) => onFilterChange("purpose", v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="reporting">Reporting</SelectItem>
                <SelectItem value="transaction">Transaction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Date From</Label>
            <Input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => onFilterChange("dateFrom", e.target.value || null)}
              className="w-40"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Date To</Label>
            <Input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => onFilterChange("dateTo", e.target.value || null)}
              className="w-40"
            />
          </div>

          <Button variant="ghost" size="sm" onClick={onReset}>
            <Filter className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
