import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge, Input, Label, Progress, SortableTableHead, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Alert, AlertDescription, AlertTitle, TruncatedText } from "@/components/ui";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Mail, Send, RefreshCw, XCircle, CheckCircle, Clock, AlertTriangle, Eye, RotateCcw, Ban, CheckSquare, Loader2, Search, Users, FileText, Inbox, SendHorizonal, CheckCheck, XOctagon, ArrowLeft, TrendingUp, RefreshCcw, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { DeliveryExclusionStats } from "./DeliveryExclusionStats";
import { useSortableColumns } from "@/hooks";

// Import new hooks and types
import { usePeriodsWithCounts, useDeliveryStats, useDeliveries, useDeliveryMutations } from "@/hooks/data";
import type { DeliveryRecord, DeliveryMode, DeliveryFilters } from "@/types/domains/delivery";
import { DELIVERY_MODES } from "@/types/domains/delivery";

// MailerSend trial account limits (typical)
const MAILERSEND_TRIAL_LIMIT = 100;
const STATUS_CONFIG: Record<string, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ElementType;
}> = {
  queued: {
    label: "Queued",
    variant: "secondary",
    icon: Clock
  },
  sending: {
    label: "Sending",
    variant: "outline",
    icon: Loader2
  },
  sent: {
    label: "Sent",
    variant: "default",
    icon: CheckCircle
  },
  delivered: {
    label: "Delivered",
    variant: "default",
    icon: CheckCheck
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    icon: XCircle
  },
  bounced: {
    label: "Bounced",
    variant: "destructive",
    icon: XOctagon
  },
  complained: {
    label: "Complained",
    variant: "destructive",
    icon: AlertTriangle
  },
  cancelled: {
    label: "Cancelled",
    variant: "outline",
    icon: Ban
  },
  skipped: {
    label: "Skipped",
    variant: "outline",
    icon: AlertTriangle
  }
};
export default function ReportDeliveryCenter() {
  // UI State
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [deliveryModeFilter, setDeliveryModeFilter] = useState<string>("all");
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState<DeliveryMode>("email_html");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRecord | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    ids: string[];
  } | null>(null);

  // Build filters object
  const filters: DeliveryFilters = {
    statusFilter,
    channelFilter,
    deliveryModeFilter,
    searchQuery
  };

  // Data hooks
  const {
    periodsWithCounts
  } = usePeriodsWithCounts();
  const {
    stats,
    isLoading: statsLoading
  } = useDeliveryStats(selectedPeriodId);
  const {
    deliveries,
    isLoading: deliveriesLoading,
    refetch: refetchDeliveries
  } = useDeliveries(selectedPeriodId, filters);

  // Mutation hooks
  const mutations = useDeliveryMutations(selectedPeriodId);
  const {
    queueMutation,
    sendViaMutation,
    processMutation,
    retryMutation,
    cancelMutation,
    markSentMutation,
    refreshStatusMutation,
    requeueStaleMutation,
    retryAllFailed,
    sendProgress
  } = mutations;
  const periods = periodsWithCounts;

  // Auto-select period with statements (smart selection)
  useEffect(() => {
    if (periodsWithCounts.length > 0 && !selectedPeriodId) {
      const periodWithStatements = periodsWithCounts.find(p => p.statementCount > 0);
      if (periodWithStatements) {
        setSelectedPeriodId(periodWithStatements.id);
      } else {
        setSelectedPeriodId(periodsWithCounts[0].id);
      }
    }
  }, [periodsWithCounts, selectedPeriodId]);

  // Get selected period's statement count
  const selectedPeriodStatementCount = periodsWithCounts.find(p => p.id === selectedPeriodId)?.statementCount || 0;

  // Sortable columns for the deliveries table
  const {
    sortConfig,
    requestSort,
    sortedData: sortedDeliveries
  } = useSortableColumns(deliveries, {
    column: 'created_at',
    direction: 'desc'
  });
  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status.toLowerCase()] || STATUS_CONFIG.queued;
  };
  const getInvestorName = (delivery: DeliveryRecord) => {
    if (delivery.profiles) {
      const name = [delivery.profiles.first_name, delivery.profiles.last_name].filter(Boolean).join(" ");
      return name || delivery.profiles.email;
    }
    return delivery.recipient_email;
  };
  const handleRetryAllFailed = async () => {
    const failedDeliveries = deliveries.filter(d => d.status.toLowerCase() === "failed");
    await retryAllFailed(failedDeliveries.map(d => d.id));
    setConfirmAction(null);
  };

  // Calculated metrics
  const remaining = stats ? stats.statements_generated - stats.sent : 0;
  const progressPercent = stats && stats.statements_generated > 0 ? Math.round(stats.sent / stats.statements_generated * 100) : 0;
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/investor-reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Report Delivery Center</h1>
            <p className="text-muted-foreground">
              Track and manage statement delivery to investors
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetchDeliveries()} disabled={deliveriesLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${deliveriesLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* MailerSend Quota Guidance Banner */}
      

      {/* Period Selector & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Label className="text-xs text-muted-foreground">Statement Period</Label>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select period..." />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(p => <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        {p.period_name}
                        {p.statementCount > 0 ? <span className="text-muted-foreground text-xs">({p.statementCount} statements)</span> : <span className="text-destructive text-xs">(no statements)</span>}
                      </span>
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="sending">Sending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                  <SelectItem value="complained">Complained</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Channel</Label>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="download_link">Download Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning when period has no statements */}
      {selectedPeriodId && selectedPeriodStatementCount === 0 && <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Statements Generated</AlertTitle>
          <AlertDescription>
            This period has no generated statements. Go to{" "}
            <Link to="/admin/investor-reports" className="underline font-medium">
              Investor Reports
            </Link>{" "}
            to generate statements first, or select a different period.
          </AlertDescription>
        </Alert>}

      {/* Progress & KPI Section */}
      {selectedPeriodId && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Delivery Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-4xl font-bold text-primary">{progressPercent}%</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.sent ?? 0} / {stats?.statements_generated ?? 0}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                {stats?.oldest_queued_at && <p className="text-xs text-muted-foreground">
                    Oldest queued: {formatDistanceToNow(new Date(stats.oldest_queued_at), {
                addSuffix: true
              })}
                  </p>}
              </div>
            </CardContent>
          </Card>

          {/* KPI Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Investors</span>
                </div>
                <p className="text-2xl font-bold">{stats?.investors_in_scope ?? "-"}</p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-500/5 border-yellow-500/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Inbox className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs text-muted-foreground">Queued</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{stats?.queued ?? 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCheck className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Sent</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{stats?.sent ?? 0}</p>
              </CardContent>
            </Card>

            <Card className={`bg-destructive/5 border-destructive/20 ${(stats?.failed ?? 0) > 0 ? 'animate-pulse' : ''}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <XOctagon className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">Failed</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{stats?.failed ?? 0}</p>
              </CardContent>
            </Card>
          </div>
        </div>}

      {/* Exclusion Stats Panel - Shows why emails aren't being sent */}
      {selectedPeriodId && <DeliveryExclusionStats periodId={selectedPeriodId} />}

      {/* Action Panel */}
      {selectedPeriodId && <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5" />
              Delivery Actions
            </CardTitle>
            <CardDescription>
              Manage the delivery queue for this period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Visual Workflow Indicator */}
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${(stats?.statements_generated ?? 0) > 0 ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
                      {(stats?.statements_generated ?? 0) > 0 ? "✓" : "1"}
                    </div>
                    <span className={(stats?.statements_generated ?? 0) > 0 ? "font-medium" : "text-muted-foreground"}>
                      Generate ({stats?.statements_generated ?? 0})
                    </span>
                  </div>
                  <div className="w-8 h-px bg-border" />
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${(stats?.queued ?? 0) > 0 ? "bg-yellow-500 text-white" : (stats?.sent ?? 0) > 0 ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
                      {(stats?.sent ?? 0) > 0 ? "✓" : "2"}
                    </div>
                    <span className={(stats?.queued ?? 0) > 0 || (stats?.sent ?? 0) > 0 ? "font-medium" : "text-muted-foreground"}>
                      Queue ({stats?.queued ?? 0})
                    </span>
                  </div>
                  <div className="w-8 h-px bg-border" />
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${(stats?.sent ?? 0) > 0 ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
                      {(stats?.sent ?? 0) > 0 ? "✓" : "3"}
                    </div>
                    <span className={(stats?.sent ?? 0) > 0 ? "font-medium" : "text-muted-foreground"}>
                      Sent ({stats?.sent ?? 0})
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Mode Selector */}
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium min-w-fit">Delivery Mode:</Label>
                <Select value={selectedDeliveryMode} onValueChange={v => setSelectedDeliveryMode(v as DeliveryMode)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_MODES.map(mode => <SelectItem key={mode.value} value={mode.value}>
                        <div className="flex flex-col">
                          <span>{mode.label}</span>
                          <span className="text-xs text-muted-foreground">{mode.description}</span>
                        </div>
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Progress Bar */}
              {sendProgress && <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span>Sending reports via MailerSend...</span>
                    <span>{sendProgress.current} / {sendProgress.total}</span>
                  </div>
                  <Progress value={sendProgress.current / sendProgress.total * 100} className="h-2" />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="text-green-600">✓ Sent: {sendProgress.sent}</span>
                    <span className="text-destructive">✗ Failed: {sendProgress.failed}</span>
                  </div>
                </div>}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => queueMutation.mutate({
                periodId: selectedPeriodId,
                channel: "email"
              })} disabled={queueMutation.isPending}>
                  {queueMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  Queue Remaining Statements
                </Button>

                <Button variant="secondary" onClick={async () => {
                // Auto-queue first if queue is empty but statements exist
                if ((stats?.queued ?? 0) === 0 && (stats?.statements_generated ?? 0) > 0) {
                  toast.info("Queueing statements first...");
                  await queueMutation.mutateAsync({
                    periodId: selectedPeriodId,
                    channel: "email"
                  });
                  // Small delay to let the queue populate
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                processMutation.mutate({
                  periodId: selectedPeriodId,
                  deliveryMode: selectedDeliveryMode
                });
              }} disabled={processMutation.isPending || queueMutation.isPending || (stats?.statements_generated ?? 0) === 0}>
                  {processMutation.isPending || queueMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <SendHorizonal className="h-4 w-4 mr-2" />}
                  {(stats?.queued ?? 0) > 0 ? `Send via MailerSend (${stats?.queued ?? 0})` : (stats?.statements_generated ?? 0) > 0 ? "Queue & Send via MailerSend" : "No statements to send"}
                </Button>

                <Button variant="outline" onClick={() => setConfirmAction({
                type: "retry_all",
                ids: []
              })} disabled={(stats?.failed ?? 0) === 0}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry All Failed ({stats?.failed ?? 0})
                </Button>

                {(stats?.stuck_sending ?? 0) > 0 && <Button variant="destructive" onClick={() => requeueStaleMutation.mutate({
                periodId: selectedPeriodId,
                minutes: 15
              })} disabled={requeueStaleMutation.isPending}>
                    {requeueStaleMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                    Unstick Sending ({stats?.stuck_sending ?? 0})
                  </Button>}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>}

      {/* Deliveries Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Delivery Records
          </CardTitle>
          <CardDescription>
            {deliveries.length} records shown (max 100)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deliveriesLoading ? <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div> : deliveries.length === 0 ? <div className="text-center py-12">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No deliveries found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Use "Queue Remaining Statements" to create delivery records
              </p>
            </div> : <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead column="profiles.first_name" currentSort={sortConfig} onSort={requestSort}>
                      Investor
                    </SortableTableHead>
                    <SortableTableHead column="recipient_email" currentSort={sortConfig} onSort={requestSort}>
                      Email
                    </SortableTableHead>
                    <SortableTableHead column="delivery_mode" currentSort={sortConfig} onSort={requestSort}>
                      Mode
                    </SortableTableHead>
                    <SortableTableHead column="status" currentSort={sortConfig} onSort={requestSort}>
                      Status
                    </SortableTableHead>
                    <SortableTableHead column="attempt_count" currentSort={sortConfig} onSort={requestSort} className="text-center">
                      Attempts
                    </SortableTableHead>
                    <SortableTableHead column="sent_at" currentSort={sortConfig} onSort={requestSort}>
                      Sent
                    </SortableTableHead>
                    <SortableTableHead column="delivered_at" currentSort={sortConfig} onSort={requestSort}>
                      Delivered
                    </SortableTableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDeliveries.map(delivery => {
                const statusConfig = getStatusConfig(delivery.status);
                const StatusIcon = statusConfig.icon;
                return <TableRow key={delivery.id} className="group">
                        <TableCell className="font-medium max-w-[150px]">
                          <TruncatedText text={getInvestorName(delivery)} />
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <TruncatedText text={delivery.recipient_email} className="text-sm text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {delivery.delivery_mode?.replace("_", " ") || "email"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant} className="gap-1">
                            <StatusIcon className={`h-3 w-3 ${delivery.status.toLowerCase() === 'sending' ? 'animate-spin' : ''}`} />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{delivery.attempt_count}</TableCell>
                        <TableCell className="text-sm">
                          {delivery.sent_at ? format(new Date(delivery.sent_at), "MMM d, HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {delivery.delivered_at ? format(new Date(delivery.delivered_at), "MMM d, HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="max-w-[160px]">
                          {delivery.error_message ? <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded truncate cursor-pointer hover:underline" title={delivery.error_message} onClick={() => setSelectedDelivery(delivery)}>
                              {delivery.error_message.slice(0, 40)}...
                            </div> : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Send button for queued items */}
                            {["queued"].includes(delivery.status.toLowerCase()) && <Button variant="ghost" size="icon" onClick={() => sendViaMutation.mutate({
                        deliveryId: delivery.id,
                        deliveryMode: selectedDeliveryMode
                      })} disabled={sendViaMutation.isPending} title="Send via MailerSend">
                                <SendHorizonal className="h-4 w-4" />
                              </Button>}
                            {/* Refresh status for sent items */}
                            {["sent", "sending"].includes(delivery.status.toLowerCase()) && delivery.provider_message_id && <Button variant="ghost" size="icon" onClick={() => refreshStatusMutation.mutate(delivery.id)} disabled={refreshStatusMutation.isPending} title="Refresh delivery status from MailerSend">
                                <RefreshCcw className={`h-4 w-4 ${refreshStatusMutation.isPending ? 'animate-spin' : ''}`} />
                              </Button>}
                            <Button variant="ghost" size="icon" onClick={() => setSelectedDelivery(delivery)} title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {["failed", "cancelled"].includes(delivery.status.toLowerCase()) && <Button variant="ghost" size="icon" onClick={() => sendViaMutation.mutate({
                        deliveryId: delivery.id,
                        deliveryMode: selectedDeliveryMode
                      })} disabled={sendViaMutation.isPending} title="Resend via MailerSend">
                                <RotateCcw className="h-4 w-4" />
                              </Button>}
                            {["queued", "failed"].includes(delivery.status.toLowerCase()) && <Button variant="ghost" size="icon" onClick={() => cancelMutation.mutate(delivery.id)} disabled={cancelMutation.isPending} title="Cancel">
                                <Ban className="h-4 w-4" />
                              </Button>}
                          </div>
                        </TableCell>
                      </TableRow>;
              })}
                </TableBody>
              </Table>
            </div>}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
            <DialogDescription>
              {selectedDelivery?.recipient_email}
            </DialogDescription>
          </DialogHeader>
          {selectedDelivery && <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <p className="font-medium capitalize">{selectedDelivery.status}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Channel</Label>
                  <p className="font-medium capitalize">{selectedDelivery.channel}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Attempts</Label>
                  <p className="font-medium">{selectedDelivery.attempt_count}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Provider ID</Label>
                  <p className="font-medium font-mono text-xs truncate">
                    {selectedDelivery.provider_message_id || "-"}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground text-xs">Created At</Label>
                  <p className="font-medium">
                    {format(new Date(selectedDelivery.created_at!), "PPpp")}
                  </p>
                </div>
                {selectedDelivery.sent_at && <div>
                    <Label className="text-muted-foreground text-xs">Sent At</Label>
                    <p className="font-medium text-blue-600">
                      {format(new Date(selectedDelivery.sent_at), "PPpp")}
                    </p>
                  </div>}
                {selectedDelivery.delivered_at && <div>
                    <Label className="text-muted-foreground text-xs">Delivered At</Label>
                    <p className="font-medium text-green-600">
                      {format(new Date(selectedDelivery.delivered_at), "PPpp")}
                    </p>
                  </div>}
                <div>
                  <Label className="text-muted-foreground text-xs">Delivery Mode</Label>
                  <p className="font-medium capitalize">{selectedDelivery.delivery_mode?.replace("_", " ") || "email"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Provider</Label>
                  <p className="font-medium capitalize">{selectedDelivery.provider || "resend"}</p>
                </div>
                {selectedDelivery.error_message && <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Error</Label>
                    <div className="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-sm text-destructive font-mono">
                        {selectedDelivery.error_code && <span className="font-bold">[{selectedDelivery.error_code}] </span>}
                        {selectedDelivery.error_message}
                      </p>
                    </div>
                  </div>}
              </div>
            </div>}
          <DialogFooter className="gap-2">
            {selectedDelivery && ["failed", "cancelled", "queued"].includes(selectedDelivery.status.toLowerCase()) && <Button variant="outline" onClick={() => {
            markSentMutation.mutate({
              deliveryId: selectedDelivery.id,
              note: "Manually confirmed sent"
            });
            setSelectedDelivery(null);
          }}>
                <CheckSquare className="h-4 w-4 mr-2" />
                Mark as Sent
              </Button>}
            <Button variant="secondary" onClick={() => setSelectedDelivery(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "retry_all" && `This will requeue all ${stats?.failed ?? 0} failed deliveries. Continue?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
            if (confirmAction?.type === "retry_all") {
              handleRetryAllFailed();
            }
          }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}