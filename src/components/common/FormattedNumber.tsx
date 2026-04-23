/**
 * FormattedNumber - Standardized number display component
 *
 * A wrapper for displaying formatted numbers consistently.
 * Maps to centralized formatters based on type.
 */

import { cn } from "@/lib/utils";
import { parseFinancial } from "@/utils/financial";
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

  // Parse to Decimal for precision
  const dec = parseFinancial(value);

  if (dec.isNaN()) {
    return <span className={cn("text-muted-foreground", className)}>{placeholder}</span>;
  }

  // Determine text color based on sign
  const getColorClass = () => {
    if (!colorize) return "";
    if (dec.gt(0)) return "text-emerald-400";
    if (dec.isNegative()) return "text-rose-400";
    return "";
  };

  // For display-only formatters (aum, token, percentage), native number is acceptable
  const numValue = dec.toNumber();

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
      default: {
        // Basic number formatting with thousand separators — use Decimal for precision
        const dec = parseFinancial(value);
        const fixed = dec.abs().toFixed(8);
        const [whole, fraction = ""] = fixed.split(".");
        const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const trimmedFraction = fraction.replace(/0+$/, "");
        const formatted = trimmedFraction ? `${formattedWhole}.${trimmedFraction}` : formattedWhole;

        const sign = showSign && colorize && dec.gt(0) ? "+" : "";
        const negSign = dec.isNegative() ? "-" : "";
        const suffix = showAsset && asset ? ` ${asset}` : "";

        return `${negSign}${sign}${formatted}${suffix}`;
      }
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
