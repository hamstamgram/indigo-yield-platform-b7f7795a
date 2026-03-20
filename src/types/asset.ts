/**
 * Consolidated Asset Types
 * Single source of truth for all asset-related types across the application.
 *
 * CRITICAL RULE: All assets MUST be displayed in their native currency.
 * NEVER convert to USD or aggregate across different asset types.
 */

// ============================================================================
// Core Asset Types
// ============================================================================

export type AssetKind = "crypto" | "token" | "stablecoin" | "synthetic" | "other";

/**
 * Database Asset entity - represents a row in the assets table
 */
export interface Asset {
  asset_id: string;
  symbol: string;
  name: string;
  kind: AssetKind;
  chain?: string;
  decimals: number;
  is_active: boolean;
  price_source: string;
  coingecko_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Simple Asset reference - for dropdowns and selectors
 */
export interface AssetRef {
  id: number;
  symbol: string;
  name: string;
}

/**
 * Asset price data from external sources
 */
export interface AssetPrice {
  asset_id: string;
  /** @precision NUMERIC - string for financial safety */
  price_usd: string | number;
  as_of: string;
  /** @precision NUMERIC - string for financial safety */
  high_24h?: string | number;
  /** @precision NUMERIC - string for financial safety */
  low_24h?: string | number;
  /** @precision NUMERIC - string for financial safety */
  volume_24h?: string | number;
  /** @precision NUMERIC - string for financial safety */
  market_cap?: string | number;
  source: string;
  created_at: string;
}

// ============================================================================
// Asset Configuration (for display purposes)
// ============================================================================

/**
 * Asset display configuration - includes visual elements
 */
export interface AssetConfig {
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  color?: string;
}

/**
 * Static asset configuration registry
 * Single source of truth for asset metadata
 */
/**
 * Asset precision mapping (decimal places) - matches database configuration
 * Used for input validation and formatting
 */
export const ASSET_PRECISION: Record<string, number> = {
  BTC: 8,
  ETH: 8,
  SOL: 9,
  SOLANA: 9,
  XRP: 6,
  RIPPLE: 6,
  USDT: 6,
  USDC: 6,
  EURC: 6,
  XAUT: 6,
};

/**
 * Display decimals for investor/IB-facing views.
 * Admin portal uses full ASSET_PRECISION; investors see this reduced precision.
 */
export const INVESTOR_DISPLAY_DECIMALS = 3;

/**
 * Static asset configuration registry
 * Single source of truth for asset metadata
 * Note: decimals here match ASSET_PRECISION for consistency
 */
export const ASSET_CONFIGS: Record<string, AssetConfig> = {
  BTC: {
    symbol: "BTC",
    name: "BTC Yield Fund",
    decimals: 8,
    logoUrl: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/btc.png",
    color: "#F7931A",
  },
  ETH: {
    symbol: "ETH",
    name: "ETH Yield Fund",
    decimals: 8,
    logoUrl: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/eth.png",
    color: "#627EEA",
  },
  SOL: {
    symbol: "SOL",
    name: "SOL Yield Fund",
    decimals: 9,
    logoUrl: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/sol.png",
    color: "#14F195",
  },
  USDT: {
    symbol: "USDT",
    name: "Stablecoin Fund",
    decimals: 6,
    logoUrl: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/usdt.png",
    color: "#26A17B",
  },
  // NOTE: USDC is not in the database asset_code enum. UI-only display config.
  // Add to DB enum via migration if USDC funds are created.
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoUrl: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/usdc.png",
    color: "#2775CA",
  },
  EURC: {
    symbol: "EURC",
    name: "EURC Yield Fund",
    decimals: 6,
    logoUrl: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/eur.png",
    color: "#0052FF",
  },
  XAUT: {
    symbol: "xAUT",
    name: "Tokenized Gold",
    decimals: 6,
    logoUrl: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/gold.png",
    color: "#FFD700",
  },
  xAUT: {
    symbol: "xAUT",
    name: "Tokenized Gold",
    decimals: 6,
    logoUrl: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/gold.png",
    color: "#FFD700",
  },
  XRP: {
    symbol: "XRP",
    name: "XRP Yield Fund",
    decimals: 6,
    logoUrl: "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/xrp.png",
    color: "#00AAE4",
  },
};

/**
 * Default logo for unknown assets
 */
export const DEFAULT_ASSET_LOGO = "https://ui-avatars.com/api/?name=Asset&background=random";

// ============================================================================
// Asset Helpers
// ============================================================================

/**
 * Get asset configuration by symbol (case-insensitive)
 */
export function getAssetConfig(symbol: string): AssetConfig {
  const normalized = symbol.toUpperCase();
  return (
    ASSET_CONFIGS[normalized] || {
      symbol: symbol.toUpperCase(),
      name: symbol,
      decimals: 4,
    }
  );
}

