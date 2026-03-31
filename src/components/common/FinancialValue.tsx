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

  // Use Decimal.js for precision
  let decimalValue: Decimal;
  try {
    decimalValue = new Decimal(value);
  } catch {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  // Determine display decimals: explicit > asset-specific > default 4
  const decimals = displayDecimals ?? getAssetDecimals(asset);

  // Format for display
  const rawDisplay = decimalValue.toFixed(decimals);
  const fullPrecision = decimalValue.toFixed(18);

  const formatWithSeparators = (val: string): string => {
    const [intPart, decPart] = val.split(".");
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  };

  const displayValue = formatWithSeparators(rawDisplay);

  const isMicroBalance =
    decimalValue.abs().greaterThan(0) &&
    decimalValue.abs().lessThan(new Decimal(10).pow(-decimals));

  const hasPrecisionLoss = rawDisplay !== fullPrecision.slice(0, rawDisplay.length);

  // Determine color based on sign using theme tokens
  const valueColor = colorize
    ? decimalValue.greaterThan(0)
      ? "text-yield" // Using institutional emerald/gold brand color
      : decimalValue.lessThan(0)
        ? "text-rose-400"
        : ""
    : "";

  // Format the display string
  const formattedValue = `${prefix}${displayValue}${showAsset && asset ? ` ${asset}` : ""}`;
  const formattedFullValue = `${prefix}${formatWithSeparators(fullPrecision)}${showAsset && asset ? ` ${asset}` : ""}`;

  // Institutional Responsive Shrink (Council 4 Seal)
  // Replaces amateur fixed-width with container-aware scaling
  const containerClasses = cn(
    "font-mono whitespace-nowrap inline-block transition-all duration-300",
    shrink && "max-w-[10rem] md:max-w-[15rem] lg:max-w-none overflow-hidden text-ellipsis align-bottom",
    valueColor,
    className
  );

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

  return <span className={containerClasses}>{formattedValue}</span>;
}

export function sumFinancialValues(values: (number | string | null | undefined)[]): Decimal {
  return values.reduce((sum, val) => {
    if (val === null || val === undefined) return sum;
    return sum.plus(new Decimal(val));
  }, new Decimal(0));
}

export function financialValuesEqual(a: number | string, b: number | string): boolean {
  const decA = new Decimal(a);
  const decB = new Decimal(b);
  return decA.minus(decB).abs().isZero();
}
