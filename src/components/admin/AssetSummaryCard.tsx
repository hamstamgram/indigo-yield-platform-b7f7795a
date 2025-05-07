
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
  // Format crypto values with appropriate decimals and fixed width
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
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-shrink-0">
            <CryptoIcon symbol={symbol} className="h-12 w-12" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{name}</h3>
            <p className="text-sm text-gray-500">{symbol}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 flex-1">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Total Balance</p>
            <div className="min-h-[40px] flex items-center">
              <p className="text-base font-semibold text-gray-900 dark:text-white break-all">
                {formatCrypto(totalBalance, symbol)}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">USD Value</p>
            <div className="min-h-[40px] flex items-center">
              <p className="text-base font-semibold text-gray-900 dark:text-white break-all">
                {formatCurrency(usdValue)}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Users</p>
            <div className="min-h-[28px] flex items-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {totalUsers}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Avg Yield</p>
            <div className="min-h-[28px] flex items-center">
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
