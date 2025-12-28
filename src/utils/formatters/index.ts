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
export function formatAssetWithSymbol(amount: number, symbol: string): string {
  const { getAssetConfig } = require("@/types/asset");
  const config = getAssetConfig(symbol);
  const decimals = config.decimals;

  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${config.symbol}`;
}

/**
 * Format an asset amount without symbol (just the number)
 */
export function formatAssetAmount(amount: number, symbol: string): string {
  const { getAssetDecimals } = require("@/types/asset");
  const decimals = getAssetDecimals(symbol);

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format token balance with flexible options
 */
export function formatTokenBalance(
  balance: number,
  symbol: string,
  options?: FormatOptions
): string {
  const { getAssetConfig } = require("@/types/asset");
  const { showSymbol = true, maxDecimals } = options || {};
  const config = getAssetConfig(symbol);
  const decimals = maxDecimals ?? Math.min(config.decimals, 6);

  const formatted = balance.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return showSymbol ? `${formatted} ${config.symbol}` : formatted;
}

/**
 * Format token amount (legacy alias for formatTokenBalance)
 */
export function formatTokenAmount(amount: number, tokenSymbol: string): string {
  const { getAssetConfig } = require("@/types/asset");
  const config = getAssetConfig(tokenSymbol);
  const decimals = Math.min(config.decimals, 6);

  return `${amount.toLocaleString("en-US", {
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
  value: number,
  asset: string,
  options: FormatOptions = {}
): string {
  if (!value && value !== 0) return "0";

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
export function formatAUMCompact(value: number, asset: string): string {
  if (!value && value !== 0) return "0";

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
  value: number,
  decimals: number = 2,
  showSign: boolean = false
): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

  const sign = showSign && value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatted}%`;
}

// ============================================================================
// Backward Compatibility Exports
// ============================================================================

// Re-import for aliased exports
import { getAssetDecimals as _getAssetDecimals, getAssetConfig as _getAssetConfig } from "@/types/asset";

// These maintain backward compatibility with existing imports
export { _getAssetDecimals as getDecimalsForAsset };
export { _getAssetConfig as getTokenConfig };
