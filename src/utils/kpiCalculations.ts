import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, startOfQuarter, startOfYear, endOfDay, format } from 'date-fns';

export interface KPIMetrics {
  mtd: number; // Month to Date
  qtd: number; // Quarter to Date
  ytd: number; // Year to Date
  itd: number; // Inception to Date
  mtdPercentage: number;
  qtdPercentage: number;
  ytdPercentage: number;
  itdPercentage: number;
}

export interface AssetKPI {
  assetCode: string;
  currentBalance: number;
  principal: number;
  totalEarned: number;
  metrics: KPIMetrics;
}

/**
 * Calculate KPI metrics for a specific asset and investor
 */
export async function calculateAssetKPIs(
  investorId: string,
  assetCode: string
): Promise<AssetKPI | null> {
  try {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const quarterStart = startOfQuarter(now);
    const yearStart = startOfYear(now);

    // Get current position
    const { data: position, error: positionError } = await supabase
      .from('positions')
      .select('*')
      .eq('investor_id', investorId)
      .eq('asset_code', assetCode as any)
      .single();

    if (positionError || !position) {
      console.error('Error fetching position:', positionError);
      return null;
    }

    // Get transactions for different periods
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('investor_id', investorId)
      .eq('asset_code', assetCode as any)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: true });

    if (txError) {
      console.error('Error fetching transactions:', txError);
      return null;
    }

    // Calculate metrics
    const metrics = calculateMetrics(transactions || [], monthStart, quarterStart, yearStart);

    return {
      assetCode,
      currentBalance: Number(position.current_balance || 0),
      principal: Number(position.principal || 0),
      totalEarned: Number(position.total_earned || 0),
      metrics
    };
  } catch (error) {
    console.error('Error calculating KPIs:', error);
    return null;
  }
}

/**
 * Calculate all KPIs for an investor across all assets
 */
export async function calculateAllKPIs(investorId: string): Promise<AssetKPI[]> {
  try {
    // Get all positions for the investor
    const { data: positions, error } = await supabase
      .from('positions')
      .select('asset_code')
      .eq('investor_id', investorId);

    if (error) {
      console.error('Error fetching positions:', error);
      return [];
    }

    // Calculate KPIs for each asset
    const kpiPromises = positions.map(pos => 
      calculateAssetKPIs(investorId, pos.asset_code)
    );

    const results = await Promise.all(kpiPromises);
    return results.filter(r => r !== null) as AssetKPI[];
  } catch (error) {
    console.error('Error calculating all KPIs:', error);
    return [];
  }
}

/**
 * Calculate period metrics from transactions
 */
function calculateMetrics(
  transactions: any[],
  monthStart: Date,
  quarterStart: Date,
  yearStart: Date
): KPIMetrics {
  let mtdEarnings = 0;
  let qtdEarnings = 0;
  let ytdEarnings = 0;
  let itdEarnings = 0;
  
  let mtdPrincipal = 0;
  let qtdPrincipal = 0;
  let ytdPrincipal = 0;
  let itdPrincipal = 0;

  transactions.forEach(tx => {
    const txDate = new Date(tx.created_at);
    const amount = Number(tx.amount);

    // Calculate principal (deposits - withdrawals)
    if (tx.type === 'DEPOSIT') {
      itdPrincipal += amount;
      if (txDate >= yearStart) ytdPrincipal += amount;
      if (txDate >= quarterStart) qtdPrincipal += amount;
      if (txDate >= monthStart) mtdPrincipal += amount;
    } else if (tx.type === 'WITHDRAWAL') {
      itdPrincipal -= amount;
      if (txDate >= yearStart) ytdPrincipal -= amount;
      if (txDate >= quarterStart) qtdPrincipal -= amount;
      if (txDate >= monthStart) mtdPrincipal -= amount;
    } else if (tx.type === 'INTEREST') {
      // Calculate earnings
      itdEarnings += amount;
      if (txDate >= yearStart) ytdEarnings += amount;
      if (txDate >= quarterStart) qtdEarnings += amount;
      if (txDate >= monthStart) mtdEarnings += amount;
    }
  });

  // Calculate percentages (earnings / average principal)
  const calculatePercentage = (earnings: number, principal: number) => {
    if (principal <= 0) return 0;
    return (earnings / principal) * 100;
  };

  return {
    mtd: mtdEarnings,
    qtd: qtdEarnings,
    ytd: ytdEarnings,
    itd: itdEarnings,
    mtdPercentage: calculatePercentage(mtdEarnings, mtdPrincipal || itdPrincipal),
    qtdPercentage: calculatePercentage(qtdEarnings, qtdPrincipal || itdPrincipal),
    ytdPercentage: calculatePercentage(ytdEarnings, ytdPrincipal || itdPrincipal),
    itdPercentage: calculatePercentage(itdEarnings, itdPrincipal)
  };
}

/**
 * Format currency value with proper decimals based on asset
 */
export function formatAssetValue(value: number, assetCode: string): string {
  const decimals = getAssetDecimals(assetCode);
  return value.toFixed(decimals);
}

function getAssetDecimals(assetCode: string): number {
  switch (assetCode) {
    case 'BTC': return 8;
    case 'ETH': return 18;
    case 'SOL': return 9;
    case 'USDT':
    case 'USDC':
    case 'EURC': return 6;
    default: return 8;
  }
}