/**
 * Get asset logo URL
 */
export function getAssetLogo(symbol: string): string {
  const config = getAssetConfig(symbol);
  return (
    config?.logoUrl || `https://ui-avatars.com/api/?name=${symbol}&background=eff6ff&color=1e40af`
  );
}

/**
 * Get asset display name
 */
export function getAssetName(symbol: string): string {
  return getAssetConfig(symbol).name;
}

/**
 * Get decimals for an asset
 */
export function getAssetDecimals(symbol: string): number {
  return getAssetConfig(symbol).decimals;
}

/**
 * Alias for getAssetDecimals - get precision for an asset
 * @param symbol - Asset symbol
 * @returns Number of decimal places
 */
export function getAssetPrecision(symbol: string): number {
  const normalized = symbol.toUpperCase();
  return ASSET_PRECISION[normalized] ?? 8;
}

/**
 * Get the step value for input fields based on asset precision
 * @param symbol - Asset symbol (e.g., "BTC", "USDT")
 * @returns Step string for HTML input (e.g., "0.00000001" for BTC)
 */
export function getAssetStep(symbol: string): string {
  const precision = getAssetPrecision(symbol);
  return `0.${"0".repeat(precision - 1)}1`;
}

/**
 * Format a number with the correct precision for an asset (raw decimal string)
 * Use formatAssetDisplay from kpiCalculations for locale-formatted display
 * @param value - Numeric value to format
 * @param symbol - Asset symbol
 * @returns Formatted string with correct decimal places
 */
export function formatAssetPrecision(value: number, symbol: string): string {
  const precision = getAssetPrecision(symbol);
  return value.toFixed(precision);
}

/**
 * Get all supported asset configurations
 */
export function getSupportedAssets(): AssetConfig[] {
  // Return unique assets (exclude xAUT duplicate)
  const seen = new Set<string>();
  return Object.values(ASSET_CONFIGS).filter((asset) => {
    const upper = asset.symbol.toUpperCase();
    if (seen.has(upper)) return false;
    seen.add(upper);
    return true;
  });
}

// ============================================================================
// UI Component Types
// ============================================================================

/**
 * Asset summary for dashboard displays
 */
export interface AssetSummary {
  id: number;
  symbol: string;
  name: string;
  /** @precision NUMERIC - string for financial safety */
  totalBalance: string | number;
  totalUsers: number;
  /** @precision NUMERIC - string for financial safety */
  avgYield: string | number;
}

/**
 * Detailed asset summary with yield info (for investor dashboard)
 */
export interface AssetSummaryDetailed {
  symbol: string;
  name: string;
  /** @precision NUMERIC - string for financial safety */
  balance: string | number;
  /** @precision NUMERIC - string for financial safety */
  principal: string | number;
  /** @precision NUMERIC - string for financial safety */
  totalEarned: string | number;
  /** @precision NUMERIC - string for financial safety */
  currentRate: string | number;
  /** @precision NUMERIC - string for financial safety */
  dailyYield: string | number;
  /** @precision NUMERIC - string for financial safety */
  totalYield: string | number;
  /** @precision NUMERIC - string for financial safety */
  yieldPercentage: string | number;
}

/**
 * Yield source data
 */
export interface YieldSource {
  id: string;
  name: string;
  /** @precision NUMERIC - string for financial safety */
  btcYield: string | number;
  /** @precision NUMERIC - string for financial safety */
  ethYield: string | number;
  /** @precision NUMERIC - string for financial safety */
  solYield: string | number;
  /** @precision NUMERIC - string for financial safety */
  usdtYield: string | number;
  /** @precision NUMERIC - string for financial safety */
  eurcYield: string | number;
  /** @precision NUMERIC - string for financial safety */
  xautYield: string | number;
  /** @precision NUMERIC - string for financial safety */
  xrpYield: string | number;
}

// ============================================================================
// Form Types
// ============================================================================

export interface AssetFormData {
  asset_id: string;
  symbol: string;
  name: string;
  kind: AssetKind;
  chain?: string;
  decimals: number;
  is_active: boolean;
  price_source: string;
  coingecko_id?: string;
  metadata?: Record<string, any>;
}

export interface AssetPriceFormData {
  asset_id: string;
  /** @precision NUMERIC - string for financial safety */
  price_usd: string | number;
  /** @precision NUMERIC - string for financial safety */
  high_24h?: string | number;
  /** @precision NUMERIC - string for financial safety */
  low_24h?: string | number;
  /** @precision NUMERIC - string for financial safety */
  volume_24h?: string | number;
  /** @precision NUMERIC - string for financial safety */
  market_cap?: string | number;
  source: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface AssetInput {
  symbol: string;
  amount: number | string | null | undefined;
}

export interface AssetValidationResult {
  ok: boolean;
  errors: Record<string, string>;
  parsedAmounts: Record<string, number>;
}
