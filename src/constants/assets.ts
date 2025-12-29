/**
 * Asset Constants
 * Centralized asset-related constants and utilities
 */

/**
 * Asset precision mapping (decimal places)
 * Based on database asset configurations
 */
export const ASSET_PRECISION: Record<string, number> = {
  BTC: 8,
  ETH: 8,
  SOL: 8,
  XRP: 6,
  USDT: 6,
  USDC: 6,
  EURC: 6,
  XAUT: 6,
};

/**
 * Get the step value for input fields based on asset precision
 * @param symbol - Asset symbol (e.g., "BTC", "USDT")
 * @returns Step string for HTML input (e.g., "0.00000001" for BTC)
 */
export const getAssetStep = (symbol: string): string => {
  const precision = ASSET_PRECISION[symbol] || 8;
  return `0.${"0".repeat(precision - 1)}1`;
};

/**
 * Get the precision for an asset
 * @param symbol - Asset symbol
 * @returns Number of decimal places
 */
export const getAssetPrecision = (symbol: string): number => {
  return ASSET_PRECISION[symbol] || 8;
};

/**
 * Format a number with the correct precision for an asset
 * @param value - Numeric value to format
 * @param symbol - Asset symbol
 * @returns Formatted string with correct decimal places
 */
export const formatAssetValue = (value: number, symbol: string): string => {
  const precision = getAssetPrecision(symbol);
  return value.toFixed(precision);
};
