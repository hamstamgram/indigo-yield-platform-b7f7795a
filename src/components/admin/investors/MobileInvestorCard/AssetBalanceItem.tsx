
import React from 'react';
import { Input } from '@/components/ui/input';

interface AssetBalanceItemProps {
  symbol: string;
  balance: string | number;
  isEditing: boolean;
  onChange?: (symbol: string, value: string) => void;
}

const AssetBalanceItem: React.FC<AssetBalanceItemProps> = ({ 
  symbol, 
  balance, 
  isEditing, 
  onChange 
}) => {
  return (
    <div className="flex justify-between items-center">
      <div className="font-medium">{symbol}</div>
      {isEditing ? (
        <Input 
          type="number"
          step="0.00000001"
          value={typeof balance === 'string' ? balance : balance.toString()}
          onChange={(e) => onChange && onChange(symbol, e.target.value)}
          className="min-w-[150px] h-10"
        />
      ) : (
        <div>
          {balance === '-' ? balance : typeof balance === 'number' ? balance.toFixed(4) : balance}
        </div>
      )}
    </div>
  );
};

export default AssetBalanceItem;
