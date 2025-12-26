/**
 * Hook for managing fund reporting month closures
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MonthClosureStatus {
  is_closed: boolean;
  closure_id?: string;
  fund_id: string;
  month_start: string;
  month_end?: string;
  closed_at?: string;
  closed_by?: string;
  notes?: string;
}

export interface CloseMonthResult {
  success: boolean;
  error?: string;
  closure_id?: string;
  month_start?: string;
  month_end?: string;
  closed_at?: string;
}

export interface ReopenMonthResult {
  success: boolean;
  error?: string;
  closure_id?: string;
  month_start?: string;
}

/**
 * Hook for checking and closing fund reporting months
 */
export function useMonthClosure() {
  const [loading, setLoading] = useState(false);
  const [closureStatus, setClosureStatus] = useState<MonthClosureStatus | null>(null);

  /**
   * Check if a month is closed for a fund
   */
  const checkMonthClosed = useCallback(async (
    fundId: string,
    monthStart: Date
  ): Promise<MonthClosureStatus | null> => {
    try {
      const monthStartStr = monthStart.toISOString().split("T")[0];
      
      const { data, error } = await (supabase.rpc as any)("get_month_closure_status", {
        p_fund_id: fundId,
        p_month_start: monthStartStr,
      });

      if (error) {
        console.error("Error checking month closure:", error);
        return null;
      }

      const status = data as MonthClosureStatus;
      setClosureStatus(status);
      return status;
    } catch (err) {
      console.error("Error checking month closure:", err);
      return null;
    }
  }, []);

  /**
   * Close a fund's reporting month
   */
  const closeReportingMonth = useCallback(async (
    fundId: string,
    monthStart: Date,
    effectiveDate: Date,
    adminId: string,
    notes?: string
  ): Promise<CloseMonthResult> => {
    setLoading(true);
    try {
      const monthStartStr = monthStart.toISOString().split("T")[0];
      const effectiveDateStr = effectiveDate.toISOString().split("T")[0];

      const { data, error } = await (supabase.rpc as any)("close_fund_reporting_month", {
        p_fund_id: fundId,
        p_month_start: monthStartStr,
        p_effective_date: effectiveDateStr,
        p_admin_id: adminId,
        p_notes: notes || null,
      });

      if (error) {
        console.error("Error closing month:", error);
        return { success: false, error: error.message };
      }

      const result = data as CloseMonthResult;
      
      if (result.success) {
        // Refresh status
        await checkMonthClosed(fundId, monthStart);
        toast.success("Month closed successfully for reporting");
      } else {
        toast.error(result.error || "Failed to close month");
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to close month";
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [checkMonthClosed]);

  /**
   * Reopen a closed fund's reporting month (superadmin only)
   */
  const reopenReportingMonth = useCallback(async (
    fundId: string,
    monthStart: Date,
    adminId: string,
    reason?: string
  ): Promise<ReopenMonthResult> => {
    setLoading(true);
    try {
      const monthStartStr = monthStart.toISOString().split("T")[0];

      const { data, error } = await (supabase.rpc as any)("reopen_fund_reporting_month", {
        p_fund_id: fundId,
        p_month_start: monthStartStr,
        p_admin_id: adminId,
        p_reason: reason || null,
      });

      if (error) {
        console.error("Error reopening month:", error);
        return { success: false, error: error.message };
      }

      const result = data as ReopenMonthResult;
      
      if (result.success) {
        // Refresh status
        await checkMonthClosed(fundId, monthStart);
        toast.success("Month reopened successfully");
      } else {
        toast.error(result.error || "Failed to reopen month");
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reopen month";
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [checkMonthClosed]);

  /**
   * Get available months for closing (last 12 months)
   */
  const getAvailableMonths = useCallback((): { value: string; label: string }[] => {
    const months: { value: string; label: string }[] = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = date.toISOString().split("T")[0]; // YYYY-MM-01
      const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      months.push({ value, label });
    }
    
    return months;
  }, []);

  return {
    loading,
    closureStatus,
    checkMonthClosed,
    closeReportingMonth,
    reopenReportingMonth,
    getAvailableMonths,
    setClosureStatus,
  };
}
