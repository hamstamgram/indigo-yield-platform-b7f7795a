import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

/**
 * Fee Settings Service
 * Handles platform-level fee configurations
 */
export const feeSettingsService = {
  /**
   * Fetches the global platform fee percentage from global_fee_settings table
   * @returns The platform_fee_pct as a number (e.g., 0.20 for 20%)
   */
  getGlobalPlatformFee: async (): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from("global_fee_settings")
        .select("value")
        .eq("setting_key", "platform_fee_pct")
        .maybeSingle();

      if (error) {
        throw error;
      }

      const val = data ? (data as any).value : null;
      return val != null ? Number(val) : 0.2; // Fallback to 20% if not found
    } catch (error) {
      logError("feeSettingsService.getGlobalPlatformFee", error);
      return 0.2; // Fallback to 20% on error
    }
  },
};
