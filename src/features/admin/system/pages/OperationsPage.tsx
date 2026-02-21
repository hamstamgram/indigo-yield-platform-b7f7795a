/**
 * Admin Operations Page
 * Consolidated system operations dashboard with 3 tabs:
 * - Health: Service status + delivery queue
 * - Integrity: 16-check invariant suite + run history + alerts
 * - Yield Events: Fund yield application status + gaps + batch actions
 */

import { useEffect, useState, lazy, Suspense } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  SortableTableHead,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { FinancialValue } from "@/components/common/FinancialValue";
import { CryptoIcon } from "@/components/CryptoIcons";
import { PageShell } from "@/components/layout/PageShell";
import { useAuth } from "@/services/auth";
import { useSortableColumns } from "@/hooks";
import { useTabFromUrl } from "@/hooks/ui/useTabFromUrl";
import {
  useSystemHealth,
  useDeliveryQueueMetrics,
  useIntegrityRuns,
  useAdminAlerts,
  useAcknowledgeAlert,
  useCrystallizationDashboard,
  useCrystallizationGaps,
} from "@/hooks/data";
import { useInvariantChecks } from "@/hooks/data";
import { getOverallStatus, type ServiceStatus } from "@/services/core/systemHealthService";
import type { InvariantSuiteResult, InvariantCheckResult } from "@/services/admin/integrityService";
import { formatDistanceToNow, format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Eye,
  FileText,
  HardDrive,
  HeartPulse,
  Inbox,
  Lock,
  Mail,
  Play,
  RefreshCw,
  Send,
  Shield,
  Users,
  XCircle,
  Zap,
} from "lucide-react";

const AuditLogViewer = lazy(() => import("./AuditLogViewer"));

// ============================================================================
// Health Tab
// ============================================================================

