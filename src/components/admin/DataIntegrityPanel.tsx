/**
 * Data Integrity Panel
 * Admin-only component showing reconciliation status, orphans, duplicates
 * Issue G: Data Integrity automation
 * Enhanced with position vs transaction reconciliation checks
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Link2Off,
  Copy,
  TrendingUp,
  Mail,
  RefreshCw,
  Ban,
  Scale,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface IntegrityCheck {
  name: string;
  status: "ok" | "warning" | "error";
  count: number;
  details?: string;
  icon?: "orphan" | "duplicate" | "voided" | "reconciliation";
}

interface IntegrityData {
  checks: IntegrityCheck[];
  lastYieldRun: string | null;
  lastReportRun: string | null;
  lastEmailEvent: string | null;
}

export function DataIntegrityPanel() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["data-integrity"],
    queryFn: async (): Promise<IntegrityData> => {
      // Run all integrity checks in parallel
      const [
        orphanPositions,
        orphanAllocations,
        duplicateRefs,
        duplicateAllocations,
        voidedTransactions,
        positionMismatches,
        lastYieldDist,
        lastReport,
        lastEmailWebhook,
      ] = await Promise.all([
        // Orphan positions (positions with non-existent investor_id)
        supabase
          .from("investor_positions")
          .select("id", { count: "exact", head: true })
          .is("investor_id", null),
        
        // Orphan fee allocations (missing investor)
        supabase
          .from("fee_allocations")
          .select("id", { count: "exact", head: true })
          .is("investor_id", null),
        
        // Duplicate reference_ids in transactions (should be unique)
        supabase
          .rpc("check_duplicate_transaction_refs") as unknown as Promise<{ data: number | null; error: any }>,
        
        // Duplicate IB allocations (same investor, period, fund)
        supabase
          .rpc("check_duplicate_ib_allocations") as unknown as Promise<{ data: number | null; error: any }>,

        // Voided transactions count
        supabase
          .from("transactions_v2")
          .select("id", { count: "exact", head: true })
          .eq("is_voided", true),

        // Position vs transaction reconciliation mismatches
        // This checks if position.current_value matches sum of transactions
        checkPositionReconciliation(),
        
        // Last yield distribution
        supabase
          .from("yield_distributions")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
        
        // Last generated report
        supabase
          .from("generated_reports")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
        
        // Last email delivery event
        supabase
          .from("report_delivery_events")
          .select("occurred_at")
          .order("occurred_at", { ascending: false })
          .limit(1)
          .single(),
      ]);

      const checks: IntegrityCheck[] = [
        {
          name: "Orphan Positions",
          status: (orphanPositions.count || 0) === 0 ? "ok" : "error",
          count: orphanPositions.count || 0,
          details: "Positions with missing investor reference",
          icon: "orphan",
        },
        {
          name: "Orphan Fee Allocations",
          status: (orphanAllocations.count || 0) === 0 ? "ok" : "error",
          count: orphanAllocations.count || 0,
          details: "Fee allocations with missing investor reference",
          icon: "orphan",
        },
        {
          name: "Duplicate Transaction Refs",
          status: (duplicateRefs?.data ?? 0) === 0 ? "ok" : "warning",
          count: duplicateRefs?.data ?? 0,
          details: "Transactions with non-unique reference_id",
          icon: "duplicate",
        },
        {
          name: "Duplicate IB Allocations",
          status: (duplicateAllocations?.data ?? 0) === 0 ? "ok" : "warning",
          count: duplicateAllocations?.data ?? 0,
          details: "IB allocations with same investor/period/fund",
          icon: "duplicate",
        },
        {
          name: "Voided Transactions",
          status: (voidedTransactions.count || 0) === 0 ? "ok" : "warning",
          count: voidedTransactions.count || 0,
          details: "Total voided transactions in system",
          icon: "voided",
        },
        {
          name: "Position Reconciliation",
          status: positionMismatches.count === 0 ? "ok" : "error",
          count: positionMismatches.count,
          details: positionMismatches.count === 0 
            ? "All positions match transaction sums" 
            : `${positionMismatches.count} positions don't match transaction totals`,
          icon: "reconciliation",
        },
      ];

      return {
        checks,
        lastYieldRun: lastYieldDist.data?.created_at || null,
        lastReportRun: lastReport.data?.created_at || null,
        lastEmailEvent: lastEmailWebhook.data?.occurred_at || null,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Check position vs transaction reconciliation
  async function checkPositionReconciliation(): Promise<{ count: number; mismatches: any[] }> {
    try {
      // Get all positions with current_value > 0
      const { data: positions } = await supabase
        .from("investor_positions")
        .select("investor_id, fund_id, current_value")
        .gt("current_value", 0);

      if (!positions || positions.length === 0) {
        return { count: 0, mismatches: [] };
      }

      // For each position, calculate expected value from transactions
      const mismatches: any[] = [];
      
      // Get transaction sums grouped by investor+fund
      const { data: txSums } = await supabase
        .from("transactions_v2")
        .select("investor_id, fund_id, amount, type")
        .eq("is_voided", false);

      // Calculate expected balance per investor+fund
      const expectedBalances = new Map<string, number>();
      (txSums || []).forEach(tx => {
        const key = `${tx.investor_id}:${tx.fund_id}`;
        const current = expectedBalances.get(key) || 0;
        // Credits add, debits subtract
        const isCredit = ["DEPOSIT", "TOP_UP", "FIRST_INVESTMENT", "INTEREST", "IB_COMMISSION"].includes(tx.type || "");
        expectedBalances.set(key, current + (isCredit ? (tx.amount || 0) : -(Math.abs(tx.amount || 0))));
      });

      // Compare positions to expected
      const tolerance = 0.00001; // Small tolerance for floating point
      for (const pos of positions) {
        const key = `${pos.investor_id}:${pos.fund_id}`;
        const expected = expectedBalances.get(key) || 0;
        const actual = pos.current_value || 0;
        
        if (Math.abs(actual - expected) > tolerance) {
          mismatches.push({
            investor_id: pos.investor_id,
            fund_id: pos.fund_id,
            position_value: actual,
            transaction_sum: expected,
            difference: actual - expected,
          });
        }
      }

      return { count: mismatches.length, mismatches };
    } catch (error) {
      console.error("Error checking position reconciliation:", error);
      return { count: -1, mismatches: [] }; // -1 indicates error
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: "ok" | "warning" | "error") => {
    switch (status) {
      case "ok":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getCheckIcon = (icon?: string) => {
    switch (icon) {
      case "orphan":
        return <Link2Off className="h-4 w-4 text-muted-foreground" />;
      case "duplicate":
        return <Copy className="h-4 w-4 text-muted-foreground" />;
      case "voided":
        return <Ban className="h-4 w-4 text-muted-foreground" />;
      case "reconciliation":
        return <Scale className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Database className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: "ok" | "warning" | "error") => {
    const colors = {
      ok: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status];
  };

  const overallStatus = data?.checks.every((c) => c.status === "ok")
    ? "ok"
    : data?.checks.some((c) => c.status === "error")
    ? "error"
    : "warning";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Integrity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Integrity
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Badge className={getStatusBadge(overallStatus)}>
              {getStatusIcon(overallStatus)}
              <span className="ml-1 capitalize">{overallStatus === "ok" ? "All Clear" : overallStatus}</span>
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Integrity Checks */}
        <div className="space-y-2">
          {data?.checks.map((check) => (
            <div
              key={check.name}
              className={`flex items-center justify-between p-3 border rounded-lg ${
                check.status === "error" ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10" :
                check.status === "warning" ? "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900/50 dark:bg-yellow-900/10" :
                ""
              }`}
            >
              <div className="flex items-center gap-3">
                {getCheckIcon(check.icon)}
                <div>
                  <p className="font-medium text-sm">{check.name}</p>
                  <p className="text-xs text-muted-foreground">{check.details}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-mono ${
                  check.status === "error" ? "text-red-600 dark:text-red-400" :
                  check.status === "warning" ? "text-yellow-600 dark:text-yellow-400" :
                  ""
                }`}>
                  {check.count}
                </span>
                {getStatusIcon(check.status)}
              </div>
            </div>
          ))}
        </div>

        {/* Last Activity */}
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium mb-3">Last Activity</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-2 bg-muted/50 rounded">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Yield Run</p>
              <p className="text-xs font-medium">
                {data?.lastYieldRun
                  ? formatDistanceToNow(new Date(data.lastYieldRun), { addSuffix: true })
                  : "Never"}
              </p>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <Database className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Report Gen</p>
              <p className="text-xs font-medium">
                {data?.lastReportRun
                  ? formatDistanceToNow(new Date(data.lastReportRun), { addSuffix: true })
                  : "Never"}
              </p>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <Mail className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Email Event</p>
              <p className="text-xs font-medium">
                {data?.lastEmailEvent
                  ? formatDistanceToNow(new Date(data.lastEmailEvent), { addSuffix: true })
                  : "Never"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
