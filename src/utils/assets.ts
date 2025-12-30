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
 * Format an amount with the asset symbol
 * e.g. formatAssetAmount(1500.5, 'USDT') => "1,500.50 USDT"
 */
export function formatAssetAmount(amount: number, symbol: string): string {
  const config = getAssetConfig(symbol);
  const decimals = config?.decimals || 8;
  
  // Use full precision for each asset type
  const normalized = symbol.toUpperCase();
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

  const formattedValue = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: displayDecimals,
  });

  return `${formattedValue} ${normalized}`;
}

/**
 * Format a signed amount with +/- prefix
 * e.g. formatSignedAssetAmount(-1500.5, 'USDT') => "-1,500.50 USDT"
 * e.g. formatSignedAssetAmount(1500.5, 'USDT') => "+1,500.50 USDT"
 */
export function formatSignedAssetAmount(amount: number, symbol: string): string {
  const formatted = formatAssetAmount(Math.abs(amount), symbol);
  if (amount < 0) return `-${formatted}`;
  if (amount > 0) return `+${formatted}`;
  return formatted;
}
