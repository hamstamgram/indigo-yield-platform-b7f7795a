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
