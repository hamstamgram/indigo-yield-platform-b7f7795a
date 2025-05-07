
import React from 'react';
import { Input } from '@/components/ui/input';

interface FeePercentageItemProps {
  fee: string | number;
  isEditing: boolean;
  onChange?: (value: string) => void;
}

const FeePercentageItem: React.FC<FeePercentageItemProps> = ({ 
  fee, 
  isEditing, 
  onChange 
}) => {
  return (
    <div className="flex justify-between items-center border-t pt-3 mt-3">
      <div className="font-medium">Fee (%)</div>
      {isEditing ? (
        <Input 
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={typeof fee === 'string' ? fee : fee.toString()}
          onChange={(e) => onChange && onChange(e.target.value)}
          className="min-w-[150px] h-10"
        />
      ) : (
        <div>
          {typeof fee === 'number' ? `${fee.toFixed(1)}%` : fee}
        </div>
      )}
    </div>
  );
};

export default FeePercentageItem;
