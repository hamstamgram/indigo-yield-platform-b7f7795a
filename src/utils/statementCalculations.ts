import { supabase } from "@/integrations/supabase/client";

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
  asset_id: number | string;
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
  type: "deposit" | "withdrawal" | "interest" | "fee";
  amount: number;
  description: string;
  running_balance?: number;
}

/**
 * Calculate Rate of Return using the correct formula:
 * net_income = ending_balance - beginning_balance - additions + redemptions
 * rate_of_return = net_income / beginning_balance (or 0 if beginning_balance is 0)
 * 
 * This properly accounts for mid-month additions/withdrawals
 */
export function calculateRateOfReturn(
  beginningBalance: number,
  endingBalance: number,
  additions: number,
  redemptions: number
): { netIncome: number; rateOfReturn: number } {
  // CORRECT formula per December 20 requirements:
  // net_income = ending_balance - beginning_balance - additions + redemptions
  const netIncome = endingBalance - beginningBalance - additions + redemptions;
  
  // If beginning balance is 0, return 0% to avoid NaN/Infinity
  if (beginningBalance <= 0) {
    return { netIncome, rateOfReturn: 0 };
  }
  
  const rateOfReturn = (netIncome / beginningBalance) * 100;
  
  return { netIncome, rateOfReturn };
}

export async function computeStatement(
  investor_id: string,
  period_year: number,
  period_month: number
): Promise<StatementData | null> {
  try {
    // Get investor profile (from PROFILES, One ID)
    const { data: investor, error: investorError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("id", investor_id)
      .maybeSingle();

    if (investorError || !investor) {
      console.error("Investor profile not found:", investorError);
      return null;
    }

    const investorName = `${investor.first_name || ""} ${investor.last_name || ""}`.trim() || investor.email;

    // Calculate period dates
    const period_start = new Date(period_year, period_month - 1, 1);
    const period_end = new Date(period_year, period_month, 0, 23, 59, 59);
    const period_start_str = period_start.toISOString().split("T")[0];
    const period_end_str = period_end.toISOString().split("T")[0];

    // Fetch all transactions for this investor up to the end of the period
    // using transactions_v2 with deterministic ordering (tx_date, id)
    const { data: transactions, error: txError } = await supabase
      .from("transactions_v2")
      .select("*")
      .eq("investor_id", investor_id)
      .lte("tx_date", period_end_str)
      .order("tx_date", { ascending: true })
      .order("id", { ascending: true }); // Deterministic tie-breaker for same-day ordering

    if (txError) {
      console.error("Error fetching transactions:", txError);
      throw txError;
    }

    // Fetch funds information for asset mapping
    const { data: funds } = await supabase.from("funds").select("id, name, asset, code");

    const fundMap = new Map(funds?.map((f) => [f.asset, f]));

    const assetsMap: Record<string, AssetStatement> = {};
    const summary = {
      begin_balance: 0,
      additions: 0,
      redemptions: 0,
      net_income: 0,
      fees: 0,
      end_balance: 0,
      rate_of_return_mtd: 0,
      rate_of_return_qtd: 0,
      rate_of_return_ytd: 0,
      rate_of_return_itd: 0,
    };

    // Process transactions
    transactions?.forEach((transaction) => {
      const tx = transaction as any;
      const assetCode = tx.asset;
      if (!assetsMap[assetCode]) {
        const fund = fundMap.get(assetCode);
        assetsMap[assetCode] = {
          asset_id: fund ? fund.id : 0,
          asset_code: assetCode,
          asset_name: fund ? fund.name : assetCode,
          begin_balance: 0,
          deposits: 0,
          withdrawals: 0,
          interest: 0,
          fees: 0,
          end_balance: 0,
          transactions: [],
        };
      }

      const assetStat = assetsMap[assetCode];
      const txDate = new Date(tx.tx_date);
      const amount = Number(tx.amount);

      // Identify if transaction is before this period (Beginning Balance)
      if (txDate < period_start) {
        if (tx.type === "WITHDRAWAL" || tx.type === "FEE") {
          assetStat.begin_balance -= amount;
        } else {
          assetStat.begin_balance += amount;
        }
      } else {
        // Transaction is within this period
        let type: Transaction["type"] = "deposit";
        if (tx.type === "DEPOSIT") {
          assetStat.deposits += amount;
          type = "deposit";
        } else if (tx.type === "WITHDRAWAL") {
          assetStat.withdrawals += amount;
          type = "withdrawal";
        } else if (tx.type === "INTEREST" || tx.type === "YIELD") {
          assetStat.interest += amount;
          type = "interest";
        } else if (tx.type === "FEE") {
          assetStat.fees += amount;
          type = "fee";
        }

        assetStat.transactions.push({
          id: tx.id,
          date: tx.tx_date,
          type,
          amount,
          description: tx.notes || tx.type,
        });
      }
    });

    // Calculate End Balances using correct formula
    Object.values(assetsMap).forEach((asset) => {
      asset.end_balance =
        asset.begin_balance + asset.deposits - asset.withdrawals + asset.interest - asset.fees;
    });

    // Calculate summary from all assets
    const assetKeys = Object.keys(assetsMap);
    if (assetKeys.length >= 1) {
      // Sum across all assets for summary
      let totalBeginBalance = 0;
      let totalAdditions = 0;
      let totalRedemptions = 0;
      let totalFees = 0;
      let totalEndBalance = 0;

      Object.values(assetsMap).forEach((asset) => {
        totalBeginBalance += asset.begin_balance;
        totalAdditions += asset.deposits;
        totalRedemptions += asset.withdrawals;
        totalFees += asset.fees;
        totalEndBalance += asset.end_balance;
      });

      summary.begin_balance = totalBeginBalance;
      summary.additions = totalAdditions;
      summary.redemptions = totalRedemptions;
      summary.fees = totalFees;
      summary.end_balance = totalEndBalance;

      // Calculate RoR using the CORRECT formula
      const { netIncome, rateOfReturn } = calculateRateOfReturn(
        totalBeginBalance,
        totalEndBalance,
        totalAdditions,
        totalRedemptions
      );
      
      summary.net_income = netIncome;
      summary.rate_of_return_mtd = rateOfReturn;
    }

    return {
      investor_id,
      investor_name: investorName,
      investor_email: investor.email,
      period_year,
      period_month,
      period_start,
      period_end,
      assets: Object.values(assetsMap),
      summary,
    };
  } catch (error) {
    console.error("Error computing statement:", error);
    return null;
  }
}

/**
 * Format amount in native tokens (not fiat currency)
 * @param amount - The token amount
 * @param asset - The asset symbol (BTC, ETH, USDT, SOL, XRP)
 * @param decimals - Number of decimal places (auto-determined by asset if not specified)
 */
export function formatTokenAmount(amount: number, asset?: string, decimals?: number): string {
  const assetDecimals = decimals ?? (asset === "BTC" ? 8 : asset === "ETH" ? 6 : 2);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: assetDecimals,
  }).format(amount);
  return asset ? `${formatted} ${asset}` : formatted;
}

/**
 * @deprecated Use formatTokenAmount instead - this platform uses native tokens, not fiat
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatPercent(value: number, decimals: number = 2): string {
  // Handle NaN/Infinity cases
  if (!Number.isFinite(value)) {
    return "0.00%";
  }
  return `${value.toFixed(decimals)}%`;
}
