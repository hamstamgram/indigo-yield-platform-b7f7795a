/**
 * Ledger Header Component
 * Contains title, record count, and action buttons
 */

import { Button, Badge } from "@/components/ui";
import { BookOpen, Filter, X, Plus, Eye, EyeOff } from "lucide-react";

interface LedgerHeaderProps {
  transactionCount: number;
  totalCount: number;
  showVoided: boolean;
  showFilters: boolean;
  hasActiveFilters: boolean;
  onToggleVoided: () => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  onAddTransaction: () => void;
}

export function LedgerHeader({
  transactionCount,
  totalCount,
  showVoided,
  showFilters,
  hasActiveFilters,
  onToggleVoided,
  onToggleFilters,
  onClearFilters,
  onAddTransaction,
}: LedgerHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Transaction Ledger</h3>
        <Badge
          variant="secondary"
          className="text-xs"
          title={`Showing ${transactionCount} of ${totalCount} total`}
        >
          {transactionCount}
          {totalCount !== transactionCount ? ` / ${totalCount}` : ""} records
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onAddTransaction}>
          <Plus className="h-4 w-4 mr-1" />
          Add Transaction
        </Button>
        <Button
          variant={showVoided ? "secondary" : "ghost"}
          size="sm"
          onClick={onToggleVoided}
          title={showVoided ? "Hide voided transactions" : "Show voided transactions"}
        >
          {showVoided ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
          {showVoided ? "Showing Voided" : "Show Voided"}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          onClick={onToggleFilters}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="default" className="ml-2 h-4 px-1 text-[10px]">
              Active
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}
