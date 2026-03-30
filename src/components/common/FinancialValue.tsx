/**
 * FinancialValue - Atomic component for displaying precise financial values
 * Shows micro-balance tooltip when value rounds to zero at display decimals
 * Uses Decimal.js for all calculations to prevent floating-point errors
 */

import Decimal from "decimal.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getAssetDecimals } from "@/types/asset";

interface FinancialValueProps {
  /** The numeric value to display */
  value: number | string | null | undefined;
  /** Asset symbol (e.g., 'BTC', 'USDC') */
  asset?: string;
  /** Number of decimal places to display (default: 8) */
  displayDecimals?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the asset symbol after the value */
  showAsset?: boolean;
  /** Custom prefix (e.g., '+' for positive changes) */
  prefix?: string;
  /** Whether to apply color based on value sign */
  colorize?: boolean;
  /** Whether to allow the value to shrink on mobile viewports */
  shrink?: boolean;
}

export function FinancialValue({
  value,
  asset = "",
  displayDecimals,
  className,
  showAsset = true,
  prefix = "",
  colorize = false,
  shrink = false,
}: FinancialValueProps) {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  // Use Decimal.js for precision — guard against NaN, "", Infinity, or non-numeric strings
  let decimalValue: Decimal;
  try {
    decimalValue = new Decimal(value);
  } catch {
    // Invalid input (NaN, "", "abc", Infinity) — render dash instead of crashing
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  // Determine display decimals: explicit > asset-specific (from ASSET_CONFIGS) > default 4
  const decimals = displayDecimals ?? getAssetDecimals(asset);

  // Format for display
  const rawDisplay = decimalValue.toFixed(decimals);
  const fullPrecision = decimalValue.toFixed(18); // Show full 18-decimal precision in tooltips

  // Add thousand separators while preserving decimal precision
  const formatWithSeparators = (val: string): string => {
    const [intPart, decPart] = val.split(".");
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  };

  const displayValue = formatWithSeparators(rawDisplay);

  // Check if value is a micro-balance (exists but rounds to zero)
  const isMicroBalance =
    decimalValue.abs().greaterThan(0) &&
    decimalValue.abs().lessThan(new Decimal(10).pow(-decimals));

  // Check if values differ (for tooltip decision) - compare raw values without separators
  const hasPrecisionLoss = rawDisplay !== fullPrecision.slice(0, rawDisplay.length);

  // Determine color based on sign
  const valueColor = colorize
    ? decimalValue.greaterThan(0)
      ? "text-emerald-400"
      : decimalValue.lessThan(0)
        ? "text-rose-400"
        : ""
    : "";

  // Format the display string
  const formattedValue = `${prefix}${displayValue}${showAsset && asset ? ` ${asset}` : ""}`;
  const formattedFullValue = `${prefix}${formatWithSeparators(fullPrecision)}${showAsset && asset ? ` ${asset}` : ""}`;

  // Container classes for responsive shrink
  const containerClasses = cn(
    "font-mono whitespace-nowrap",
    shrink && "inline-block max-w-[140px] overflow-hidden text-ellipsis align-bottom",
    valueColor,
    className
  );

  // Micro-balance: show special indicator with tooltip
  if (isMicroBalance) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "cursor-help underline decoration-dotted decoration-muted-foreground/50",
              "font-mono text-muted-foreground",
              className
            )}
          >
            ~0{showAsset && asset ? ` ${asset}` : ""}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Micro-balance (Exact Value)</p>
            <p className="font-mono text-sm break-all">{formattedFullValue}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Regular value: show tooltip only if precision differs or shrinking is enabled
  if (hasPrecisionLoss || shrink) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={containerClasses}>{formattedValue}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {shrink ? "Exact Value" : "Full precision"}
            </p>
            <p className="font-mono text-sm break-all">{formattedFullValue}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // No precision loss: simple display
  return <span className={containerClasses}>{formattedValue}</span>;
}

/**
 * Helper function to sum financial values with Decimal.js precision
 */
export function sumFinancialValues(values: (number | string | null | undefined)[]): Decimal {
  return values.reduce((sum, val) => {
    if (val === null || val === undefined) return sum;
    return sum.plus(new Decimal(val));
  }, new Decimal(0));
}

/**
 * Check if two financial values are equal to 18th decimal
 */
export function financialValuesEqual(a: number | string, b: number | string): boolean {
  const decA = new Decimal(a);
  const decB = new Decimal(b);
  return decA.minus(decB).abs().isZero();
}
