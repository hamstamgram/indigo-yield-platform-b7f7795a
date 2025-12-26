/**
 * Fund AUM Bar Component
 * Displays small cards showing each fund's total AUM in the header for admins
 * Uses unified useFundAUM hook for consistent data across the app
 */

import { CryptoIcon } from "@/components/CryptoIcons";
import { Skeleton } from "@/components/ui/skeleton";
import { useFundAUM } from "@/hooks";
import { formatAUMCompact } from "@/utils/formatters";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FundAUMBar: React.FC = () => {
  const { funds, isLoading, isError, refetch } = useFundAUM();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-md" />
        ))}
      </div>
    );
  }

  // Error state - show compact error indicator with retry
  if (isError) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-destructive/10 border border-destructive/20">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-xs text-destructive">Failed to load</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0" 
          onClick={() => refetch()}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // Sort by AUM (highest first) and filter active funds with AUM
  const sortedFunds = [...funds]
    .filter((f) => f.latest_aum > 0)
    .sort((a, b) => b.latest_aum - a.latest_aum);

  // Empty state - no funds with AUM yet
  if (sortedFunds.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs text-muted-foreground">
        No fund AUM data yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
      {sortedFunds.map((fund) => (
        <div
          key={fund.id}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border flex-shrink-0 hover:bg-muted/80 transition-colors"
          title={`${fund.name} - ${fund.investor_count} investors`}
        >
          <CryptoIcon symbol={fund.asset} className="h-4 w-4" />
          <span className="text-xs font-semibold text-foreground">
            {formatAUMCompact(fund.latest_aum, fund.asset)}
          </span>
          <span className="text-xs text-muted-foreground">
            {fund.asset}
          </span>
        </div>
      ))}
    </div>
  );
};

export default FundAUMBar;
