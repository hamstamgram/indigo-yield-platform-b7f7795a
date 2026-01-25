/**
 * Admin Integrity Dashboard - Yield Spectrum Redesign
 * Comprehensive view of all data integrity checks
 */

import {
  Button,
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
  Badge,
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
  wallet: <Wallet className="h-5 w-5 text-indigo-400" />,
  "trending-up": <TrendingUp className="h-5 w-5 text-emerald-400" />,
  users: <Users className="h-5 w-5 text-indigo-400" />,
  scale: <Scale className="h-5 w-5 text-amber-400" />,
  database: <Database className="h-5 w-5 text-indigo-400" />,
  shield: <Shield className="h-5 w-5 text-indigo-400" />,
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
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case "error":
        return <XCircle className="h-5 w-5 text-rose-500" />;
    }
  };

  const getStatusBadgeClass = (status: IntegrityStatus | "pass" | "fail") => {
    switch (status) {
      case "ok":
      case "pass":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_-4px_rgba(16,185,129,0.3)]";
      case "warning":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_-4px_rgba(251,191,36,0.3)]";
      case "error":
      case "fail":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_-4px_rgba(244,63,94,0.3)]";
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
        return "bg-rose-500/20 text-rose-400 border border-rose-500/30";
      case "warning":
        return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      default:
        return "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-white/5 rounded-lg mb-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-white/5 rounded-xl border border-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <Shield className="h-8 w-8 text-indigo-400" />
            Data Integrity
          </h1>
          <p className="text-zinc-400 font-light mt-1">
            Monitor database consistency and reconciliation status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={`${getStatusBadgeClass(overallStatus)} text-sm px-4 py-1.5 h-9 rounded-full border`}
          >
            {getStatusIcon(overallStatus)}
            <span className="ml-2 font-medium">{getStatusLabel(overallStatus)}</span>
          </Badge>
          <Button
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border-0 transition-all font-medium"
            size="sm"
            onClick={handleRunIntegrityCheck}
            disabled={runIntegrityCheck.isPending}
          >
            <Play
              className={`h-4 w-4 mr-2 ${runIntegrityCheck.isPending ? "animate-pulse" : ""}`}
            />
            Run Check
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Alerts (P1) */}
      {alerts && alerts.length > 0 && (
        <div className="border border-rose-500/20 bg-rose-500/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-[0_0_30px_-10px_rgba(244,63,94,0.1)]">
          <div className="p-4 border-b border-rose-500/10 flex items-center gap-2 bg-rose-500/10">
            <Bell className="h-5 w-5 text-rose-400 animate-pulse" />
            <h3 className="font-semibold text-rose-400">Active Alerts ({alerts.length})</h3>
          </div>
          <div className="p-2">
            <div className="space-y-1">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-rose-500/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={getSeverityBadgeClass(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm text-rose-200">{alert.title}</p>
                      {alert.description && (
                        <p className="text-xs text-rose-300/60">{alert.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-rose-400/50 font-mono">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      disabled={acknowledgeAlert.isPending}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-full h-8 w-8"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="checks" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-full">
          <TabsTrigger
            value="checks"
            className="rounded-full data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 px-6"
          >
            Current Checks
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-full data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 px-6"
          >
            Run History
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="rounded-full data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 px-6"
          >
            Audit Events
          </TabsTrigger>
        </TabsList>

        {/* Current Checks Tab */}
        <TabsContent value="checks" className="space-y-6">
          {/* Integrity Checks Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrityChecks?.map((check) => (
              <div
                key={check.name}
                className={`glass-card p-5 rounded-xl border backdrop-blur-xl transition-all duration-300 hover:bg-white/10 ${
                  check.status === "error"
                    ? "border-rose-500/30 bg-rose-500/5 shadow-[0_0_20px_-5px_rgba(244,63,94,0.1)]"
                    : check.status === "warning"
                      ? "border-amber-500/30 bg-amber-500/5 shadow-[0_0_20px_-5px_rgba(251,191,36,0.1)]"
                      : "border-white/10 bg-black/40 shadow-xl"
                }`}
              >
                <div className="flex flex-col h-full justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-lg bg-white/5 border border-white/10">
                        {ICON_MAP[check.iconName]}
                      </span>
                      {getStatusIcon(check.status)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-100">{check.name}</h3>
                      <p
                        className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2"
                        title={check.description}
                      >
                        {check.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
                      Issues Found
                    </span>
                    <span
                      className={`text-2xl font-bold font-mono ${
                        check.status === "error"
                          ? "text-rose-400"
                          : check.status === "warning"
                            ? "text-amber-400"
                            : "text-emerald-400"
                      }`}
                    >
                      {check.count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mismatch Details (if any) */}
          {integrityChecks?.some((c) => c.details && c.details.length > 0) && (
            <div className="glass-panel p-6 rounded-2xl border border-rose-500/20 bg-rose-950/10 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-full bg-rose-500/10 border border-rose-500/20 animate-pulse">
                  <AlertTriangle className="h-6 w-6 text-rose-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-rose-200">Violation Details</h2>
                  <p className="text-rose-300/60 text-sm">
                    Detailed breakdown of detected inconsistencies
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                {integrityChecks
                  ?.filter((c) => c.details && c.details.length > 0)
                  .map((check) => (
                    <div key={check.name} className="space-y-3">
                      <h4 className="font-medium text-sm flex items-center gap-2 text-rose-300">
                        {ICON_MAP[check.iconName]}
                        {check.name}
                      </h4>
                      <div className="rounded-xl border border-rose-500/10 overflow-hidden bg-black/20">
                        <Table>
                          <TableHeader className="bg-rose-500/5">
                            <TableRow className="border-rose-500/10 hover:bg-transparent">
                              {check.details?.[0] &&
                                Object.keys(check.details[0]).map((key) => (
                                  <TableHead
                                    key={key}
                                    className="text-xs text-rose-300/70 font-semibold uppercase"
                                  >
                                    {key.replace(/_/g, " ")}
                                  </TableHead>
                                ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {check.details?.slice(0, 5).map((row, idx) => (
                              <TableRow key={idx} className="border-rose-500/5 hover:bg-rose-500/5">
                                {Object.values(row).map((val, i) => (
                                  <TableCell key={i} className="text-xs font-mono text-rose-200">
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
                        <p className="text-xs text-rose-400/50 italic pl-1">
                          Showing 5 of {check.details.length} issues
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Run History Tab (P1) */}
        <TabsContent value="history">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5 text-indigo-400" />
              <h2 className="text-xl font-semibold text-white">Integrity Run History</h2>
            </div>

            <div className="rounded-xl border border-white/5 overflow-hidden bg-white/5">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-zinc-400">Time</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Violations</TableHead>
                    <TableHead className="text-zinc-400">Critical</TableHead>
                    <TableHead className="text-zinc-400">Runtime</TableHead>
                    <TableHead className="text-zinc-400">Triggered By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                        Loading history...
                      </TableCell>
                    </TableRow>
                  ) : integrityRuns && integrityRuns.length > 0 ? (
                    integrityRuns.map((run) => (
                      <TableRow
                        key={run.id}
                        className="border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <TableCell className="text-sm text-zinc-300">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {format(new Date(run.run_at), "MMM d, yyyy")}
                            </span>
                            <span className="text-xs text-zinc-500 font-mono">
                              {format(new Date(run.run_at), "HH:mm:ss")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${getStatusBadgeClass(run.status)} flex w-fit items-center gap-1`}
                          >
                            {run.status === "pass" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            <span className="capitalize">{run.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-zinc-300">
                          {run.violation_count}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              run.critical_count > 0
                                ? "text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20"
                                : "text-zinc-500"
                            }
                          >
                            {run.critical_count}
                          </span>
                        </TableCell>
                        <TableCell className="text-zinc-500 font-mono text-xs">
                          {run.runtime_ms ? `${run.runtime_ms}ms` : "-"}
                        </TableCell>
                        <TableCell className="text-zinc-400 text-sm">{run.triggered_by}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <p className="text-zinc-500">No integrity runs recorded yet.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Audit Events Tab */}
        <TabsContent value="audit">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="h-5 w-5 text-indigo-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Recent Audit Events</h2>
                <p className="text-sm text-zinc-400">Last 10 logged system events</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 overflow-hidden bg-white/5">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-zinc-400">Action</TableHead>
                    <TableHead className="text-zinc-400">Entity</TableHead>
                    <TableHead className="text-zinc-400">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEvents && auditEvents.length > 0 ? (
                    auditEvents.map((event) => (
                      <TableRow
                        key={event.id}
                        className="border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <TableCell className="font-medium text-emerald-400 font-mono text-xs uppercase tracking-wide bg-emerald-500/5 w-[200px]">
                          {event.action}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          <span className="font-semibold text-zinc-200">{event.entity}</span>
                          {event.entity_id && (
                            <span className="text-zinc-600 text-xs ml-2 font-mono">
                              ID: {event.entity_id.slice(0, 8)}...
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-sm">
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-zinc-500">
                        No recent audit events
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
