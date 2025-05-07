
import React from 'react';
import { Input } from '@/components/ui/input';
import { Asset } from '@/types/investorTypes';

interface AssetBalanceItemProps {
  asset: Asset;
  balance: string;
  portfolioSummary?: {
    [key: string]: { balance: number; usd_value: number };
  };
  isEditing: boolean;
  onChange: (value: string) => void;
}

const AssetBalanceItem: React.FC<AssetBalanceItemProps> = ({
  asset,
  balance,
  portfolioSummary,
  isEditing,
  onChange
}) => {
  const normalizedSymbol = asset.symbol.toUpperCase();
  
  return (
    <div className="flex justify-between items-center">
      <div className="font-medium">{asset.symbol}</div>
      {isEditing ? (
        <Input 
          type="number"
          step="0.00000001"
          value={balance}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[120px]"
        />
      ) : (
        <div>
          {portfolioSummary && portfolioSummary[normalizedSymbol] 
            ? `${portfolioSummary[normalizedSymbol].balance.toFixed(4)}`
            : '-'}
        </div>
      )}
    </div>
  );
};

export default AssetBalanceItem;
