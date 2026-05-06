/**
 * Command Palette Service
 * Uses gateway RPC get_investors_for_search
 */

import { rpc } from "@/lib/rpc";

export interface InvestorSearchResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

/**
 * Fetch investors for command palette search
 */
export async function fetchInvestorsForSearch(limit = 100): Promise<InvestorSearchResult[]> {
  const { data, error } = await rpc.call("get_investors_for_search", {
    limit_val: limit,
  });

  if (error) throw error;
  return (data || []) as InvestorSearchResult[];
}

export const commandPaletteService = {
  fetchInvestorsForSearch,
};
