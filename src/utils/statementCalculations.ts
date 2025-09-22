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
      .select('*')
      .eq('id', investor_id)
      .single();

    if (investorError || !investor) {
      console.error('Investor not found:', investorError);
      return null;
    }

    // Calculate period dates
    const period_start = new Date(period_year, period_month - 1, 1);
    const period_end = new Date(period_year, period_month, 0, 23, 59, 59);
    const prev_period_end = new Date(period_year, period_month - 1, 0, 23, 59, 59);

    // Fetch all transactions for the period
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*, asset:assets(*)')
      .eq('investor_id', investor_id)
      .gte('created_at', period_start.toISOString())
      .lte('created_at', period_end.toISOString())
      .order('created_at', { ascending: true });

    if (txError) {
      console.error('Error fetching transactions:', txError);
      return null;
    }

    // Fetch beginning balances (end of previous month)
    const { data: beginBalances, error: balError } = await supabase
      .from('portfolio_history')
      .select('*, asset:assets(*)')
      .eq('user_id', investor_id)
      .lte('date', prev_period_end.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (balError) {
      console.error('Error fetching balances:', balError);
    }

    // Group transactions by asset
    const assetMap = new Map<string, AssetStatement>();
    const assets = await fetchAssets();

    // Initialize asset statements with beginning balances
    if (beginBalances) {
      const latestBalances = new Map();
      beginBalances.forEach(bal => {
        if (!latestBalances.has(bal.asset_id) || 
            new Date(bal.date) > new Date(latestBalances.get(bal.asset_id).date)) {
          latestBalances.set(bal.asset_id, bal);
        }
      });

      latestBalances.forEach((bal, asset_id) => {
        const asset = assets.find(a => a.id === asset_id);
        if (asset) {
          assetMap.set(asset.symbol, {
            asset_id: asset.id,
            asset_code: asset.symbol,
            asset_name: asset.name,
            begin_balance: bal.balance || 0,
            deposits: 0,
            withdrawals: 0,
            interest: 0,
            fees: 0,
            end_balance: bal.balance || 0,
            transactions: []
          });
        }
      });
    }

    // Process transactions
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalInterest = 0;
    let totalFees = 0;

    if (transactions) {
      transactions.forEach(tx => {
        const assetCode = tx.asset_code;
        if (!assetMap.has(assetCode)) {
          const asset = assets.find(a => a.symbol === assetCode);
          if (asset) {
            assetMap.set(assetCode, {
              asset_id: asset.id,
              asset_code: assetCode,
              asset_name: asset.name,
              begin_balance: 0,
              deposits: 0,
              withdrawals: 0,
              interest: 0,
              fees: 0,
              end_balance: 0,
              transactions: []
            });
          }
        }

        const assetStatement = assetMap.get(assetCode);
        if (assetStatement) {
          const txRecord: Transaction = {
            id: tx.id,
            date: tx.created_at,
            type: tx.type as any,
            amount: tx.amount,
            description: getTransactionDescription(tx.type, tx.amount),
            running_balance: 0
          };

          assetStatement.transactions.push(txRecord);

          switch (tx.type) {
            case 'DEPOSIT':
              assetStatement.deposits += tx.amount;
              assetStatement.end_balance += tx.amount;
              totalDeposits += tx.amount;
              break;
            case 'WITHDRAWAL':
              assetStatement.withdrawals += tx.amount;
              assetStatement.end_balance -= tx.amount;
              totalWithdrawals += tx.amount;
              break;
            case 'INTEREST':
              assetStatement.interest += tx.amount;
              assetStatement.end_balance += tx.amount;
              totalInterest += tx.amount;
              break;
            case 'FEE':
              assetStatement.fees += tx.amount;
              assetStatement.end_balance -= tx.amount;
              totalFees += tx.amount;
              break;
          }
        }
      });
    }

    // Calculate running balances
    assetMap.forEach(asset => {
      let runningBalance = asset.begin_balance;
      asset.transactions.forEach(tx => {
        if (tx.type === 'deposit' || tx.type === 'interest') {
          runningBalance += tx.amount;
        } else {
          runningBalance -= tx.amount;
        }
        tx.running_balance = runningBalance;
      });
    });

    // Calculate summary
    const assetStatements = Array.from(assetMap.values());
    const totalBeginBalance = assetStatements.reduce((sum, a) => sum + a.begin_balance, 0);
    const totalEndBalance = assetStatements.reduce((sum, a) => sum + a.end_balance, 0);
    const netIncome = totalInterest - totalFees;
    const avgBalance = (totalBeginBalance + totalEndBalance) / 2;

    // Calculate returns (simplified)
    const mtdReturn = avgBalance > 0 ? (netIncome / avgBalance) * 100 : 0;
    
    // TODO: Calculate QTD, YTD, ITD returns based on historical data
    const qtdReturn = mtdReturn; // Placeholder
    const ytdReturn = mtdReturn; // Placeholder
    const itdReturn = mtdReturn; // Placeholder

    return {
      investor_id,
      investor_name: `${investor.first_name || ''} ${investor.last_name || ''}`.trim(),
      investor_email: investor.email,
      period_year,
      period_month,
      period_start,
      period_end,
      assets: assetStatements,
      summary: {
        begin_balance: totalBeginBalance,
        additions: totalDeposits,
        redemptions: totalWithdrawals,
        net_income: netIncome,
        fees: totalFees,
        end_balance: totalEndBalance,
        rate_of_return_mtd: mtdReturn,
        rate_of_return_qtd: qtdReturn,
        rate_of_return_ytd: ytdReturn,
        rate_of_return_itd: itdReturn
      }
    };
  } catch (error) {
    console.error('Error computing statement:', error);
    return null;
  }
}

async function fetchAssets() {
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('is_active', true);
  return assets || [];
}

function getTransactionDescription(kind: string, amount: number): string {
  switch (kind) {
    case 'deposit':
      return `Deposit received`;
    case 'withdrawal':
      return `Withdrawal processed`;
    case 'interest':
      return `Interest earned`;
    case 'fee':
      return `Management fee`;
    default:
      return kind;
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
