/**
 * Yield AUM Service
 * Central authority for AUM retrieval and reconciliation in yield flows.
 * Leverages enhanced backend RPCs for historical consistency.
 */

import { rpc } from "@/lib/rpc/index";
import { logError } from "@/lib/logger";

export type AumPurpose = "reporting" | "transaction";

export interface AumAsOfResult {
  fundId: string;
  fundCode: string;
  asOfDate: string;
  purpose: AumPurpose;
  aumValue: number;
  aumSource: "fund_daily_aum" | "no_data";
  aumRecordId: string | null;
}

export interface AumReconciliationResult {
  success: boolean;
  error?: string;
  fund_id: string;
  fund_asset: string;
  as_of_date: string;
  aum_date: string | null;
  recorded_aum: number;
  positions_sum: number;
  discrepancy: number;
  discrepancy_pct: number;
  tolerance_pct: number;
  has_warning: boolean;
  message: string;
}

export const yieldAumService = {
  /**
   * Fetches the authoritative AUM for a fund as of a specific date.
   * Unlike previous implementations, this does NOT fall back to current AUM automatically
   * in the service layer; that decision is left to the UI with explicit warnings.
   */
  async getFundAumAsOf(
    fundId: string,
    asOfDate: string,
    purpose: AumPurpose = "reporting"
  ): Promise<AumAsOfResult | null> {
    try {
      const { data, error } = await rpc.call("get_fund_aum_as_of", {
        p_fund_id: fundId,
        p_as_of_date: asOfDate,
        p_purpose: purpose,
      });

      if (error) throw error;

      const row = data?.[0];
      if (!row || row.aum_source === "no_data") return null;

      return {
        fundId: row.fund_id,
        fundCode: row.fund_code,
        asOfDate: row.as_of_date,
        purpose: row.purpose as AumPurpose,
        aumValue: Number(row.aum_value || 0),
        aumSource: row.aum_source as "fund_daily_aum",
        aumRecordId: null, // Legacy field, safely returning null
      };
    } catch (err) {
      logError("yieldAumService.getFundAumAsOf", err, { fundId, asOfDate, purpose });
      throw err;
    }
  },

  /**
   * Performs AUM reconciliation for a specific date (historical or current).
   */
  async checkReconciliation(
    fundId: string,
    asOfDate: string,
    tolerancePct: number = 0.01
  ): Promise<AumReconciliationResult> {
    try {
      const { data, error } = await rpc.call("check_aum_reconciliation", {
        p_fund_id: fundId,
        p_as_of_date: asOfDate,
        p_tolerance_pct: tolerancePct,
      });

      if (error) throw error;
      return data as unknown as AumReconciliationResult;
    } catch (err) {
      logError("yieldAumService.checkReconciliation", err, { fundId, asOfDate });
      throw err;
    }
  },
};
