import { supabase } from '@/integrations/supabase/client';

export interface AssetKPI {
  assetCode: string;
  currentBalance: number;
  principal: number;
  metrics: {
    mtd: number;
    qtd: number;
    ytd: number;
    itd: number;
    mtdPercentage: number;
    qtdPercentage: number;
    ytdPercentage: number;
    itdPercentage: number;
  };
}

export const calculateTotalAUM = async () => {
  try {
    const { data } = await supabase.rpc('get_total_aum');
    return data?.[0]?.total_aum || 0;
  } catch (error) {
    console.error('Error calculating total AUM:', error);
    return 0;
  }
};

export const calculateDailyInterest = async () => {
  try {
    const { data } = await supabase.rpc('get_24h_interest');
    return data?.[0]?.interest || 0;
  } catch (error) {
    console.error('Error calculating daily interest:', error);
    return 0;
  }
};

export const calculateInvestorCount = async () => {
  try {
    const { data } = await supabase.rpc('get_investor_count');
    return data?.[0]?.count || 0;
  } catch (error) {
    console.error('Error calculating investor count:', error);
    return 0;
  }
};

export const formatAssetValue = (value: number, assetCode?: string) => {
  if (assetCode === 'USDC' || assetCode === 'USDT' || assetCode === 'EURC') {
    return value.toFixed(2);
  }
  return value.toFixed(6);
};

export const calculateAllKPIs = async (userId: string): Promise<AssetKPI[]> => {
  try {
    // For now, return mock data that matches the expected structure
    // In a real implementation, this would calculate actual KPIs from positions data
    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId);

    if (!positions || positions.length === 0) {
      return [];
    }

    // Group positions by asset and calculate KPIs
    const assetMap = new Map<string, AssetKPI>();
    
    positions.forEach(position => {
      const assetCode = position.asset_code;
      const balance = position.current_balance || 0;
      const principal = position.principal || balance;
      
      if (!assetMap.has(assetCode)) {
        assetMap.set(assetCode, {
          assetCode,
          currentBalance: balance,
          principal: principal,
          metrics: {
            mtd: 0,
            qtd: 0,
            ytd: 0,
            itd: 0,
            mtdPercentage: 0,
            qtdPercentage: 0,
            ytdPercentage: 0,
            itdPercentage: 0,
          }
        });
      } else {
        const existing = assetMap.get(assetCode)!;
        existing.currentBalance += balance;
        existing.principal += principal;
      }
    });

    return Array.from(assetMap.values());
  } catch (error) {
    console.error('Error calculating KPIs:', error);
    return [];
  }
};