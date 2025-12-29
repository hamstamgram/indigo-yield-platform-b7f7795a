/**
 * Command Palette Service
 * Handles data fetching for command palette search functionality
 */

import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("is_admin", false)
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export const commandPaletteService = {
  fetchInvestorsForSearch,
};
