/**
 * Unified Formatting Utilities
 *
 * CRITICAL RULE: All assets MUST be displayed in their native currency.
 * NEVER convert to USD or aggregate across different asset types.
 *
 * This module consolidates all formatting utilities:
 * - Asset/Token formatting (native currency display)
 * - AUM formatting (with consistent decimals)
 * - Percentage formatting
 */

// Import for internal use
import { getAssetConfig, getAssetDecimals } from "@/types/asset";

// Re-export asset config types and helpers from central location
export {
  type AssetConfig,
  getAssetConfig,
  getAssetDecimals,
  getAssetName as getAssetDisplayName,
  getSupportedAssets,
} from "@/types/asset";

// ============================================================================
// Asset/Token Formatting
// ============================================================================

export interface FormatOptions {
  showSymbol?: boolean;
  maxDecimals?: number;
  minDecimals?: number;
}

/**
 * Format an asset amount with its symbol in native currency
 *
 * @example
 * formatAssetWithSymbol(1.5, 'BTC') → "1.50000000 BTC"
 * formatAssetWithSymbol(50000, 'USDT') → "50,000.00 USDT"
 */
export function formatAssetWithSymbol(amount: number | undefined | null, symbol: string): string {
  const safeAmount = amount ?? 0;
  const config = getAssetConfig(symbol);
  const decimals = config.decimals;

  return `${safeAmount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${config.symbol}`;
}

/**
 * Format an asset amount without symbol (just the number)
 */
export function formatAssetAmount(amount: number | undefined | null, symbol: string): string {
  const safeAmount = amount ?? 0;
  const decimals = getAssetDecimals(symbol);

  return safeAmount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format token balance with flexible options
 */
export function formatTokenBalance(
  balance: number | undefined | null,
  symbol: string,
  options?: FormatOptions
): string {
  const safeBalance = balance ?? 0;
  const { showSymbol = true, maxDecimals } = options || {};
  const config = getAssetConfig(symbol);
  const decimals = maxDecimals ?? Math.min(config.decimals, 6);

  const formatted = safeBalance.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return showSymbol ? `${formatted} ${config.symbol}` : formatted;
}

/**
 * Format token amount (legacy alias for formatTokenBalance)
 */
export function formatTokenAmount(amount: number | undefined | null, tokenSymbol: string): string {
  const safeAmount = amount ?? 0;
  const config = getAssetConfig(tokenSymbol);
  const decimals = Math.min(config.decimals, 6);

  return `${safeAmount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })} ${config.symbol}`;
}

// ============================================================================
// AUM Formatting (for dashboard/header displays)
// ============================================================================

interface AUMDecimalConfig {
  min: number;
  max: number;
}

/**
 * Get decimal configuration for AUM display
 */
function getAUMDecimals(asset: string): AUMDecimalConfig {
  const normalized = asset.toUpperCase();

  switch (normalized) {
    case "BTC":
      return { min: 2, max: 6 };
    case "ETH":
    case "SOL":
    case "XRP":
    case "XAUT":
      return { min: 2, max: 4 };
    case "USDT":
    case "USDC":
    case "EURC":
      return { min: 2, max: 2 };
    default:
      return { min: 2, max: 4 };
  }
}

/**
 * Format AUM value with consistent decimals based on asset type
 */
export function formatAUM(
  value: number | undefined | null,
  asset: string,
  options: FormatOptions = {}
): string {
  // Handle null/undefined/NaN values
  if (value === null || value === undefined || isNaN(value)) return "0";

  const { min, max } = getAUMDecimals(asset);

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(value);

  if (options.showSymbol) {
    return `${formatted} ${asset}`;
  }

  return formatted;
}

/**
 * Format AUM for compact display (e.g., header cards)
 * Uses fewer decimals for readability
 */
export function formatAUMCompact(value: number | undefined | null, asset: string): string {
  // Handle null/undefined/NaN values
  if (value === null || value === undefined || isNaN(value)) return "0";

  const normalized = asset.toUpperCase();

  let decimals: AUMDecimalConfig;
  switch (normalized) {
    case "BTC":
    case "ETH":
      decimals = { min: 2, max: 8 };
      break;
    case "SOL":
    case "XRP":
      decimals = { min: 2, max: 6 };
      break;
    case "XAUT":
      decimals = { min: 2, max: 4 };
      break;
    default:
      decimals = { min: 0, max: 2 };
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals.min,
    maximumFractionDigits: decimals.max,
  }).format(value);
}

// ============================================================================
// Percentage Formatting
// ============================================================================

/**
 * Format percentage with consistent decimals
 */
export function formatPercentage(
  value: number | undefined | null,
  decimals: number = 2,
  showSign: boolean = false
): string {
  const safeValue = value ?? 0;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(safeValue));

  const sign = showSign && safeValue > 0 ? "+" : safeValue < 0 ? "-" : "";
  return `${sign}${formatted}%`;
}

// ============================================================================
// Backward Compatibility Exports
// ============================================================================

// These maintain backward compatibility with existing imports
export { getAssetDecimals as getDecimalsForAsset };
export { getAssetConfig as getTokenConfig };
