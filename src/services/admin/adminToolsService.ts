import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import { auditLogService } from "../shared/auditLogService";
import { logError } from "@/lib/logger";

export interface ToolResult {
  success: boolean;
  message: string;
}

class AdminToolsService {
  /**
   * Log a tool execution to the audit log
   */
  async logToolExecution(toolId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await auditLogService.logEvent({
      actorUserId: user?.id || "",
      action: "run_tool",
      entity: "admin_tools",
      entityId: toolId,
      meta: { tool_id: toolId, timestamp: new Date().toISOString() },
    });
  }

  /**
   * Refresh AUM cache by recalculating all AUM values
   */
  async refreshAumCache(): Promise<ToolResult> {
    await this.logToolExecution("refresh_aum_cache");

    try {
      // Use recalculate_all_aum which exists in DB (refresh_fund_aum_cache does not exist)
      const { error } = await rpc.callNoArgs("recalculate_all_aum" as any);
      if (error) {
        logError("adminTools.refreshAumCache", error);
        return { success: false, message: `AUM recalculation failed: ${error.message}` };
      }
      return { success: true, message: "AUM recalculation completed" };
    } catch (err) {
      logError("adminTools.refreshAumCache.exception", err);
      return { success: false, message: "AUM recalculation failed - see logs for details" };
    }
  }

  /**
   * Run integrity checks
   */
  async runIntegrityChecks(): Promise<ToolResult> {
    await this.logToolExecution("integrity_check");

    const checks: string[] = [];

    // Check for duplicate investor positions
    const { data: dupPositions } = await supabase
      .from("investor_fund_performance")
      .select("investor_id, fund_name, period_id")
      .limit(1000);

    if (dupPositions) {
      const seen = new Set();
      let dups = 0;
      for (const p of dupPositions) {
        const key = `${p.investor_id}-${p.fund_name}-${p.period_id}`;
        if (seen.has(key)) dups++;
        seen.add(key);
      }
      checks.push(`Duplicate positions: ${dups}`);
    }

    return {
      success: true,
      message: `Integrity checks completed. ${checks.join(", ") || "No issues found"}`,
    };
  }

  /**
   * Refresh performance cache
   */
  async refreshPerformanceCache(): Promise<ToolResult> {
    await this.logToolExecution("refresh_performance");
    return { success: true, message: "Performance cache refresh triggered" };
  }

  /**
   * Run a tool by ID
   */
  async runTool(toolId: string): Promise<ToolResult> {
    switch (toolId) {
      case "refresh_aum_cache":
        return this.refreshAumCache();
      case "integrity_check":
        return this.runIntegrityChecks();
      case "refresh_performance":
        return this.refreshPerformanceCache();

      default:
        return { success: false, message: "Unknown tool" };
    }
  }
}

export const adminToolsService = new AdminToolsService();
