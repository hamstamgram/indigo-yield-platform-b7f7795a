import { callRPC } from "@/lib/supabase/typedRPC";
import { profileService } from "@/services/shared/profileService";
import { logError, logWarn } from "@/lib/logger";

export type AumPurpose = "transaction" | "reporting";

export interface ExistingPreflowAum {
  aumEventId: string;
  closingAum: number;
  eventTs: string;
  createdBy: { id: string; name: string } | null;
}

export interface EnsurePreflowAumResult {
  success: boolean;
  action: "reused_existing" | "created_new";
  aumEventId: string;
  closingAum: number;
  message?: string;
}

export const preflowAumService = {
  async getFundAumAsOf(
    fundId: string,
    asOfDate: string,
    purpose: AumPurpose = "reporting"
  ): Promise<number | null> {
    const { data, error } = await callRPC("get_fund_aum_as_of", {
      p_fund_id: fundId,
      p_as_of_date: asOfDate,
      p_purpose: purpose,
    });

    if (error) {
      logError("preflowAumService.getFundAumAsOf", error);
      throw error;
    }

    // Runtime shape validation - RPC returns TABLE with exactly 1 row
    if (!data || !Array.isArray(data) || data.length === 0) {
      logWarn("preflowAumService.getFundAumAsOf", {
        fundId,
        asOfDate,
        purpose,
        reason: "unexpected empty result",
      });
      return null;
    }

    const row = data[0];

    // Validate expected shape
    if (typeof row !== "object" || row === null) {
      logError(
        "preflowAumService.getFundAumAsOf",
        new Error("Unexpected AUM data shape from backend"),
        { row }
      );
      throw new Error("Unexpected AUM data shape from backend");
    }

    // Check if historical AUM actually exists
    // RPC returns aum_source='no_data' when no historical AUM data matches
    if (row.aum_source === "no_data") {
      return null; // Signal "no snapshot" to caller
    }

    const aumValue = Number(row.aum_value ?? 0);

    // Validate numeric result
    if (!Number.isFinite(aumValue)) {
      logError("preflowAumService.getFundAumAsOf", new Error("Invalid AUM value from backend"), {
        aumValue: row.aum_value,
      });
      throw new Error("Invalid AUM value from backend");
    }

    return aumValue;
  },
};
