
import { supabase } from "@/integrations/supabase/client";
import { createAssetSummariesFromDb, createDefaultAssetSummaries } from "@/utils/assetUtils";

/**
 * Fetches asset data from the database or creates defaults if none exist
 * @param cryptoPrices Current cryptocurrency prices
 * @returns Array of asset summaries with balances and prices
 */
export const fetchAssetSummaries = async (cryptoPrices: Record<string, any>) => {
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .order('id');
    
  if (!assets || assets.length === 0) {
    console.log("No assets found, using default assets");
    return createDefaultAssetSummaries(cryptoPrices);
  }
  
  return createAssetSummariesFromDb(assets, cryptoPrices);
};
