/**
 * AUM Formatting Utilities
 * Consistent decimal formatting for different asset types
 */

export interface FormatOptions {
  showSymbol?: boolean;
  compact?: boolean;
}

/**
 * Get decimal places for an asset type
 */
export function getAssetDecimals(asset: string): { min: number; max: number } {
  const assetUpper = asset.toUpperCase();
  
  switch (assetUpper) {
    case "BTC":
      return { min: 2, max: 6 };
    case "ETH":
      return { min: 2, max: 4 };
    case "SOL":
      return { min: 2, max: 4 };
    case "XRP":
      return { min: 2, max: 4 };
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
export function formatAUM(value: number, asset: string, options: FormatOptions = {}): string {
  if (!value && value !== 0) return "0";
  
  const { min, max } = getAssetDecimals(asset);
  
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
  
  const assetUpper = asset.toUpperCase();
  
  // Compact decimals for header display
  let decimals: { min: number; max: number };
  switch (assetUpper) {
    case "BTC":
      decimals = { min: 2, max: 4 };
      break;
    case "ETH":
    case "SOL":
      decimals = { min: 2, max: 2 };
      break;
    default:
      decimals = { min: 0, max: 0 };
  }
  
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals.min,
    maximumFractionDigits: decimals.max,
  }).format(value);
}

/**
 * Format percentage with consistent decimals
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value) + "%";
}
