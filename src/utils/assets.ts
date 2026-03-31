/**
 * Asset Management Utilities
 * Re-exports from consolidated src/types/asset.ts for backward compatibility
 */

import { getAssetConfig, INVESTOR_DISPLAY_DECIMALS } from "@/types/asset";
import { toNum } from "@/utils/numeric";
import { formatPercentage } from "./formatters";

// Re-export formatPercentage for backward compatibility
export { formatPercentage };

// Re-export all asset-related types and functions from the central location
export {
  type AssetConfig,
  type AssetSummary,
  ASSET_CONFIGS as ASSETS,
  ASSET_PRECISION,
  INVESTOR_DISPLAY_DECIMALS,
  DEFAULT_ASSET_LOGO,
  getAssetConfig,
  getAssetLogo,
  getAssetName,
  getAssetDecimals,
  getAssetPrecision,
  getAssetStep,
  formatAssetPrecision,
  getSupportedAssets,
} from "@/types/asset";

/**
 * Format an amount with the asset symbol
 * e.g. formatAssetAmount(1500.5, 'USDT') => "1,500.50 USDT"
 * Accepts string or number for compatibility with NUMERIC DB fields
 * @param maxDecimals - Optional override for maximum decimal places (e.g. 3 for investor views)
 */
export function formatAssetAmount(
  amount: string | number,
  symbol: string,
  maxDecimals?: number
): string {
  const numAmount = toNum(amount);
  const safeSymbol = symbol || "ASSET";
  const config = getAssetConfig(safeSymbol);
  const decimals = config?.decimals || 8;

  const normalized = safeSymbol.toUpperCase();
  let displayDecimals: number;

  if (maxDecimals !== undefined) {
    displayDecimals = maxDecimals;
  } else {
    // Full precision for admin views
    switch (normalized) {
      case "BTC":
      case "ETH":
        displayDecimals = 8;
        break;
      case "SOL":
      case "XRP":
        displayDecimals = 6;
        break;
      case "XAUT":
        displayDecimals = 4;
        break;
      case "USDT":
      case "USDC":
      case "EURC":
        displayDecimals = 2;
        break;
      default:
        displayDecimals = decimals;
    }
  }

  const formattedValue = numAmount.toLocaleString("en-US", {
    minimumFractionDigits: maxDecimals !== undefined ? maxDecimals : 2,
    maximumFractionDigits: displayDecimals,
  });

  return `${formattedValue} ${normalized}`;
}

/**
 * Format a signed amount with +/- prefix
 * e.g. formatSignedAssetAmount(-1500.5, 'USDT') => "-1,500.50 USDT"
 * e.g. formatSignedAssetAmount(1500.5, 'USDT') => "+1,500.50 USDT"
 * Accepts string or number for compatibility with NUMERIC DB fields
 */
export function formatSignedAssetAmount(
  amount: string | number,
  symbol: string,
  maxDecimals?: number
): string {
  const numAmount = toNum(amount);
  const formatted = formatAssetAmount(Math.abs(numAmount), symbol, maxDecimals);
  if (numAmount < 0) return `-${formatted}`;
  if (numAmount > 0) return `+${formatted}`;
  return formatted;
}
/**
 * Format amount for admin-facing views (Full precision).
 */
export function formatAdminAmount(amount: string | number, symbol: string): string {
  const config = getAssetConfig(symbol);
  return formatAssetAmount(amount, symbol, config.decimals);
}

/**
 * Format signed amount for admin-facing views (Full precision).
 */
export function formatSignedAdminAmount(amount: string | number, symbol: string): string {
  const config = getAssetConfig(symbol);
  return formatSignedAssetAmount(amount, symbol, config.decimals);
}

/**
 * Format a number for admin display (full precision) WITHOUT the asset symbol.
 */
export function formatAdminNumber(amount: string | number, symbol: string): string {
  const numAmount = toNum(amount);
  const config = getAssetConfig(symbol);
  const precision = config.decimals;
  return numAmount.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

/**
 * Format amount for investor/IB-facing views (3 decimal places by default, or asset-specific precision).
...
 * Admin portal should continue using formatAssetAmount() for full precision.
 */
export function formatInvestorAmount(amount: string | number, symbol: string): string {
  const config = getAssetConfig(symbol);
  // Respect asset-specific display precision (e.g. 8 for BTC) unless specifically overridden
  return formatAssetAmount(amount, symbol, config.displayDecimals ?? INVESTOR_DISPLAY_DECIMALS);
}

/**
 * Format signed amount for investor/IB-facing views.
 */
export function formatSignedInvestorAmount(amount: string | number, symbol: string): string {
  const config = getAssetConfig(symbol);
  return formatSignedAssetAmount(amount, symbol, config.displayDecimals ?? INVESTOR_DISPLAY_DECIMALS);
}

/**
 * Format a number for investor display (exactly 3 decimal places) WITHOUT the asset symbol.
 * Use when the asset symbol is rendered separately with different styling.
 * Admin portal should NOT use this - they see full precision.
 */
export function formatInvestorNumber(amount: string | number): string {
  const numAmount = toNum(amount);
  return numAmount.toLocaleString("en-US", {
    minimumFractionDigits: INVESTOR_DISPLAY_DECIMALS,
    maximumFractionDigits: INVESTOR_DISPLAY_DECIMALS,
  });
}
