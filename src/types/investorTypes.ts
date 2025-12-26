// Re-export AssetRef as Asset for backward compatibility
export { type AssetRef as Asset } from "./asset";

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
    };
  };
}