function HealthTab() {
  const { data: health, isLoading, refetch } = useSystemHealth();
  const { data: deliveryMetrics } = useDeliveryQueueMetrics();
  const overallStatus = health ? getOverallStatus(health) : "operational";

  const statusColors: Record<ServiceStatus, string> = {
    operational: "text-emerald-400 bg-emerald-500/10",
    degraded: "text-yellow-400 bg-yellow-500/10",
    down: "text-rose-400 bg-rose-500/10",
  };

  const statusIcons: Record<ServiceStatus, React.ReactNode> = {
    operational: <CheckCircle2 className="h-5 w-5" />,
    degraded: <AlertTriangle className="h-5 w-5" />,
    down: <XCircle className="h-5 w-5" />,
  };

  const getDeliveryQueueStatus = (): ServiceStatus => {
    if (!deliveryMetrics) return "operational";
    if (deliveryMetrics.stuck_sending_count > 0 || deliveryMetrics.failed_last_24h > 5)
      return "degraded";
    return "operational";
  };

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Overall System Status
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge className={`${statusColors[overallStatus]} text-sm px-3 py-1`}>
              {statusIcons[overallStatus]}
              <span className="ml-2 capitalize">{overallStatus}</span>
            </Badge>
            {health && health[0]?.lastChecked && (
              <span className="text-sm text-muted-foreground">
                Last checked: {format(health[0].lastChecked, "HH:mm:ss")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Report Delivery Queue
            </span>
            <Badge className={statusColors[getDeliveryQueueStatus()]}>
              {statusIcons[getDeliveryQueueStatus()]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Inbox className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">{deliveryMetrics?.queued_count ?? "-"}</p>
              <p className="text-xs text-muted-foreground">Queued</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Send className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{deliveryMetrics?.sending_count ?? "-"}</p>
              <p className="text-xs text-muted-foreground">Sending</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold text-orange-600">
                {deliveryMetrics?.stuck_sending_count ?? "-"}
              </p>
              <p className="text-xs text-muted-foreground">Stuck (&gt;15m)</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" />
              <p className="text-2xl font-bold text-destructive">
                {deliveryMetrics?.failed_last_24h ?? "-"}
              </p>
              <p className="text-xs text-muted-foreground">Failed (24h)</p>
            </div>
          </div>
          {deliveryMetrics?.oldest_queued_at && (
            <p className="text-sm text-muted-foreground">
              Oldest queued:{" "}
              {formatDistanceToNow(new Date(deliveryMetrics.oldest_queued_at), { addSuffix: true })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Service Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {health?.map((service) => (
            <Card key={service.name}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    {service.name === "Database" && <Database className="h-5 w-5" />}
                    {service.name === "Authentication" && <Shield className="h-5 w-5" />}
                    {service.name === "File Storage" && <HardDrive className="h-5 w-5" />}
                    {service.name === "Email Service" && <Mail className="h-5 w-5" />}
                    {service.name}
                  </span>
                  <Badge className={statusColors[service.status]}>
                    {statusIcons[service.status]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {service.uptime !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Uptime</span>
                      <span className="font-medium">{service.uptime}%</span>
                    </div>
                  )}
                  {service.responseTime !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Response Time</span>
                      <span className="font-medium">{service.responseTime}ms</span>
                    </div>
                  )}
                  {service.message && (
                    <p className="text-sm text-muted-foreground mt-2">{service.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Integrity Tab
// ============================================================================

const CATEGORY_META: Record<string, { icon: React.ReactNode; label: string }> = {
  Core: { icon: <Database className="h-5 w-5" />, label: "Core Integrity" },
  IB: { icon: <Users className="h-5 w-5" />, label: "IB Consistency" },
  Temporal: { icon: <Calendar className="h-5 w-5" />, label: "Temporal Checks" },
  Security: { icon: <Lock className="h-5 w-5" />, label: "Security Checks" },
};

function groupChecksByCategory(
  checks: InvariantCheckResult[]
): Record<string, InvariantCheckResult[]> {
  const groups: Record<string, InvariantCheckResult[]> = {};
  for (const check of checks) {
    const cat = check.category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(check);
  }
  return groups;
}

function CheckCard({ check }: { check: InvariantCheckResult }) {
  const [expanded, setExpanded] = useState(false);
  const hasViolations = check.violations && check.violations.length > 0;

  return (
    <Card className={!check.passed ? "border-rose-500/30" : undefined}>
      <button
        className="w-full p-4 flex items-center gap-3 text-left"
        onClick={() => hasViolations && setExpanded(!expanded)}
        disabled={!hasViolations}
      >
        {check.passed ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{check.name}</p>
          {!check.passed && (
            <p className="text-xs text-rose-400 mt-0.5">
              {check.violation_count} violation{check.violation_count !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Badge variant={check.passed ? "default" : "destructive"} className="shrink-0 text-xs">
          {check.passed ? "PASS" : "FAIL"}
        </Badge>
        {hasViolations && (
          <span className="shrink-0 text-muted-foreground">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        )}
      </button>
      {expanded && hasViolations && (
        <div className="px-4 pb-4">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(check.violations[0]).map((key) => (
                    <TableHead key={key} className="text-xs font-semibold uppercase">
                      {key.replace(/_/g, " ")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {check.violations.slice(0, 10).map((row, idx) => (
                  <TableRow key={idx}>
                    {Object.values(row).map((val, i) => (
                      <TableCell key={i} className="text-xs font-mono">
                        {typeof val === "number" ? (
                          <FinancialValue value={val} displayDecimals={6} showAsset={false} />
                        ) : (
                          String(val ?? "-")
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {check.violations.length > 10 && (
            <p className="text-xs text-muted-foreground italic mt-2 pl-1">
              Showing 10 of {check.violations.length} violations
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function IntegrityTab() {
  const { user } = useAuth();
  const invariantMutation = useInvariantChecks();
  const invariantResult = invariantMutation.data as InvariantSuiteResult | undefined;
  const { data: integrityRuns, isLoading: runsLoading } = useIntegrityRuns(20);
  const { data: alerts } = useAdminAlerts(10, false);
  const acknowledgeAlert = useAcknowledgeAlert();

  // Auto-run integrity checks on mount
  useEffect(() => {
    if (!invariantResult && !invariantMutation.isPending) {
      invariantMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = invariantResult ? groupChecksByCategory(invariantResult.checks) : null;

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {invariantResult && (
            <Badge variant={invariantResult.failed === 0 ? "default" : "destructive"}>
              {invariantResult.failed === 0 ? (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              ) : (
                <XCircle className="h-4 w-4 mr-1" />
              )}
              {invariantResult.passed}/{invariantResult.total_checks} Passed
            </Badge>
          )}
          {invariantResult && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(invariantResult.run_at), "MMM d, yyyy HH:mm:ss")}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => invariantMutation.mutate()}
          disabled={invariantMutation.isPending}
        >
          <Play className={`h-4 w-4 mr-2 ${invariantMutation.isPending ? "animate-pulse" : ""}`} />
          {invariantMutation.isPending ? "Running..." : "Run Full Check"}
        </Button>
      </div>

      {/* Active Alerts */}
      {alerts && alerts.length > 0 && (
        <Card className="border-rose-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-rose-400">
              <Bell className="h-5 w-5 animate-pulse" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="text-xs">
                      {alert.severity}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{alert.title}</p>
                      {alert.message && (
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        user?.id && acknowledgeAlert.mutate({ alertId: alert.id, userId: user.id })
                      }
                      disabled={acknowledgeAlert.isPending}
                      className="h-8 w-8"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {invariantMutation.isPending && !invariantResult && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin h-10 w-10 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Running 16 invariant checks...</h3>
            <p className="text-muted-foreground mt-1">
              Checking core integrity, IB consistency, temporal rules, and security
            </p>
          </CardContent>
        </Card>
      )}

      {/* Invariant check results */}
      {invariantResult && grouped && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Total Checks
                </p>
                <p className="text-2xl font-bold font-mono">{invariantResult.total_checks}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs uppercase tracking-wider text-emerald-500 mb-1">Passed</p>
                <p className="text-2xl font-bold font-mono text-emerald-400">
                  {invariantResult.passed}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p
                  className={`text-xs uppercase tracking-wider mb-1 ${invariantResult.failed > 0 ? "text-rose-500" : "text-muted-foreground"}`}
                >
                  Failed
                </p>
                <p
                  className={`text-2xl font-bold font-mono ${invariantResult.failed > 0 ? "text-rose-400" : "text-muted-foreground"}`}
                >
                  {invariantResult.failed}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Run At
                </p>
                <p className="text-sm font-mono">
                  {format(new Date(invariantResult.run_at), "HH:mm:ss")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(invariantResult.run_at), "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Check groups by category */}
          {Object.entries(grouped).map(([category, checks]) => {
            const meta = CATEGORY_META[category] || {
              icon: <Database className="h-5 w-5" />,
              label: category,
            };
            const allPassed = checks.every((c) => c.passed);

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <span className="p-2 rounded-lg border bg-muted/50">{meta.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold">{meta.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      {checks.length} check{checks.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Badge variant={allPassed ? "default" : "destructive"} className="text-xs">
                    {allPassed
                      ? `${checks.length}/${checks.length} PASS`
                      : `${checks.filter((c) => !c.passed).length} FAIL`}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {checks.map((check) => (
                    <CheckCard key={check.name} check={check} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Run History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Integrity Run History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead>Critical</TableHead>
                  <TableHead>Runtime</TableHead>
                  <TableHead>Triggered By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading history...
                    </TableCell>
                  </TableRow>
                ) : integrityRuns && integrityRuns.length > 0 ? (
                  integrityRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(run.run_at), "MMM d, yyyy")}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {format(new Date(run.run_at), "HH:mm:ss")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={run.status === "pass" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {run.status === "pass" ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {run.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{run.violation_count}</TableCell>
                      <TableCell>
                        <span
                          className={
                            run.critical_count > 0
                              ? "text-rose-400 font-bold"
                              : "text-muted-foreground"
                          }
                        >
                          {run.critical_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono">
                        {run.runtime_ms ? `${run.runtime_ms}ms` : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{run.triggered_by}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No integrity runs recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Yield Events Tab
// ============================================================================

function YieldEventsTab() {
  const [selectedFundId, setSelectedFundId] = useState<string | undefined>(undefined);

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useCrystallizationDashboard();
  const {
    data: gaps,
    isLoading: gapsLoading,
    refetch: refetchGaps,
  } = useCrystallizationGaps(selectedFundId);

  const {
    sortConfig: fundSortConfig,
    requestSort: fundRequestSort,
    sortedData: sortedFunds,
  } = useSortableColumns(dashboardData || [], { column: "fund_code", direction: "asc" });

  const {
    sortConfig: gapSortConfig,
    requestSort: gapRequestSort,
    sortedData: sortedGaps,
  } = useSortableColumns(gaps || [], { column: "days_behind", direction: "desc" });

  const handleRefresh = () => {
    refetchDashboard();
    refetchGaps();
  };

  const totalGaps =
    dashboardData?.reduce(
      (sum, f) => sum + f.warning_stale + f.critical_stale + f.never_crystallized,
      0
    ) || 0;
  const totalPositions = dashboardData?.reduce((sum, f) => sum + f.total_positions, 0) || 0;

  if (dashboardLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
        <div className="flex items-center gap-3">
          <Badge variant={totalGaps === 0 ? "default" : "secondary"}>
            {totalGaps === 0 ? (
              <CheckCircle2 className="h-4 w-4 mr-1" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-1" />
            )}
            {totalGaps} gaps
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Total Funds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPositions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Recorded Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {dashboardData?.reduce((sum, f) => sum + f.up_to_date, 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card className={totalGaps > 0 ? "border-yellow-500/30" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalGaps > 0 ? "text-yellow-400" : ""}`}>
              {totalGaps}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fund Status Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Fund Yield Event Status
          </CardTitle>
          <CardDescription>Yield application coverage per fund</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedFunds && sortedFunds.length > 0 ? (
            <div className="rounded-md border">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      column="fund_code"
                      currentSort={fundSortConfig}
                      onSort={fundRequestSort}
                    >
                      Fund
                    </SortableTableHead>
                    <SortableTableHead
                      column="total_positions"
                      currentSort={fundSortConfig}
                      onSort={fundRequestSort}
                      className="text-right"
                    >
                      Positions
                    </SortableTableHead>
                    <SortableTableHead
                      column="up_to_date"
                      currentSort={fundSortConfig}
                      onSort={fundRequestSort}
                      className="text-right"
                    >
                      Recorded Events
                    </SortableTableHead>
                    <TableHead className="text-right">Gaps</TableHead>
                    <TableHead className="text-right">Staleness</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFunds.map((fund) => {
                    const fundGaps =
                      fund.warning_stale + fund.critical_stale + fund.never_crystallized;
                    return (
                      <TableRow key={fund.fund_id}>
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-2">
                            <CryptoIcon
                              symbol={fund.fund_code.split("-").pop() || fund.fund_code}
                              className="h-4 w-4"
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{fund.fund_code}</span>
                              <span className="text-muted-foreground">{fund.fund_name}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {fund.total_positions}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-emerald-400 font-mono">{fund.up_to_date}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={fundGaps > 0 ? "secondary" : "default"}
                            className="text-xs"
                          >
                            {fundGaps}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {fund.critical_stale > 0 ? (
                            <span className="text-rose-400">{fund.critical_stale} critical</span>
                          ) : fund.warning_stale > 0 ? (
                            <span className="text-yellow-400">{fund.warning_stale} stale</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No funds found</p>
          )}
        </CardContent>
      </Card>

      {/* Crystallization Gaps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Yield Event Gaps
              </CardTitle>
              <CardDescription>Positions that need yield events applied</CardDescription>
            </div>
            <Select
              value={selectedFundId || "all"}
              onValueChange={(val) => setSelectedFundId(val === "all" ? undefined : val)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All funds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All funds</SelectItem>
                {dashboardData?.map((fund) => (
                  <SelectItem key={fund.fund_id} value={fund.fund_id}>
                    {fund.fund_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {gapsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedGaps && sortedGaps.length > 0 ? (
            <div className="rounded-md border">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <SortableTableHead
                      column="fund_code"
                      currentSort={gapSortConfig}
                      onSort={gapRequestSort}
                    >
                      Fund
                    </SortableTableHead>
                    <TableHead>Last Event</TableHead>
                    <SortableTableHead
                      column="days_behind"
                      currentSort={gapSortConfig}
                      onSort={gapRequestSort}
                      className="text-right"
                    >
                      Days
                    </SortableTableHead>
                    <SortableTableHead
                      column="current_value"
                      currentSort={gapSortConfig}
                      onSort={gapRequestSort}
                      className="text-right"
                    >
                      Value
                    </SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedGaps.map((gap, idx) => (
                    <TableRow key={`${gap.investor_id}-${gap.fund_id}-${idx}`}>
                      <TableCell className="py-1.5">
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[140px]">
                            {gap.investor_email}
                          </span>
                          <span className="text-muted-foreground font-mono">
                            {gap.investor_id.slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-2">
                          <CryptoIcon
                            symbol={gap.fund_code.split("-").pop() || gap.fund_code}
                            className="h-4 w-4"
                          />
                          <Badge variant="outline" className="text-[10px]">
                            {gap.fund_code}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        {gap.last_yield_crystallization_date ? (
                          <div className="flex flex-col">
                            <span>
                              {format(new Date(gap.last_yield_crystallization_date), "MMM d, yyyy")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(gap.last_yield_crystallization_date), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-1.5">
                        <span
                          className={
                            gap.days_behind > 30
                              ? "text-rose-400 font-bold"
                              : gap.days_behind > 7
                                ? "text-yellow-400"
                                : ""
                          }
                        >
                          {gap.days_behind}d
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-1.5">
                        <FinancialValue value={gap.current_value} displayDecimals={2} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-emerald-400">
                All positions have been recorded
              </p>
              <p className="text-xs text-muted-foreground mt-1">No gaps found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Operations Page
// ============================================================================

export default function OperationsPage() {
  const { activeTab, setActiveTab } = useTabFromUrl({ defaultTab: "health" });

  return (
    <PageShell>
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HeartPulse className="h-8 w-8" />
          Operations
        </h1>
        <p className="text-muted-foreground mt-1">
          System health, data integrity, yield distribution, and audit trail
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="integrity" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Integrity
          </TabsTrigger>
          <TabsTrigger value="crystallization" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Yield Events
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <HealthTab />
        </TabsContent>

        <TabsContent value="integrity">
          <IntegrityTab />
        </TabsContent>

        <TabsContent value="crystallization">
          <YieldEventsTab />
        </TabsContent>

        <TabsContent value="audit">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <AuditLogViewer embedded />
          </Suspense>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
