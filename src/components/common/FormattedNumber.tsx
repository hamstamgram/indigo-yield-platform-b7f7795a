/**
 * FormattedNumber - Standardized number display component
 *
 * A wrapper for displaying formatted numbers consistently.
 * Maps to centralized formatters based on type.
 */

import { cn } from "@/lib/utils";
import { toNum } from "@/utils/numeric";
import {
  formatAUM,
  formatAUMCompact,
  formatAssetWithSymbol,
  formatTokenBalance,
  formatPercentage,
} from "@/utils/formatters";

export type FormattedNumberType = "aum" | "aum-compact" | "token" | "percentage" | "number";

export interface FormattedNumberProps {
  /** The numeric value to display */
  value: number | string | null | undefined;
  /** Asset symbol for precision (e.g., "BTC", "USDT") */
  asset?: string;
  /** Display type determining formatting rules */
  type?: FormattedNumberType;
  /** Whether to show the asset symbol after the value */
  showAsset?: boolean;
  /** Apply color based on value sign (green/red) */
  colorize?: boolean;
  /** Show + sign for positive values when colorize is true */
  showSign?: boolean;
  /** Number of decimal places for percentage type */
  percentageDecimals?: number;
  /** Additional CSS classes */
  className?: string;
  /** Placeholder for null/undefined values */
  placeholder?: string;
}

export function FormattedNumber({
  value,
  asset = "",
  type = "number",
  showAsset = false,
  colorize = false,
  showSign = false,
  percentageDecimals = 2,
  className,
  placeholder = "—",
}: FormattedNumberProps) {
  // Handle null/undefined
  if (value === null || value === undefined || value === "") {
    return <span className={cn("text-muted-foreground", className)}>{placeholder}</span>;
  }

  // Parse to number
  const numValue = toNum(value);

  if (isNaN(numValue)) {
    return <span className={cn("text-muted-foreground", className)}>{placeholder}</span>;
  }

  // Determine text color based on sign
  const getColorClass = () => {
    if (!colorize) return "";
    if (numValue > 0) return "text-emerald-400";
    if (numValue < 0) return "text-rose-400";
    return "";
  };

  // Format based on type
  const formatValue = (): string => {
    switch (type) {
      case "aum":
        return formatAUM(numValue, asset, { showSymbol: showAsset });

      case "aum-compact":
        const compact = formatAUMCompact(numValue, asset);
        return showAsset && asset ? `${compact} ${asset}` : compact;

      case "token":
        if (showAsset && asset) {
          return formatAssetWithSymbol(numValue, asset);
        }
        return formatTokenBalance(numValue, asset, { showSymbol: false });

      case "percentage":
        return formatPercentage(numValue, percentageDecimals, showSign);

      case "number":
      default:
        // Basic number formatting with thousand separators
        const formatted = new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 8,
        }).format(Math.abs(numValue));

        const sign = showSign && colorize && numValue > 0 ? "+" : "";
        const negSign = numValue < 0 ? "-" : "";
        const suffix = showAsset && asset ? ` ${asset}` : "";

        return `${negSign}${sign}${formatted}${suffix}`;
    }
  };

  return <span className={cn("font-mono", getColorClass(), className)}>{formatValue()}</span>;
}

/**
 * Convenience component for AUM display
 */
export function AUMValue({
  value,
  asset,
  showAsset = true,
  compact = false,
  className,
}: {
  value: number | string | null | undefined;
  asset: string;
  showAsset?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <FormattedNumber
      value={value}
      asset={asset}
      type={compact ? "aum-compact" : "aum"}
      showAsset={showAsset}
      className={className}
    />
  );
}

/**
 * Convenience component for percentage display
 */
export function PercentageValue({
  value,
  decimals = 2,
  colorize = false,
  showSign = false,
  className,
}: {
  value: number | string | null | undefined;
  decimals?: number;
  colorize?: boolean;
  showSign?: boolean;
  className?: string;
}) {
  return (
    <FormattedNumber
      value={value}
      type="percentage"
      percentageDecimals={decimals}
      colorize={colorize}
      showSign={showSign}
      className={className}
    />
  );
}

/**
 * Convenience component for token amount display
 */
export function TokenValue({
  value,
  asset,
  showAsset = true,
  colorize = false,
  className,
}: {
  value: number | string | null | undefined;
  asset: string;
  showAsset?: boolean;
  colorize?: boolean;
  className?: string;
}) {
  return (
    <FormattedNumber
      value={value}
      asset={asset}
      type="token"
      showAsset={showAsset}
      colorize={colorize}
      className={className}
    />
  );
}

export default FormattedNumber;
