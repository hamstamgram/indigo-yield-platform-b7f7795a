/**
 * Asset Management Utilities
 * Re-exports from consolidated src/types/asset.ts for backward compatibility
 */

import { getAssetConfig } from "@/types/asset";

// Re-export all asset-related types and functions from the central location
export {
  type AssetConfig,
  type AssetSummary,
  ASSET_CONFIGS as ASSETS,
  ASSET_PRECISION,
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
 * Convert a value to number safely
 * Handles string (from NUMERIC DB fields) and number types
 */
function toNum(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format an amount with the asset symbol
 * e.g. formatAssetAmount(1500.5, 'USDT') => "1,500.50 USDT"
 * Accepts string or number for compatibility with NUMERIC DB fields
 */
export function formatAssetAmount(amount: string | number, symbol: string): string {
  const numAmount = toNum(amount);
  const safeSymbol = symbol || "ASSET";
  const config = getAssetConfig(safeSymbol);
  const decimals = config?.decimals || 8;

  // Use full precision for each asset type
  const normalized = safeSymbol.toUpperCase();
  let displayDecimals: number;

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

  const formattedValue = numAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
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
export function formatSignedAssetAmount(amount: string | number, symbol: string): string {
  const numAmount = toNum(amount);
  const formatted = formatAssetAmount(Math.abs(numAmount), symbol);
  if (numAmount < 0) return `-${formatted}`;
  if (numAmount > 0) return `+${formatted}`;
  return formatted;
}
