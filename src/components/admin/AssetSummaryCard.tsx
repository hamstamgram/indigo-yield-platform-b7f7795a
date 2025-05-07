
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CryptoIcon } from "@/components/CryptoIcons";

interface AssetSummaryProps {
  id: number;
  symbol: string;
  name: string;
  totalBalance: number;
  usdValue: number;
  totalUsers: number;
  avgYield: number;
}

// Format helpers
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(2)}%`;
};

const formatCrypto = (value: number, symbol: string) => {
  // Format crypto values with appropriate decimals
  const decimals = symbol.toLowerCase() === 'btc' ? 8 : 
                  symbol.toLowerCase() === 'usdc' ? 2 : 4;
                  
  // For large values like USDC, format with commas
  if (value > 10000) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals
    }).format(value) + ` ${symbol.toUpperCase()}`;
  }
  
  return `${value.toFixed(decimals)} ${symbol.toUpperCase()}`;
};

const AssetSummaryCard: React.FC<AssetSummaryProps> = ({
  id,
  symbol,
  name,
  totalBalance,
  usdValue,
  totalUsers,
  avgYield
}) => {
  return (
    <Card key={id} className="bg-gray-50 dark:bg-gray-800 border-0 h-full">
      <CardContent className="p-6 h-full flex flex-col">
        {/* Header with icon and name */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-shrink-0">
            <CryptoIcon symbol={symbol} className="h-12 w-12" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{name}</h3>
            <p className="text-sm text-gray-500">{symbol}</p>
          </div>
        </div>
        
        {/* Balance information - fully stacked layout for clarity */}
        <div className="space-y-6">
          {/* Balance section */}
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Balance</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              {formatCrypto(totalBalance, symbol)}
            </p>
          </div>
          
          {/* USD Value section */}
          <div>
            <p className="text-sm text-gray-500 mb-1">USD Value</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              {formatCurrency(usdValue)}
            </p>
          </div>
          
          {/* Statistics in a grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            {/* Users count */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Users</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {totalUsers}
              </p>
            </div>
            
            {/* Average yield */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Avg Yield</p>
              <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                {formatPercent(avgYield)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetSummaryCard;
