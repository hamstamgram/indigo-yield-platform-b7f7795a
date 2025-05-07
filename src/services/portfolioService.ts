
import { supabase } from "@/integrations/supabase/client";
import { Investor } from "@/types/investorTypes";
import { Asset } from "@/types/investorTypes";

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
    return assetData || [];
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
