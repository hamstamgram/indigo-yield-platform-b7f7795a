
import { supabase } from "@/integrations/supabase/client";
import { Asset } from "@/types/investorTypes";
import { InvestorFormValues } from "@/components/admin/investors/InvestorForm";

export interface PortfolioEntry {
  user_id: string;
  asset_id: number;
  balance: number;
}

export const createPortfolioEntries = async (
  userId: string, 
  formValues: InvestorFormValues, 
  assets: Asset[]
): Promise<boolean> => {
  const portfolioEntries: PortfolioEntry[] = [];

  // Add BTC balance if provided
  if (formValues.btc_balance && parseFloat(formValues.btc_balance) > 0) {
    const btcAsset = assets.find(a => a.symbol.toLowerCase() === 'btc');
    if (btcAsset) {
      portfolioEntries.push({
        user_id: userId,
        asset_id: btcAsset.id,
        balance: parseFloat(formValues.btc_balance),
      });
    }
  }

  // Add ETH balance if provided
  if (formValues.eth_balance && parseFloat(formValues.eth_balance) > 0) {
    const ethAsset = assets.find(a => a.symbol.toLowerCase() === 'eth');
    if (ethAsset) {
      portfolioEntries.push({
        user_id: userId,
        asset_id: ethAsset.id,
        balance: parseFloat(formValues.eth_balance),
      });
    }
  }

  // Add SOL balance if provided
  if (formValues.sol_balance && parseFloat(formValues.sol_balance) > 0) {
    const solAsset = assets.find(a => a.symbol.toLowerCase() === 'sol');
    if (solAsset) {
      portfolioEntries.push({
        user_id: userId,
        asset_id: solAsset.id,
        balance: parseFloat(formValues.sol_balance),
      });
    }
  }

  // Add USDC balance if provided
  if (formValues.usdc_balance && parseFloat(formValues.usdc_balance) > 0) {
    const usdcAsset = assets.find(a => a.symbol.toLowerCase() === 'usdc');
    if (usdcAsset) {
      portfolioEntries.push({
        user_id: userId,
        asset_id: usdcAsset.id,
        balance: parseFloat(formValues.usdc_balance),
      });
    }
  }

  // Insert portfolio entries if any
  if (portfolioEntries.length > 0) {
    const { error } = await supabase
      .from('portfolios')
      .insert(portfolioEntries);

    if (error) {
      console.error("Portfolio insert error:", error);
      return false;
    }
  }

  return true;
};
