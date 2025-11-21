import React from "react";
import { Input } from "@/components/ui/input";

interface FeePercentageItemProps {
  fee: string;
  feePercentage?: number | null;
  isEditing: boolean;
  onChange: (value: string) => void;
}

const FeePercentageItem: React.FC<FeePercentageItemProps> = ({
  fee,
  feePercentage,
  isEditing,
  onChange,
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
          value={fee}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[80px]"
        />
      ) : (
        <div>
          {feePercentage !== null && feePercentage !== undefined
            ? `${feePercentage.toFixed(1)}%`
            : "2.0%"}
        </div>
      )}
    </div>
  );
};

export default FeePercentageItem;
