export interface AssetSummary {
  id: number;
  symbol: string;
  name: string;
  totalBalance: number;
  totalUsers: number;
  avgYield: number;
}

export interface YieldSource {
  id: string;
  name: string;
  btcYield: number;
  ethYield: number;
  solYield: number;
  usdtYield: number;
  eurcYield: number;
  xautYield: number;
  xrpYield: number;
}
