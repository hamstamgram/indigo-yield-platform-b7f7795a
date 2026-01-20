/**
 * FinancialValue - Atomic component for displaying precise financial values
 * Shows micro-balance tooltip when value rounds to zero at display decimals
 * Uses Decimal.js for all calculations to prevent floating-point errors
 */

import Decimal from "decimal.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
}

// Asset-specific default decimals
const ASSET_DECIMALS: Record<string, number> = {
  BTC: 8,
  ETH: 6,
  SOL: 4,
  XRP: 4,
  USDC: 2,
  USDT: 2,
  EURC: 2,
  XAUT: 4,
};

export function FinancialValue({
  value,
  asset = "",
  displayDecimals,
  className,
  showAsset = true,
  prefix = "",
  colorize = false,
}: FinancialValueProps) {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  // Use Decimal.js for precision
  const decimalValue = new Decimal(value);

  // Determine display decimals: explicit > asset-specific > default 8
  const decimals = displayDecimals ?? ASSET_DECIMALS[asset?.toUpperCase()] ?? 8;

  // Format for display
  const displayValue = decimalValue.toFixed(decimals);
  const fullPrecision = decimalValue.toFixed(10);

  // Check if value is a micro-balance (exists but rounds to zero)
  const isMicroBalance =
    decimalValue.abs().greaterThan(0) &&
    decimalValue.abs().lessThan(new Decimal(10).pow(-decimals));

  // Check if values differ (for tooltip decision)
  const hasPrecisionLoss = displayValue !== fullPrecision.slice(0, displayValue.length);

  // Determine color based on sign
  const valueColor = colorize
    ? decimalValue.greaterThan(0)
      ? "text-green-600 dark:text-green-400"
      : decimalValue.lessThan(0)
        ? "text-red-600 dark:text-red-400"
        : ""
    : "";

  // Format the display string
  const formattedValue = `${prefix}${displayValue}${showAsset && asset ? ` ${asset}` : ""}`;
  const formattedFullValue = `${prefix}${fullPrecision}${showAsset && asset ? ` ${asset}` : ""}`;

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
            <p className="text-xs text-muted-foreground">Micro-balance</p>
            <p className="font-mono text-sm">{formattedFullValue}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Regular value: show tooltip only if precision differs
  if (hasPrecisionLoss) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("font-mono cursor-help", valueColor, className)}>
            {formattedValue}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Full precision</p>
            <p className="font-mono text-sm">{formattedFullValue}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // No precision loss: simple display
  return <span className={cn("font-mono", valueColor, className)}>{formattedValue}</span>;
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
 * Check if two financial values are equal to 10th decimal
 */
export function financialValuesEqual(a: number | string, b: number | string): boolean {
  const decA = new Decimal(a);
  const decB = new Decimal(b);
  return decA.minus(decB).abs().lessThan(new Decimal("0.0000000001"));
}
