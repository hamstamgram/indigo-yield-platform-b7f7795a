/**
 * Fund AUM Bar Component
 * Displays small cards showing each fund's total AUM in the header for admins
 * Uses unified useFundAUM hook for consistent data across the app
 */

import { CryptoIcon } from "@/components/CryptoIcons";
import { Skeleton } from "@/components/ui/skeleton";
import { useFundAUM } from "@/hooks/useFundAUM";
import { formatAUMCompact } from "@/utils/formatters";

export const FundAUMBar: React.FC = () => {
  const { funds, isLoading } = useFundAUM();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-md" />
        ))}
      </div>
    );
  }

  if (!funds || funds.length === 0) {
    return null;
  }

  // Sort by AUM (highest first) and filter active funds
  const sortedFunds = [...funds]
    .filter((f) => f.latest_aum > 0)
    .sort((a, b) => b.latest_aum - a.latest_aum);

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
