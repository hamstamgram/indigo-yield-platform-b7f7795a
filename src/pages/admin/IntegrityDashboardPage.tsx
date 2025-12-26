/**
 * Admin Integrity Dashboard
 * Comprehensive view of all data integrity checks
 * Shows mismatch views (should be empty), audit events, and overall status
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  Scale,
  TrendingUp,
  Users,
  Wallet,
  Shield,
  Activity,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";

type IntegrityStatus = "ok" | "warning" | "error";

interface IntegrityCheck {
  name: string;
  description: string;
  status: IntegrityStatus;
  count: number;
  icon: React.ReactNode;
  details?: any[];
}

interface AuditEvent {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  actor_user: string | null;
  created_at: string;
}

export default function IntegrityDashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all integrity check results
  const {
    data: integrityChecks,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.integrityDashboard,
    queryFn: async (): Promise<IntegrityCheck[]> => {
      const [
        fundAumMismatch,
        yieldConservation,
        ibConsistency,
        positionLedgerMismatch,
        orphanPositions,
        voidedTransactions,
      ] = await Promise.all([
        // Fund AUM mismatch
        supabase.from("fund_aum_mismatch").select("*"),
        // Yield distribution conservation
        supabase.from("yield_distribution_conservation_check").select("*"),
        // IB allocation consistency
        supabase.from("ib_allocation_consistency").select("*"),
        // Position vs ledger mismatch
        supabase.from("investor_position_ledger_mismatch").select("*"),
        // Orphan positions
        supabase
          .from("investor_positions")
          .select("id", { count: "exact", head: true })
          .is("investor_id", null),
        // Voided transactions (informational)
        supabase
          .from("transactions_v2")
          .select("id", { count: "exact", head: true })
          .eq("is_voided", true),
      ]);

      return [
        {
          name: "Fund AUM Reconciliation",
          description: "Recorded AUM matches sum of investor positions",
          status: (fundAumMismatch.data?.length || 0) === 0 ? "ok" : "error",
          count: fundAumMismatch.data?.length || 0,
          icon: <Wallet className="h-5 w-5" />,
          details: fundAumMismatch.data,
        },
        {
          name: "Yield Conservation",
          description: "Gross yield = Net + Fees + IB",
          status: (yieldConservation.data?.length || 0) === 0 ? "ok" : "error",
          count: yieldConservation.data?.length || 0,
          icon: <TrendingUp className="h-5 w-5" />,
          details: yieldConservation.data,
        },
        {
          name: "IB Allocation Consistency",
          description: "IB relationships haven't changed since allocation",
          status: (ibConsistency.data?.length || 0) === 0 ? "ok" : "warning",
          count: ibConsistency.data?.length || 0,
          icon: <Users className="h-5 w-5" />,
          details: ibConsistency.data,
        },
        {
          name: "Position vs Ledger",
          description: "Position values match transaction history",
          status: (positionLedgerMismatch.data?.length || 0) === 0 ? "ok" : "error",
          count: positionLedgerMismatch.data?.length || 0,
          icon: <Scale className="h-5 w-5" />,
          details: positionLedgerMismatch.data,
        },
        {
          name: "Orphan Positions",
          description: "Positions without investor reference",
          status: (orphanPositions.count || 0) === 0 ? "ok" : "error",
          count: orphanPositions.count || 0,
          icon: <Database className="h-5 w-5" />,
        },
        {
          name: "Voided Transactions",
          description: "Transactions marked as voided (informational)",
          status: (voidedTransactions.count || 0) === 0 ? "ok" : "warning",
          count: voidedTransactions.count || 0,
          icon: <Shield className="h-5 w-5" />,
        },
      ];
    },
    refetchInterval: 60000,
  });

  // Fetch latest audit events
  const { data: auditEvents } = useQuery({
    queryKey: QUERY_KEYS.integrityAuditEvents,
    queryFn: async (): Promise<AuditEvent[]> => {
      const { data } = await supabase
        .from("audit_log")
        .select("id, action, entity, entity_id, actor_user, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      return (data as AuditEvent[]) || [];
    },
    refetchInterval: 30000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const overallStatus: IntegrityStatus = integrityChecks
    ? integrityChecks.every((c) => c.status === "ok")
      ? "ok"
      : integrityChecks.some((c) => c.status === "error")
      ? "error"
      : "warning"
    : "ok";

  const getStatusIcon = (status: IntegrityStatus) => {
    switch (status) {
      case "ok":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadgeClass = (status: IntegrityStatus) => {
    switch (status) {
      case "ok":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    }
  };

  const getStatusLabel = (status: IntegrityStatus) => {
    switch (status) {
      case "ok":
        return "All Clear";
      case "warning":
        return "Warnings";
      case "error":
        return "Issues Found";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Integrity</h1>
          <p className="text-muted-foreground">
            Monitor database consistency and reconciliation status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${getStatusBadgeClass(overallStatus)} text-sm px-3 py-1.5`}>
            {getStatusIcon(overallStatus)}
            <span className="ml-2">{getStatusLabel(overallStatus)}</span>
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Integrity Checks Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrityChecks?.map((check) => (
          <Card
            key={check.name}
            className={
              check.status === "error"
                ? "border-red-200 dark:border-red-900/50"
                : check.status === "warning"
                ? "border-yellow-200 dark:border-yellow-900/50"
                : ""
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  {check.icon}
                  {check.name}
                </span>
                {getStatusIcon(check.status)}
              </CardTitle>
              <CardDescription>{check.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Issues</span>
                <span
                  className={`text-2xl font-bold ${
                    check.status === "error"
                      ? "text-red-600 dark:text-red-400"
                      : check.status === "warning"
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {check.count}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mismatch Details (if any) */}
      {integrityChecks?.some((c) => c.details && c.details.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Mismatch Details
            </CardTitle>
            <CardDescription>Detailed breakdown of detected inconsistencies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {integrityChecks
              ?.filter((c) => c.details && c.details.length > 0)
              .map((check) => (
                <div key={check.name} className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    {check.icon}
                    {check.name}
                  </h4>
                  <div className="rounded-md border overflow-auto max-h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {check.details?.[0] &&
                            Object.keys(check.details[0]).map((key) => (
                              <TableHead key={key} className="text-xs">
                                {key.replace(/_/g, " ")}
                              </TableHead>
                            ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {check.details?.slice(0, 5).map((row, idx) => (
                          <TableRow key={idx}>
                            {Object.values(row).map((val, i) => (
                              <TableCell key={i} className="text-xs font-mono">
                                {typeof val === "number"
                                  ? val.toFixed(6)
                                  : String(val ?? "-")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {check.details && check.details.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      Showing 5 of {check.details.length} issues
                    </p>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Audit Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Audit Events
          </CardTitle>
          <CardDescription>Last 10 logged system events</CardDescription>
        </CardHeader>
        <CardContent>
          {auditEvents && auditEvents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.action}</TableCell>
                      <TableCell>
                        {event.entity}
                        {event.entity_id && (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({event.entity_id.slice(0, 8)}...)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent audit events
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
