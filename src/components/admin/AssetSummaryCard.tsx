
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
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(2)}%`;
};

const formatCrypto = (value: number, symbol: string) => {
  const decimals = symbol.toLowerCase() === 'btc' ? 8 : 
                  symbol.toLowerCase() === 'usdc' ? 2 : 4;
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
    <Card key={id} className="bg-gray-50 dark:bg-gray-800 border-0">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <CryptoIcon symbol={symbol} className="h-12 w-12" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{name}</h3>
            <p className="text-sm text-gray-500">{symbol}</p>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Balance</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCrypto(totalBalance, symbol)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">USD Value</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(usdValue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Users</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {totalUsers}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Avg Yield</p>
            <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
              {formatPercent(avgYield)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetSummaryCard;
