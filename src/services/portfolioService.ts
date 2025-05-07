
import { supabase } from "@/integrations/supabase/client";
import { Investor } from "@/types/investorTypes";
import { Asset } from "@/types/investorTypes";
import { InvestorFormValues } from "@/components/admin/investors/InvestorForm";

/**
 * Fetches all available assets from the database
 * @returns Array of assets
 */
export const fetchAssets = async (): Promise<Asset[]> => {
  try {
    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .select('id, symbol, name')
      .order('symbol');
    
    if (assetError) {
      console.error("Error fetching assets:", assetError);
      return [];
    } 
    
    console.log("Fetched assets:", assetData?.length || 0);
    
    // If no assets found, create default assets (only once)
    if (!assetData || assetData.length === 0) {
      // Normalized default assets (all uppercase symbols)
      const defaultAssets = [
        { symbol: 'BTC', name: 'Bitcoin' },
        { symbol: 'ETH', name: 'Ethereum' },
        { symbol: 'SOL', name: 'Solana' },
        { symbol: 'USDC', name: 'USD Coin' }
      ];
      
      console.log("No assets found, creating defaults...");
      try {
        const { data: insertedAssets, error: insertError } = await supabase
          .from('assets')
          .insert(defaultAssets)
          .select();
          
        if (insertError) {
          console.error("Error creating default assets:", insertError);
          // Return default assets with dummy IDs if we can't insert them
          return defaultAssets.map((asset, index) => ({ ...asset, id: index + 1 }));
        }
        
        console.log("Created default assets:", insertedAssets);
        return insertedAssets || [];
      } catch (insertErr) {
        console.error("Error creating default assets:", insertErr);
        return defaultAssets.map((asset, index) => ({ ...asset, id: index + 1 }));
      }
    }
    
    // Normalize data to ensure no duplicate symbols (uppercase all symbols)
    const normalizedAssets = assetData.map(asset => ({
      ...asset,
      symbol: asset.symbol.toUpperCase()
    }));
    
    // Remove duplicates by creating a map keyed by symbol
    const uniqueAssetsMap = new Map();
    normalizedAssets.forEach(asset => {
      uniqueAssetsMap.set(asset.symbol, asset);
    });
    
    // Convert map back to array
    return Array.from(uniqueAssetsMap.values());
  } catch (error) {
    console.error("Error fetching assets:", error);
    return [];
  }
};

/**
 * Enriches investors with their portfolio data
 * @param investors Array of investors to enrich
 * @returns Investors with portfolio data
 */
export const enrichInvestorsWithPortfolioData = async (investors: Investor[]): Promise<Investor[]> => {
  return Promise.all(investors.map(async (investor) => {
    if (!investor.id) return investor;
    
    // Try to get portfolio data
    try {
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select(`
          balance,
          asset_id,
          assets (
            symbol
          )
        `)
        .eq('user_id', investor.id);
        
      if (portfolioError) {
        console.error(`Error fetching portfolio for user ${investor.id}:`, portfolioError);
        return investor;
      }
      
      // Create portfolio summary by asset
      const portfolioSummary: { [key: string]: { balance: number, usd_value: number } } = {};
      
      if (portfolioData && portfolioData.length > 0) {
        portfolioData.forEach(item => {
          if (!item.assets) return;
          const symbol = item.assets.symbol;
          const balance = Number(item.balance);
          
          // Mock price calculation (in production, fetch real prices)
          const price = symbol === 'BTC' ? 67500 : 
                      symbol === 'ETH' ? 3200 : 
                      symbol === 'SOL' ? 148 : 
                      symbol === 'USDC' ? 1 : 0;
          
          portfolioSummary[symbol] = {
            balance,
            usd_value: balance * price
          };
        });
      }
      
      return {
        ...investor,
        portfolio_summary: portfolioSummary
      };
    } catch (error) {
      console.error(`Error enriching portfolio for ${investor.id}:`, error);
      return investor;
    }
  }));
};

/**
 * Creates portfolio entries for a new investor
 * @param userId The ID of the investor user
 * @param values Form values with initial balances
 * @param assets Available assets
 * @returns Boolean indicating success
 */
export const createPortfolioEntries = async (
  userId: string, 
  values: InvestorFormValues,
  assets: Asset[]
): Promise<boolean> => {
  try {
    console.log("Creating portfolio entries for user:", userId);
    
    // Filter assets that have balance values in the form
    const portfolioEntries = assets
      .filter(asset => {
        const balanceKey = `balance_${asset.symbol.toLowerCase()}` as keyof typeof values;
        const balance = values[balanceKey];
        return balance !== undefined && Number(balance) > 0;
      })
      .map(asset => {
        const balanceKey = `balance_${asset.symbol.toLowerCase()}` as keyof typeof values;
        const balance = values[balanceKey];
        
        return {
          user_id: userId,
          asset_id: asset.id,
          balance: Number(balance) || 0
        };
      });
    
    // If no entries, return success (nothing to insert)
    if (portfolioEntries.length === 0) {
      console.log("No portfolio entries to create");
      return true;
    }
    
    // Insert portfolio entries
    const { error } = await supabase
      .from('portfolios')
      .insert(portfolioEntries);
    
    if (error) {
      console.error("Error creating portfolio entries:", error);
      return false;
    }
    
    console.log(`Created ${portfolioEntries.length} portfolio entries`);
    return true;
    
  } catch (error) {
    console.error("Error in createPortfolioEntries:", error);
    return false;
  }
};
