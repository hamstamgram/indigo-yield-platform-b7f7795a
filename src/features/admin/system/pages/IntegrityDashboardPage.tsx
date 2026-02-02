/**
 * Admin Integrity Dashboard - 16-Check Invariant Suite
 * Comprehensive view of all data integrity checks via run_invariant_checks() RPC
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
import { useAuditEvents, useInvariantChecks } from "@/hooks/data";
import { useIntegrityRuns, useAdminAlerts, useAcknowledgeAlert } from "@/hooks/data";
import { useAuth } from "@/services/auth";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Activity,
  Play,
  Clock,
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Database,
  Users,
  Calendar,
  Lock,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import type { InvariantSuiteResult, InvariantCheckResult } from "@/services/admin/integrityService";

const CATEGORY_META: Record<string, { icon: React.ReactNode; badgeClass: string; label: string }> =
  {
    Core: {
      icon: <Database className="h-5 w-5" />,
      badgeClass: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      label: "Core Integrity",
    },
    IB: {
      icon: <Users className="h-5 w-5" />,
      badgeClass: "bg-violet-500/10 border-violet-500/20 text-violet-400",
      label: "IB Consistency",
    },
    Temporal: {
      icon: <Calendar className="h-5 w-5" />,
      badgeClass: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      label: "Temporal Checks",
    },
    Security: {
      icon: <Lock className="h-5 w-5" />,
      badgeClass: "bg-rose-500/10 border-rose-500/20 text-rose-400",
      label: "Security Checks",
    },
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
    <div
      className={`rounded-xl border backdrop-blur-xl transition-all duration-300 ${
        check.passed
          ? "border-white/10 bg-black/40"
          : "border-rose-500/30 bg-rose-500/5 shadow-[0_0_20px_-5px_rgba(244,63,94,0.15)]"
      }`}
    >
      <button
        className="w-full p-4 flex items-center gap-3 text-left"
        onClick={() => hasViolations && setExpanded(!expanded)}
        disabled={!hasViolations}
      >
        {/* Status icon */}
        {check.passed ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
        )}

        {/* Name + violation count */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-zinc-100 truncate">{check.name}</p>
          {!check.passed && (
            <p className="text-xs text-rose-400 mt-0.5">
              {check.violation_count} violation{check.violation_count !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Badge */}
        <Badge
          className={`shrink-0 text-xs px-2 py-0.5 border ${
            check.passed
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}
        >
          {check.passed ? "PASS" : "FAIL"}
        </Badge>

        {/* Expand chevron */}
        {hasViolations && (
          <span className="shrink-0 text-zinc-500">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        )}
      </button>

      {/* Expanded violation details */}
      {expanded && hasViolations && (
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-rose-500/10 overflow-hidden bg-black/20">
            <Table>
              <TableHeader className="bg-rose-500/5">
                <TableRow className="border-rose-500/10 hover:bg-transparent">
                  {Object.keys(check.violations[0]).map((key) => (
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
                {check.violations.slice(0, 10).map((row, idx) => (
                  <TableRow key={idx} className="border-rose-500/5 hover:bg-rose-500/5">
                    {Object.values(row).map((val, i) => (
                      <TableCell key={i} className="text-xs font-mono text-rose-200">
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
            <p className="text-xs text-rose-400/50 italic mt-2 pl-1">
              Showing 10 of {check.violations.length} violations
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function IntegrityDashboardPage() {
  const { user } = useAuth();

  // Legacy hooks (still used for audit events tab)
  const { events: auditEvents } = useAuditEvents(10);

  // P1 hooks (run history, alerts)
  const { data: integrityRuns, isLoading: runsLoading } = useIntegrityRuns(20);
  const { data: alerts } = useAdminAlerts(10, false);
  const acknowledgeAlert = useAcknowledgeAlert();

  // New: 16-check invariant suite
  const invariantMutation = useInvariantChecks();
  const invariantResult = invariantMutation.data as InvariantSuiteResult | undefined;

  const handleRunFullCheck = () => {
    invariantMutation.mutate();
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    if (user?.id) {
      acknowledgeAlert.mutate({ alertId, userId: user.id });
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ok":
      case "pass":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_-4px_rgba(16,185,129,0.3)]";
      case "warning":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_-4px_rgba(251,191,36,0.3)]";
      case "error":
      case "fail":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_-4px_rgba(244,63,94,0.3)]";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
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

  const grouped = invariantResult ? groupChecksByCategory(invariantResult.checks) : null;

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
            16-check invariant suite — database consistency and security
          </p>
        </div>
        <div className="flex items-center gap-3">
          {invariantResult && (
            <Badge
              className={`${getStatusBadgeClass(invariantResult.failed === 0 ? "pass" : "fail")} text-sm px-4 py-1.5 h-9 rounded-full border`}
            >
              {invariantResult.failed === 0 ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {invariantResult.passed}/{invariantResult.total_checks} Passed
            </Badge>
          )}
          <Button
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border-0 transition-all font-medium"
            size="sm"
            onClick={handleRunFullCheck}
            disabled={invariantMutation.isPending}
          >
            <Play
              className={`h-4 w-4 mr-2 ${invariantMutation.isPending ? "animate-pulse" : ""}`}
            />
            {invariantMutation.isPending ? "Running..." : "Run Full Check"}
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
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
            Invariant Checks
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

        {/* Invariant Checks Tab */}
        <TabsContent value="checks" className="space-y-6">
          {!invariantResult && !invariantMutation.isPending && (
            <div className="glass-panel p-12 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl text-center">
              <Shield className="h-12 w-12 text-indigo-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">No check results yet</h3>
              <p className="text-zinc-500 mb-6 max-w-md mx-auto">
                Click "Run Full Check" to execute all 16 invariant checks against the live database
              </p>
              <Button
                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border-0"
                onClick={handleRunFullCheck}
              >
                <Play className="h-4 w-4 mr-2" />
                Run Full Check
              </Button>
            </div>
          )}

          {invariantMutation.isPending && (
            <div className="glass-panel p-12 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl text-center">
              <div className="animate-spin h-10 w-10 border-2 border-indigo-400 border-t-transparent rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-300">
                Running 16 invariant checks...
              </h3>
              <p className="text-zinc-500 mt-1">
                Checking core integrity, IB consistency, temporal rules, and security
              </p>
            </div>
          )}

          {invariantResult && grouped && (
            <>
              {/* Summary bar */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="glass-card p-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl text-center">
                  <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                    Total Checks
                  </p>
                  <p className="text-2xl font-bold font-mono text-zinc-100">
                    {invariantResult.total_checks}
                  </p>
                </div>
                <div className="glass-card p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl text-center">
                  <p className="text-xs uppercase tracking-wider text-emerald-500 mb-1">Passed</p>
                  <p className="text-2xl font-bold font-mono text-emerald-400">
                    {invariantResult.passed}
                  </p>
                </div>
                <div
                  className={`glass-card p-4 rounded-xl border backdrop-blur-xl text-center ${
                    invariantResult.failed > 0
                      ? "border-rose-500/20 bg-rose-500/5"
                      : "border-white/10 bg-black/40"
                  }`}
                >
                  <p
                    className={`text-xs uppercase tracking-wider mb-1 ${
                      invariantResult.failed > 0 ? "text-rose-500" : "text-zinc-500"
                    }`}
                  >
                    Failed
                  </p>
                  <p
                    className={`text-2xl font-bold font-mono ${
                      invariantResult.failed > 0 ? "text-rose-400" : "text-zinc-400"
                    }`}
                  >
                    {invariantResult.failed}
                  </p>
                </div>
                <div className="glass-card p-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl text-center">
                  <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Run At</p>
                  <p className="text-sm font-mono text-zinc-300">
                    {format(new Date(invariantResult.run_at), "HH:mm:ss")}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {format(new Date(invariantResult.run_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              {/* Check groups by category */}
              {Object.entries(grouped).map(([category, checks]) => {
                const meta = CATEGORY_META[category] || {
                  icon: <Database className="h-5 w-5" />,
                  badgeClass: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400",
                  label: category,
                };
                const allPassed = checks.every((c) => c.passed);

                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-3 px-1">
                      <span className={`p-2 rounded-lg border ${meta.badgeClass}`}>
                        {meta.icon}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-zinc-200">{meta.label}</h3>
                        <p className="text-xs text-zinc-500">
                          {checks.length} check{checks.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge
                        className={`text-xs px-3 py-0.5 border ${
                          allPassed
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
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
        </TabsContent>

        {/* Run History Tab */}
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
