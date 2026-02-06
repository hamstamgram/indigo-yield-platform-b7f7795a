/**
 * Fund AUM Event Service
 * Handles fund_aum_events table queries for AUM checkpoints
 */

import { supabase } from "@/integrations/supabase/client";
import type { FundAumEventCheckpoint } from "@/types/domains/fund";

/**
 * Get the latest AUM checkpoint for a fund
 * Used for withdrawal validation and crystallization
 */
export async function getLatestAumCheckpoint(
  fundId: string
): Promise<FundAumEventCheckpoint | null> {
  const { data, error } = await supabase
    .from("fund_aum_events")
    .select("closing_aum, post_flow_aum, event_ts")
    .eq("fund_id", fundId)
    .eq("is_voided", false)
    .order("event_ts", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as FundAumEventCheckpoint | null;
}

/**
 * Calculate opening AUM from the latest checkpoint
 * Returns post_flow_aum if available, otherwise closing_aum
 */
export async function getOpeningAum(fundId: string): Promise<{
  openingAum: number;
  hasCheckpoint: boolean;
}> {
  const checkpoint = await getLatestAumCheckpoint(fundId);
  
  if (!checkpoint) {
    return { openingAum: 0, hasCheckpoint: false };
  }

  const opening = checkpoint.post_flow_aum ?? checkpoint.closing_aum ?? 0;
  return { openingAum: opening, hasCheckpoint: !!checkpoint.event_ts };
}

// Class wrapper for consistency with other services
class FundAumEventServiceClass {
  getLatestAumCheckpoint = getLatestAumCheckpoint;
  getOpeningAum = getOpeningAum;
}

export const fundAumEventService = new FundAumEventServiceClass();
