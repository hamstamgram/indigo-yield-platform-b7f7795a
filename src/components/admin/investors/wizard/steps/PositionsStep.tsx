import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWizard } from "../WizardContext";
import { getAssetStep, ASSET_PRECISION } from "../types";
import { getAssetLogo } from "@/utils/assets";
import { AlertCircle } from "lucide-react";

const PositionsStep: React.FC = () => {
  const { data, updateData, setCanProceed, assets } = useWizard();
  const [error, setError] = useState<string | null>(null);

  // Initialize positions with 0 for all assets
  useEffect(() => {
    const initialPositions: Record<string, number> = {};
    assets.forEach((asset) => {
      initialPositions[asset.symbol] = data.positions[asset.symbol] ?? 0;
    });
    if (Object.keys(data.positions).length === 0) {
      updateData("positions", initialPositions);
    }
  }, [assets, data.positions, updateData]);

  // Validate positions
  useEffect(() => {
    const hasPositivePosition = Object.values(data.positions).some((val) => val > 0);
    const allNonNegative = Object.values(data.positions).every((val) => val >= 0);

    if (!allNonNegative) {
      setError("All positions must be non-negative");
      setCanProceed(false);
      return;
    }

    if (!hasPositivePosition) {
      setError("At least one asset must have a positive balance");
      setCanProceed(false);
      return;
    }

    setError(null);
    setCanProceed(true);
  }, [data.positions, setCanProceed]);

  const handlePositionChange = (symbol: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const precision = ASSET_PRECISION[symbol] || 8;
    
    // Round to asset precision
    const roundedValue = Math.round(numValue * Math.pow(10, precision)) / Math.pow(10, precision);
    
    updateData("positions", {
      ...data.positions,
      [symbol]: roundedValue,
    });
  };

  const activeAssets = assets;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Initial Positions</h3>
        <p className="text-sm text-muted-foreground">
          Set the initial token balances for each fund asset
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeAssets.map((asset) => {
          const step = getAssetStep(asset.symbol);
          const precision = ASSET_PRECISION[asset.symbol] || 8;
          const currentValue = data.positions[asset.symbol] ?? 0;

          return (
            <div key={asset.id} className="space-y-2">
              <Label className="flex items-center gap-2">
                <img
                  src={getAssetLogo(asset.symbol)}
                  alt={asset.symbol}
                  className="w-5 h-5 rounded-full"
                />
                <span>
                  {asset.name} <span className="text-muted-foreground">({asset.symbol})</span>
                </span>
              </Label>
              <Input
                type="number"
                step={step}
                min="0"
                placeholder="0"
                value={currentValue || ""}
                onChange={(e) => handlePositionChange(asset.symbol, e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Precision: {precision} decimals
              </p>
            </div>
          );
        })}
      </div>

      {/* Summary of non-zero positions */}
      {Object.entries(data.positions).filter(([_, val]) => val > 0).length > 0 && (
        <div className="p-4 border rounded-lg bg-accent/10">
          <h4 className="font-medium mb-2">Positions to Create</h4>
          <div className="space-y-1 text-sm">
            {Object.entries(data.positions)
              .filter(([_, val]) => val > 0)
              .map(([symbol, val]) => (
                <div key={symbol} className="flex justify-between font-mono">
                  <span className="text-muted-foreground">{symbol}:</span>
                  <span className="font-medium">{val.toFixed(ASSET_PRECISION[symbol] || 8)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionsStep;
