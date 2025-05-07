
import { supabase } from "@/integrations/supabase/client";
import { createAssetSummariesFromDb, createDefaultAssetSummaries } from "@/utils/assetUtils";

/**
 * Fetches asset data from the database or creates defaults if none exist
 * @param cryptoPrices Current cryptocurrency prices
 * @returns Array of asset summaries with balances and prices
 */
export const fetchAssetSummaries = async (cryptoPrices: Record<string, any>) => {
  const { data: assets, error } = await supabase
    .from('assets')
    .select('*')
    .order('id');
    
  if (error) {
    console.error("Error fetching assets:", error);
    return [];
  }
    
  if (!assets || assets.length === 0) {
    console.log("No assets found, using default assets");
    return createDefaultAssetSummaries(cryptoPrices);
  }
  
  // Ensure uniqueness by normalizing symbols to uppercase
  const uniqueAssets = new Map();
  assets.forEach(asset => {
    const normalizedSymbol = asset.symbol.toUpperCase();
    if (!uniqueAssets.has(normalizedSymbol)) {
      uniqueAssets.set(normalizedSymbol, {
        ...asset,
        symbol: normalizedSymbol
      });
    }
  });
  
  return createAssetSummariesFromDb(Array.from(uniqueAssets.values()), cryptoPrices);
};
