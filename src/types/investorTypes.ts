
export interface Investor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  fee_percentage?: number;
  portfolio_summary?: {
    [key: string]: {
      balance: number;
      usd_value: number;
    }
  }
}

export interface Asset {
  id: number;
  symbol: string;
  name: string;
}
