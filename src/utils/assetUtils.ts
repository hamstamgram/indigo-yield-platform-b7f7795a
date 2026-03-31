/**
 * Asset utility functions for creating default and database-driven asset summaries
 * Uses centralized asset configuration from src/types/asset.ts
 */

import { ASSET_CONFIGS, type AssetSummary } from "@/types/asset";

/**
 * Creates default asset summaries when no assets exist in the database
 * @returns Array of default asset summaries with zero balances
 */
export const createDefaultAssetSummaries = (): AssetSummary[] => {
  const defaultAssets = [
    { id: 1, symbol: "BTC", name: "BTC Yield Fund" },
    { id: 2, symbol: "ETH", name: "ETH Yield Fund" },
    { id: 3, symbol: "SOL", name: "SOL Yield Fund" },
    { id: 4, symbol: "USDT", name: "Stablecoin Fund" },
    { id: 5, symbol: "EURC", name: "EURC Yield Fund" },
    { id: 6, symbol: "xAUT", name: "Tokenized Gold" },
    { id: 7, symbol: "XRP", name: "XRP Yield Fund" },
  ];

  const uniqueAssets = new Map<string, AssetSummary>();

  defaultAssets.forEach((asset) => {
    const symbol = asset.symbol.toUpperCase();
    if (!uniqueAssets.has(symbol)) {
      uniqueAssets.set(symbol, {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        totalBalance: 0,
        totalUsers: 0,
        avgYield: 0,
      });
    }
  });

  return Array.from(uniqueAssets.values());
};

/**
 * Creates asset summaries from database assets with zeroed default state
 * Real calculations must be performed aggregately by the caller.
 * @param assets Assets from the database
 * @returns Array of asset summaries
 */
export const createAssetSummariesFromDb = (
  assets: Array<{ id: number; symbol: string; name: string }>
): AssetSummary[] => {
  const uniqueAssets = new Map<string, AssetSummary>();

  assets.forEach((asset) => {
    const symbol = asset.symbol.toUpperCase();

    if (!uniqueAssets.has(symbol)) {
      uniqueAssets.set(symbol, {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        totalBalance: 0,
        totalUsers: 0,
        avgYield: 0,
      });
    }
  });

  return Array.from(uniqueAssets.values());
};

// ============================================================================
// Reporting Assets & Icons
// ============================================================================

// CDN URLs for fund icons (jsDelivr cryptocurrency-icons)
const CRYPTO_ICON_CDN = "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color";

export const FUND_ICONS: Record<string, string> = {
  "BTC YIELD FUND": `${CRYPTO_ICON_CDN}/btc.png`,
  "ETH YIELD FUND": `${CRYPTO_ICON_CDN}/eth.png`,
  "USDC YIELD FUND": `${CRYPTO_ICON_CDN}/usdc.png`,
  "USDT YIELD FUND": `${CRYPTO_ICON_CDN}/usdt.png`,
  "SOL YIELD FUND": `${CRYPTO_ICON_CDN}/sol.png`,
  "EURC YIELD FUND": `${CRYPTO_ICON_CDN}/eur.png`,
  "XAUT YIELD FUND": `${CRYPTO_ICON_CDN}/gold.png`,
  "XRP YIELD FUND": `${CRYPTO_ICON_CDN}/xrp.png`,
  // Legacy name aliases
  "STABLECOIN FUND": `${CRYPTO_ICON_CDN}/usdt.png`,
  "TOKENIZED GOLD": `${CRYPTO_ICON_CDN}/gold.png`,
  "Tokenized Gold": `${CRYPTO_ICON_CDN}/gold.png`,
  "Stablecoin Fund": `${CRYPTO_ICON_CDN}/usdt.png`,
};

/**
 * Asset code → fund display name mapping
 */
export const FUND_NAME_BY_ASSET: Record<string, string> = {
  BTC: "BTC YIELD FUND",
  ETH: "ETH YIELD FUND",
  SOL: "SOL YIELD FUND",
  USDT: "USDT YIELD FUND",
  USDC: "USDC YIELD FUND",
  EURC: "EURC YIELD FUND",
  XAUT: "XAUT YIELD FUND",
  xAUT: "XAUT YIELD FUND",
  XRP: "XRP YIELD FUND",
};

/**
 * Get fund icon URL by asset code
 */
export function getFundIconByAsset(assetCode: string): string {
  const fundName = FUND_NAME_BY_ASSET[assetCode] || FUND_NAME_BY_ASSET[assetCode.toUpperCase()];
  if (fundName && FUND_ICONS[fundName]) {
    return FUND_ICONS[fundName];
  }
  return FUND_ICONS["BTC YIELD FUND"]; // fallback
}

export const LOGO_URL = "https://indigo-yield-platform.lovable.app/brand/logo-white.svg";

// Social link configuration
export const SOCIAL_LINKS = {
  linkedin: {
    url: "https://www.linkedin.com/company/indigofund",
    label: "LinkedIn",
    icon: "https://storage.mlcdn.com/account_image/855106/ojd93cnCVRi5L51cI3iT2FVQKwbwUdZYyjU5UBly.png",
  },
  instagram: {
    url: "https://www.instagram.com/indigofund",
    label: "Instagram",
    icon: "https://storage.mlcdn.com/account_image/855106/SkcRzdNBhSZKcJsfsRWfUUqcdl09N5aF7Oprsjhl.png",
  },
  twitter: {
    url: "https://twitter.com/indigofund",
    label: "X",
    icon: "https://storage.mlcdn.com/account_image/855106/gecQtGTjUytuBi3PJXEx9dvCYHKL0KpLipsB0FbU.png",
  },
};

/**
 * Returns color based on value string
 */
export const getValueColor = (value: string): string => {
  if (value.startsWith("-") || value.startsWith("(")) {
    return "#dc2626"; // Red
  }
  return "#16a34a"; // Green
};
