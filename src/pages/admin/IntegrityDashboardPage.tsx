/**
 * Admin Integrity Dashboard - P1 Enhanced
 * Comprehensive view of all data integrity checks
 * - Shows mismatch views (should be empty)
 * - Audit events and overall status
 * - admin_integrity_runs history (P1)
 * - "Run integrity now" button (P1)
 * - Violated views with sample rows (P1)
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Skeleton,
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
import { useIntegrityChecks, useAuditEvents } from "@/hooks/data";
import {
  useIntegrityRuns,
  useRunIntegrityCheck,
  useAdminAlerts,
  useAcknowledgeAlert,
} from "@/hooks/data";
import { useAuth } from "@/services/auth";
import type { IntegrityStatus, IntegrityCheck } from "@/types/domains/integrity";
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
  Play,
  Clock,
  Bell,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";

const ICON_MAP: Record<IntegrityCheck["iconName"], React.ReactNode> = {
  wallet: <Wallet className="h-5 w-5" />,
  "trending-up": <TrendingUp className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  scale: <Scale className="h-5 w-5" />,
  database: <Database className="h-5 w-5" />,
  shield: <Shield className="h-5 w-5" />,
};

export default function IntegrityDashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();

  // Existing hooks
  const { checks: integrityChecks, overallStatus, isLoading, refetch } = useIntegrityChecks();
  const { events: auditEvents } = useAuditEvents(10);

  // P1 hooks
  const { data: integrityRuns, isLoading: runsLoading } = useIntegrityRuns(20);
  const { data: alerts, isLoading: alertsLoading } = useAdminAlerts(10, false);
  const runIntegrityCheck = useRunIntegrityCheck();
  const acknowledgeAlert = useAcknowledgeAlert();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleRunIntegrityCheck = () => {
    runIntegrityCheck.mutate();
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    if (user?.id) {
      acknowledgeAlert.mutate({ alertId, userId: user.id });
    }
  };

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

  const getStatusBadgeClass = (status: IntegrityStatus | "pass" | "fail") => {
    switch (status) {
      case "ok":
      case "pass":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "error":
      case "fail":
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

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
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
          <Button
            variant="default"
            size="sm"
            onClick={handleRunIntegrityCheck}
            disabled={runIntegrityCheck.isPending}
          >
            <Play
              className={`h-4 w-4 mr-2 ${runIntegrityCheck.isPending ? "animate-pulse" : ""}`}
            />
            Run Integrity Check
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Alerts (P1) */}
      {alerts && alerts.length > 0 && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Bell className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-red-50/50 dark:bg-red-900/10"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={getSeverityBadgeClass(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{alert.title}</p>
                      {alert.description && (
                        <p className="text-xs text-muted-foreground">{alert.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      disabled={acknowledgeAlert.isPending}
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="checks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checks">Current Checks</TabsTrigger>
          <TabsTrigger value="history">Run History</TabsTrigger>
          <TabsTrigger value="audit">Audit Events</TabsTrigger>
        </TabsList>

        {/* Current Checks Tab */}
        <TabsContent value="checks" className="space-y-6">
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
                      {ICON_MAP[check.iconName]}
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
                  Violation Details
                </CardTitle>
                <CardDescription>Detailed breakdown of detected inconsistencies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {integrityChecks
                  ?.filter((c) => c.details && c.details.length > 0)
                  .map((check) => (
                    <div key={check.name} className="space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        {ICON_MAP[check.iconName]}
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
                                    {typeof val === "number" ? (
                                      <FinancialValue
                                        value={val}
                                        displayDecimals={6}
                                        showAsset={false}
                                      />
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
        </TabsContent>

        {/* Run History Tab (P1) */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Integrity Run History
              </CardTitle>
              <CardDescription>
                Previous integrity check runs from admin_integrity_runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {runsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : integrityRuns && integrityRuns.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
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
                      {integrityRuns.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell className="text-sm">
                            <div className="flex flex-col">
                              <span>{format(new Date(run.run_at), "MMM d, yyyy")}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(run.run_at), "HH:mm:ss")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClass(run.status)}>
                              {run.status === "pass" ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {run.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{run.violation_count}</TableCell>
                          <TableCell>
                            <span
                              className={
                                run.critical_count > 0
                                  ? "text-red-600 dark:text-red-400 font-bold"
                                  : ""
                              }
                            >
                              {run.critical_count}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {run.runtime_ms ? `${run.runtime_ms}ms` : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {run.triggered_by}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No integrity runs recorded yet. Click "Run Integrity Check" to create one.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Events Tab */}
        <TabsContent value="audit">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
