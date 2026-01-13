import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  ScrollArea,
} from "@/components/ui";
import { AlertTriangle, AlertCircle, Info, CheckCircle, XCircle, Shield } from "lucide-react";
import {
  useRiskAlerts,
  useAcknowledgeAlert,
  useResolveAlert,
  type RiskAlert,
} from "@/hooks/data/admin/useRiskAlerts";
import { formatDistanceToNow } from "date-fns";

const severityConfig = {
  critical: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    badge: "destructive",
  },
  high: {
    icon: AlertTriangle,
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200",
    badge: "warning",
  },
  medium: {
    icon: AlertCircle,
    color: "text-yellow-600",
    bg: "bg-yellow-50 border-yellow-200",
    badge: "secondary",
  },
  low: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    badge: "outline",
  },
} as const;

const alertTypeLabels: Record<string, string> = {
  CONCENTRATION_RISK: "Concentration Risk",
  LIQUIDITY_RISK: "Liquidity Risk",
  HIGH_YIELD_RATE: "High Yield Rate",
  LARGE_WITHDRAWAL: "Large Withdrawal",
  POSITION_MISMATCH: "Position Mismatch",
  AUM_DISCREPANCY: "AUM Discrepancy",
  UNUSUAL_ACTIVITY: "Unusual Activity",
  COMPLIANCE_WARNING: "Compliance Warning",
};

interface RiskAlertsPanelProps {
  maxAlerts?: number;
  showHeader?: boolean;
}

export function RiskAlertsPanel({ maxAlerts = 5, showHeader = true }: RiskAlertsPanelProps) {
  const { data: alerts, isLoading } = useRiskAlerts(true);
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();

  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const displayedAlerts = alerts?.slice(0, maxAlerts) || [];
  const criticalCount = alerts?.filter((a) => a.severity === "critical").length || 0;
  const highCount = alerts?.filter((a) => a.severity === "high").length || 0;

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert.mutate(alertId);
  };

  const handleResolveClick = (alert: RiskAlert) => {
    setSelectedAlert(alert);
    setResolutionNotes("");
    setResolveDialogOpen(true);
  };

  const handleResolveConfirm = () => {
    if (selectedAlert) {
      resolveAlert.mutate(
        { alertId: selectedAlert.id, notes: resolutionNotes },
        {
          onSuccess: () => {
            setResolveDialogOpen(false);
            setSelectedAlert(null);
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading risk alerts...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        {showHeader && (
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Risk Alerts</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {criticalCount > 0 && <Badge variant="destructive">{criticalCount} Critical</Badge>}
                {highCount > 0 && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    {highCount} High
                  </Badge>
                )}
                {alerts?.length === 0 && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    All Clear
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent className={showHeader ? "" : "pt-4"}>
          {displayedAlerts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>No active risk alerts</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {displayedAlerts.map((alert) => {
                  const config = severityConfig[alert.severity];
                  const Icon = config.icon;

                  return (
                    <div key={alert.id} className={`p-3 rounded-lg border ${config.bg}`}>
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={config.badge as "destructive" | "secondary" | "outline"}
                              className="text-xs"
                            >
                              {alertTypeLabels[alert.alert_type] || alert.alert_type}
                            </Badge>
                            {alert.fund_code && (
                              <Badge variant="outline" className="text-xs">
                                {alert.fund_code}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium">{alert.message}</p>
                          {alert.investor_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Investor: {alert.investor_name}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(alert.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                            <div className="flex gap-2">
                              {!alert.acknowledged && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => handleAcknowledge(alert.id)}
                                  disabled={acknowledgeAlert.isPending}
                                >
                                  Acknowledge
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleResolveClick(alert)}
                              >
                                Resolve
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          {alerts && alerts.length > maxAlerts && (
            <div className="mt-3 text-center">
              <Button variant="link" size="sm">
                View all {alerts.length} alerts
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Risk Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAlert && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedAlert.message}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Type: {alertTypeLabels[selectedAlert.alert_type]}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Resolution Notes</label>
              <Textarea
                placeholder="Describe how this alert was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolveConfirm} disabled={resolveAlert.isPending}>
              {resolveAlert.isPending ? "Resolving..." : "Resolve Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
