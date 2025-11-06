import { supabase } from '@/integrations/supabase/client';

export interface StatementData {
  investor_id: string;
  investor_name: string;
  investor_email: string;
  period_year: number;
  period_month: number;
  period_start: Date;
  period_end: Date;
  assets: AssetStatement[];
  summary: {
    begin_balance: number;
    additions: number;
    redemptions: number;
    net_income: number;
    fees: number;
    end_balance: number;
    rate_of_return_mtd: number;
    rate_of_return_qtd: number;
    rate_of_return_ytd: number;
    rate_of_return_itd: number;
  };
}

export interface AssetStatement {
  asset_id: number;
  asset_code: string;
  asset_name: string;
  begin_balance: number;
  deposits: number;
  withdrawals: number;
  interest: number;
  fees: number;
  end_balance: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal' | 'interest' | 'fee';
  amount: number;
  description: string;
  running_balance?: number;
}

export async function computeStatement(
  investor_id: string,
  period_year: number,
  period_month: number
): Promise<StatementData | null> {
  try {
    // Get investor profile
    const { data: investor, error: investorError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', investor_id)
      .maybeSingle();

    if (!investor) {
      console.error('Investor not found:', investorError);
      return null;
    }

    if (investorError || !investor) {
      console.error('Investor not found:', investorError);
      return null;
    }

    // Calculate period dates
    const period_start = new Date(period_year, period_month - 1, 1);
    const period_end = new Date(period_year, period_month, 0, 23, 59, 59);

    // For now, return a simplified statement structure
    // TODO: Implement full statement calculation when transaction schema is finalized
    return {
      investor_id,
      investor_name: `${investor.first_name || ''} ${investor.last_name || ''}`.trim(),
      investor_email: investor.email,
      period_year,
      period_month,
      period_start,
      period_end,
      assets: [],
      summary: {
        begin_balance: 0,
        additions: 0,
        redemptions: 0,
        net_income: 0,
        fees: 0,
        end_balance: 0,
        rate_of_return_mtd: 0,
        rate_of_return_qtd: 0,
        rate_of_return_ytd: 0,
        rate_of_return_itd: 0
      }
    };
  } catch (error) {
    console.error('Error computing statement:', error);
    return null;
  }
}

export function formatCurrency(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}
