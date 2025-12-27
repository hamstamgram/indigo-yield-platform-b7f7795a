/**
 * IntegrityStatus - Admin dashboard widget showing data integrity check status
 * Displays last check time, pass/fail counts, and allows manual trigger
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface IntegrityCheckResult {
  name: string;
  status: "pass" | "fail";
  severity: string;
  count: number;
  description: string;
}

interface IntegrityCheckLog {
  id: string;
  checked_at: string;
  total_checks: number;
  passed: number;
  failed: number;
  critical_failures: number;
  results: IntegrityCheckResult[];
  triggered_by: string;
}

export function IntegrityStatus() {
  const [isRunning, setIsRunning] = useState(false);
  const queryClient = useQueryClient();

  // Fetch latest integrity check log
  const { data: lastCheck, isLoading } = useQuery({
    queryKey: ["integrity-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrity_check_log")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }
      if (!data) return null;
      
      return {
        ...data,
        results: data.results as unknown as IntegrityCheckResult[],
      } as IntegrityCheckLog;
    },
    staleTime: 60000, // 1 minute
  });

  // Manually trigger integrity check
  const runIntegrityCheck = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("integrity-monitor", {
        body: { triggered_by: "manual" },
      });

      if (error) throw error;

      if (data?.summary?.failed > 0) {
        toast.warning(`Integrity check found ${data.summary.failed} issue(s)`, {
          description: `${data.summary.critical} critical failures detected`,
        });
      } else {
        toast.success("Integrity check passed", {
          description: "All systems healthy",
        });
      }

      // Refresh the status
      queryClient.invalidateQueries({ queryKey: ["integrity-status"] });
    } catch (error) {
      toast.error("Failed to run integrity check", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = () => {
    if (!lastCheck) return <Clock className="h-5 w-5 text-muted-foreground" />;
    if (lastCheck.critical_failures > 0) return <XCircle className="h-5 w-5 text-destructive" />;
    if (lastCheck.failed > 0) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  };

  const getStatusBadge = () => {
    if (!lastCheck) return <Badge variant="secondary">No checks yet</Badge>;
    if (lastCheck.critical_failures > 0) return <Badge variant="destructive">Critical Issues</Badge>;
    if (lastCheck.failed > 0) return <Badge variant="outline" className="border-amber-500 text-amber-600">Warnings</Badge>;
    return <Badge variant="outline" className="border-green-500 text-green-600">Healthy</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Data Integrity
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={runIntegrityCheck}
            disabled={isRunning || isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRunning ? "animate-spin" : ""}`} />
            {isRunning ? "Checking..." : "Run Check"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
          {lastCheck && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(lastCheck.checked_at), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Check Results Summary */}
        {lastCheck && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-green-500/10 p-2">
              <p className="text-lg font-mono font-semibold text-green-600">{lastCheck.passed}</p>
              <p className="text-xs text-muted-foreground">Passed</p>
            </div>
            <div className="rounded-md bg-amber-500/10 p-2">
              <p className="text-lg font-mono font-semibold text-amber-600">
                {lastCheck.failed - lastCheck.critical_failures}
              </p>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </div>
            <div className="rounded-md bg-destructive/10 p-2">
              <p className="text-lg font-mono font-semibold text-destructive">{lastCheck.critical_failures}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
          </div>
        )}

        {/* Failed Checks Details */}
        {lastCheck && lastCheck.failed > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Issues Detected:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {lastCheck.results
                .filter((r) => r.status === "fail")
                .map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50"
                  >
                    {result.severity === "critical" ? (
                      <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                    )}
                    <span className="truncate">{result.name}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px] h-4">
                      {result.count}
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* No checks yet */}
        {!lastCheck && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No integrity checks have been run yet. Click "Run Check" to start.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
