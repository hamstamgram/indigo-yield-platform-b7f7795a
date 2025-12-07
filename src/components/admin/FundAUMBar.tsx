/**
 * Fund AUM Bar Component
 * Displays small cards showing each fund's total AUM in the header for admins
 */

import { useQuery } from "@tanstack/react-query";
import { getAllFundsWithAUM } from "@/services/aumService";
import { CryptoIcon } from "@/components/CryptoIcons";
import { Skeleton } from "@/components/ui/skeleton";

interface FundWithAUM {
  id: string;
  code: string;
  name: string;
  asset: string;
  latest_aum: number;
  investor_count: number;
}

const formatAUM = (value: number, symbol: string): string => {
  if (!value || value === 0) return "0";

  // For crypto, show appropriate decimals
  if (symbol === "BTC") {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  } else if (symbol === "ETH" || symbol === "SOL") {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    // Stablecoins and others
    return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
};

export const FundAUMBar: React.FC = () => {
  const { data: funds, isLoading } = useQuery<FundWithAUM[]>({
    queryKey: ["admin-fund-aum-bar"],
    queryFn: getAllFundsWithAUM,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

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
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title={`${fund.name} - ${fund.investor_count} investors`}
        >
          <CryptoIcon symbol={fund.asset} className="h-4 w-4" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            {formatAUM(fund.latest_aum, fund.asset)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {fund.asset}
          </span>
        </div>
      ))}
    </div>
  );
};

export default FundAUMBar;
