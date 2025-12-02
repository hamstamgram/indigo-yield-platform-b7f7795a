/**
 * Asset Formatting Utilities
 *
 * CRITICAL RULE: All assets MUST be displayed in their native currency.
 * NEVER convert to USD or aggregate across different asset types.
 */

/**
 * Format an asset amount with its symbol in native currency
 *
 * @example
 * formatAssetWithSymbol(1.5, 'BTC') → "1.50000000 BTC"
 * formatAssetWithSymbol(50000, 'USDC') → "50,000.00 USDC"
 */
export const formatAssetWithSymbol = (amount: number, symbol: string): string => {
  const decimals = getDecimalsForAsset(symbol);

  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${symbol}`;
};

/**
 * Get the standard number of decimal places for an asset
 */
export const getDecimalsForAsset = (symbol: string): number => {
  const decimals: Record<string, number> = {
    BTC: 8,
    ETH: 8,
    SOL: 6,
    USDC: 2,
    USDT: 2,
    EURC: 2,
  };

  return decimals[symbol] || 4;
};

/**
 * Format an asset amount without symbol (just the number)
 */
export const formatAssetAmount = (amount: number, symbol: string): string => {
  const decimals = getDecimalsForAsset(symbol);

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Get display name for asset
 */
export const getAssetDisplayName = (symbol: string): string => {
  const names: Record<string, string> = {
    BTC: "Bitcoin",
    ETH: "Ethereum",
    SOL: "Solana",
    USDC: "Tokenized Gold",
    USDT: "Stablecoin Fund",
    EURC: "Euro Coin",
  };

  return names[symbol] || symbol;
};

/**
 * Asset configuration interface
 */
export interface AssetConfig {
  symbol: string;
  name: string;
  decimals: number;
}

/**
 * Get full configuration for an asset
 */
export const getAssetConfig = (symbol: string): AssetConfig => {
  return {
    symbol,
    name: getAssetDisplayName(symbol),
    decimals: getDecimalsForAsset(symbol),
  };
};
