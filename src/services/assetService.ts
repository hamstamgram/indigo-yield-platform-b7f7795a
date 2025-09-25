
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches real investor positions from the database
 * @returns Array of consolidated investor positions by asset
 */
export const fetchInvestorPositions = async () => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    if (!user) {
      console.log("No authenticated user found");
      return [];
    }

    // First get the investor record for this user
    const { data: investor, error: investorError } = await supabase
      .from('investors')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (investorError || !investor) {
      console.log("No investor record found for user");
      return [];
    }

    // Get investor positions with fund information
    const { data: positions, error: positionsError } = await supabase
      .from('investor_positions')
      .select(`
        current_value,
        fund_id,
        funds!inner(code, name, asset)
      `)
      .eq('investor_id', investor.id)
      .gt('current_value', 0);

    if (positionsError) {
      console.error("Error fetching investor positions:", positionsError);
      return [];
    }

    if (!positions || positions.length === 0) {
      console.log("No positions found for investor");
      return [];
    }

    // Group positions by asset (fund code)
    const assetMap = new Map();
    
    positions.forEach(position => {
      const assetSymbol = position.funds.code.toUpperCase();
      const assetName = position.funds.asset;
      
      if (assetMap.has(assetSymbol)) {
        // Add to existing position
        const existing = assetMap.get(assetSymbol);
        existing.balance += position.current_value;
      } else {
        // Create new position
        assetMap.set(assetSymbol, {
          symbol: assetSymbol,
          name: assetName,
          balance: position.current_value,
          // Keep original fund structure for compatibility
          id: position.fund_id
        });
      }
    });

    return Array.from(assetMap.values());
  } catch (error) {
    console.error("Error in fetchInvestorPositions:", error);
    return [];
  }
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use fetchInvestorPositions instead
 */
export const fetchAssetSummaries = fetchInvestorPositions;
