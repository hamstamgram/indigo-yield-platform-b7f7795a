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
  async getExisting(
    fundId: string,
    eventDate: string,
    purpose: AumPurpose = "transaction"
  ): Promise<ExistingPreflowAum | null> {
    const { data, error } = await callRPC("get_existing_preflow_aum", {
      p_fund_id: fundId,
      p_event_date: eventDate,
      p_purpose: purpose,
    });

    if (error) throw error;
    const row = data?.[0];
    if (!row?.aum_event_id) return null;

    let createdBy: ExistingPreflowAum["createdBy"] = null;
    const createdById = (row as unknown as { created_by?: string | null }).created_by;
    if (createdById) {
      const profile = await profileService.getById(createdById);
      if (profile) {
        createdBy = { id: profile.id, name: profile.name };
      }
    }

    return {
      aumEventId: row.aum_event_id,
      closingAum: Number(row.closing_aum || 0),
      eventTs: row.event_ts,
      createdBy,
    };
  },

  async ensure(
    fundId: string,
    date: string,
    totalAum: number,
    adminId: string,
    purpose: AumPurpose = "transaction"
  ): Promise<EnsurePreflowAumResult> {
    const { data, error } = await callRPC("ensure_preflow_aum", {
      p_fund_id: fundId,
      p_date: date,
      p_purpose: purpose,
      p_total_aum: totalAum,
      p_admin_id: adminId,
    });

    if (error) throw error;

    // RPC returns a single JSONB object, not an array
    const result = data as {
      success?: boolean;
      action?: string;
      aum_event_id?: string;
      closing_aum?: number;
      message?: string;
    } | null;

    return {
      success: Boolean(result?.success),
      action: (result?.action as EnsurePreflowAumResult["action"]) ?? "created_new",
      aumEventId: String(result?.aum_event_id ?? ""),
      closingAum: Number(result?.closing_aum ?? totalAum),
      message: result?.message ? String(result.message) : undefined,
    };
  },

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
