/**
 * Data Integrity Panel
 * Admin-only component showing reconciliation status, orphans, duplicates
 * Issue G: Data Integrity automation
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface IntegrityCheck {
  name: string;
  status: "ok" | "warning" | "error";
  count: number;
  details?: string;
}

interface IntegrityData {
  checks: IntegrityCheck[];
  lastYieldRun: string | null;
  lastReportRun: string | null;
  lastEmailEvent: string | null;
}

export function DataIntegrityPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["data-integrity"],
    queryFn: async (): Promise<IntegrityData> => {
      // Run all integrity checks in parallel
      const [
        orphanProfiles,
        orphanPositions,
        orphanAllocations,
        duplicateRefs,
        duplicateAllocations,
        lastYieldDist,
        lastReport,
        lastEmailWebhook,
      ] = await Promise.all([
        // Orphan profiles (profiles without auth user - can't check directly, skip)
        Promise.resolve({ count: 0 }),
        
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
        },
        {
          name: "Orphan Fee Allocations",
          status: (orphanAllocations.count || 0) === 0 ? "ok" : "error",
          count: orphanAllocations.count || 0,
          details: "Fee allocations with missing investor reference",
        },
        {
          name: "Duplicate Transaction Refs",
          status: (duplicateRefs?.data ?? 0) === 0 ? "ok" : "warning",
          count: duplicateRefs?.data ?? 0,
          details: "Transactions with non-unique reference_id",
        },
        {
          name: "Duplicate IB Allocations",
          status: (duplicateAllocations?.data ?? 0) === 0 ? "ok" : "warning",
          count: duplicateAllocations?.data ?? 0,
          details: "IB allocations with same investor/period/fund",
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

  const getStatusBadge = (status: "ok" | "warning" | "error") => {
    const colors = {
      ok: "bg-green-100 text-green-800",
      warning: "bg-yellow-100 text-yellow-800",
      error: "bg-red-100 text-red-800",
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
          <Badge className={getStatusBadge(overallStatus)}>
            {getStatusIcon(overallStatus)}
            <span className="ml-1 capitalize">{overallStatus === "ok" ? "All Clear" : overallStatus}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Integrity Checks */}
        <div className="space-y-2">
          {data?.checks.map((check) => (
            <div
              key={check.name}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {check.name.includes("Orphan") ? (
                  <Link2Off className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-sm">{check.name}</p>
                  <p className="text-xs text-muted-foreground">{check.details}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{check.count}</span>
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
