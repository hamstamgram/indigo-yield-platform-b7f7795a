import React from "react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Search, Users, ArrowDownToLine, X } from "lucide-react";
import type { EnrichedInvestor } from "@/hooks/data";

interface Fund {
  id: string;
  name: string;
}

interface InvestorFiltersBarProps {
  searchTerm: string;
  fundFilter: string;
  statusFilter: string;
  ibFilter: string;
  hasWithdrawalsFilter: string;
  enrichedInvestors: EnrichedInvestor[];
  funds: Fund[];
  totalCount: number;
  filteredCount: number;
  hasActiveFilters: boolean;
  onSearchChange: (value: string | null) => void;
  onFundChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onIbChange: (value: string) => void;
  onWithdrawalsChange: (value: string) => void;
  onClearFilters: () => void;
}

export const InvestorFiltersBar: React.FC<InvestorFiltersBarProps> = ({
  searchTerm,
  fundFilter,
  statusFilter,
  ibFilter,
  hasWithdrawalsFilter,
  enrichedInvestors,
  funds,
  totalCount,
  filteredCount,
  hasActiveFilters,
  onSearchChange,
  onFundChange,
  onStatusChange,
  onIbChange,
  onWithdrawalsChange,
  onClearFilters,
}) => {
  return (
    <div className="px-6 py-3 border-b bg-muted/30 flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name or email..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value || null)}
          className="pl-8 h-9"
        />
      </div>

      {/* Quick filter counts */}
      <div className="flex items-center gap-1">
        <Button
          variant={statusFilter === "active" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => onStatusChange(statusFilter === "active" ? "all" : "active")}
        >
          Active: {enrichedInvestors.filter((i) => i.fundsHeldCount > 0).length}
        </Button>
        <Button
          variant={statusFilter === "inactive" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => onStatusChange(statusFilter === "inactive" ? "all" : "inactive")}
        >
          No positions: {enrichedInvestors.filter((i) => i.fundsHeldCount === 0).length}
        </Button>
      </div>

      <Select value={fundFilter} onValueChange={onFundChange}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Fund" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Funds</SelectItem>
          {funds.map((fund) => (
            <SelectItem key={fund.id} value={fund.id}>
              {fund.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={ibFilter} onValueChange={onIbChange}>
        <SelectTrigger className="w-[130px] h-9">
          <Users className="h-3.5 w-3.5 mr-1" />
          <SelectValue placeholder="IB" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="has_ib">Has IB</SelectItem>
          <SelectItem value="no_ib">No IB</SelectItem>
        </SelectContent>
      </Select>

      <Select value={hasWithdrawalsFilter} onValueChange={onWithdrawalsChange}>
        <SelectTrigger className="w-[160px] h-9">
          <ArrowDownToLine className="h-3.5 w-3.5 mr-1" />
          <SelectValue placeholder="Withdrawals" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="yes">Pending Withdrawals</SelectItem>
          <SelectItem value="no">No Pending</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-9">
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}

      <span className="text-xs text-muted-foreground ml-auto">
        {filteredCount} of {totalCount}
      </span>
    </div>
  );
};
