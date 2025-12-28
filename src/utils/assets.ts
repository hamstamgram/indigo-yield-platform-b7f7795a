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
  DEFAULT_ASSET_LOGO,
  getAssetConfig,
  getAssetLogo,
  getAssetName,
  getAssetDecimals,
  getSupportedAssets,
} from "@/types/asset";

/**
 * Format an amount with the asset symbol
 * e.g. formatAssetAmount(1500.5, 'USDT') => "1,500.50 USDT"
 */
export function formatAssetAmount(amount: number, symbol: string): string {
  const config = getAssetConfig(symbol);
  const decimals = config?.decimals || 4;
  // For display, cap decimals at 4 for readability (except BTC which uses 8)
  const displayDecimals = symbol.toUpperCase() === "BTC" ? 8 : Math.min(decimals, 4);

  const formattedValue = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: displayDecimals,
  });

  return `${formattedValue} ${symbol.toUpperCase()}`;
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
