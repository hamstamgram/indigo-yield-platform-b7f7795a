import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Mail,
  Send,
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  RotateCcw,
  Ban,
  CheckSquare,
  Loader2,
  Search,
  Users,
  FileText,
  Inbox,
  SendHorizonal,
  CheckCheck,
  XOctagon,
  ArrowLeft,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

interface DeliveryRecord {
  id: string;
  statement_id: string;
  investor_id: string;
  period_id: string;
  recipient_email: string;
  subject: string;
  status: string;
  channel: string;
  attempt_count: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  error_code: string | null;
  provider_message_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

interface DeliveryStats {
  total: number;
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  cancelled: number;
  skipped: number;
  statements_generated: number;
  investors_in_scope: number;
  oldest_queued_at: string | null;
  stuck_sending: number;
}

interface Period {
  id: string;
  period_name: string;
  year: number;
  month: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  queued: { label: "Queued", variant: "secondary", icon: Clock },
  sending: { label: "Sending", variant: "outline", icon: Loader2 },
  sent: { label: "Sent", variant: "default", icon: CheckCircle },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  cancelled: { label: "Cancelled", variant: "outline", icon: Ban },
  skipped: { label: "Skipped", variant: "outline", icon: AlertTriangle },
};

export default function ReportDeliveryCenter() {
  const queryClient = useQueryClient();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRecord | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; ids: string[] } | null>(null);

  // Fetch periods
  const { data: periods = [] } = useQuery({
    queryKey: ["statement-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("statement_periods")
        .select("id, period_name, year, month")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return data as Period[];
    },
  });

  // Auto-select most recent period
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  // Fetch delivery stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["delivery-stats", selectedPeriodId],
    queryFn: async () => {
      if (!selectedPeriodId) return null;
      const { data, error } = await supabase.rpc("get_delivery_stats", {
        p_period_id: selectedPeriodId,
      });
      if (error) throw error;
      return data as unknown as DeliveryStats;
    },
    enabled: !!selectedPeriodId,
  });

  // Fetch deliveries
  const { data: deliveries = [], isLoading: deliveriesLoading, refetch: refetchDeliveries } = useQuery({
    queryKey: ["deliveries", selectedPeriodId, statusFilter, channelFilter, searchQuery],
    queryFn: async () => {
      if (!selectedPeriodId) return [];
      
      let query = supabase
        .from("statement_email_delivery")
        .select(`
          *,
          profiles:investor_id (first_name, last_name, email)
        `)
        .eq("period_id", selectedPeriodId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.or(`status.eq.${statusFilter},status.eq.${statusFilter.toUpperCase()}`);
      }
      if (channelFilter !== "all") {
        query = query.eq("channel", channelFilter);
      }
      if (searchQuery) {
        query = query.or(`recipient_email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as DeliveryRecord[];
    },
    enabled: !!selectedPeriodId,
  });

  // Mutations
  const queueMutation = useMutation({
    mutationFn: async ({ periodId, channel }: { periodId: string; channel: string }) => {
      const { data, error } = await supabase.rpc("queue_statement_deliveries", {
        p_period_id: periodId,
        p_channel: channel,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const result = data as { queued_count: number; skipped_missing_email: number; already_exists_count: number };
      toast.success(`Queued ${result.queued_count} deliveries`, {
        description: `${result.already_exists_count} already existed, ${result.skipped_missing_email} skipped (no email)`,
      });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
    },
    onError: (error) => {
      toast.error(`Failed to queue: ${error.message}`);
    },
  });

  const processMutation = useMutation({
    mutationFn: async ({ periodId, batchSize }: { periodId: string; batchSize: number }) => {
      const { data, error } = await supabase.functions.invoke("process-report-delivery-queue", {
        body: { period_id: periodId, batch_size: batchSize },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Queue processed", {
        description: `${data.sent} sent, ${data.failed} failed`,
      });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
    },
    onError: (error) => {
      toast.error(`Failed to process: ${error.message}`);
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (deliveryId: string) => {
      const { data, error } = await supabase.rpc("retry_delivery", {
        p_delivery_id: deliveryId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Delivery re-queued for retry");
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
    },
    onError: (error) => {
      toast.error(`Failed to retry: ${error.message}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (deliveryId: string) => {
      const { data, error } = await supabase.rpc("cancel_delivery", {
        p_delivery_id: deliveryId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Delivery cancelled");
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
    },
    onError: (error) => {
      toast.error(`Failed to cancel: ${error.message}`);
    },
  });

  const markSentMutation = useMutation({
    mutationFn: async ({ deliveryId, note }: { deliveryId: string; note: string }) => {
      const { data, error } = await supabase.rpc("mark_sent_manually", {
        p_delivery_id: deliveryId,
        p_note: note,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Marked as sent");
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
      setSelectedDelivery(null);
    },
    onError: (error) => {
      toast.error(`Failed to mark sent: ${error.message}`);
    },
  });

  const retryAllFailed = async () => {
    const failedDeliveries = deliveries.filter(d => d.status.toLowerCase() === "failed");
    for (const d of failedDeliveries) {
      await retryMutation.mutateAsync(d.id);
    }
    setConfirmAction(null);
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status.toLowerCase()] || STATUS_CONFIG.queued;
  };

  const getInvestorName = (delivery: DeliveryRecord) => {
    if (delivery.profiles) {
      const name = [delivery.profiles.first_name, delivery.profiles.last_name]
        .filter(Boolean)
        .join(" ");
      return name || delivery.profiles.email;
    }
    return delivery.recipient_email;
  };

  // Calculated metrics
  const remaining = stats ? stats.statements_generated - stats.sent : 0;
  const progressPercent = stats && stats.statements_generated > 0 
    ? Math.round((stats.sent / stats.statements_generated) * 100) 
    : 0;

  return (
    <div className="space-y-6">
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
        <Button
          variant="outline"
          onClick={() => refetchDeliveries()}
          disabled={deliveriesLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${deliveriesLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

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
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.period_name}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
                <Input
                  placeholder="Search email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress & KPI Section */}
      {selectedPeriodId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                {stats?.oldest_queued_at && (
                  <p className="text-xs text-muted-foreground">
                    Oldest queued: {formatDistanceToNow(new Date(stats.oldest_queued_at), { addSuffix: true })}
                  </p>
                )}
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

            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <XOctagon className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">Failed</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{stats?.failed ?? 0}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Action Panel */}
      {selectedPeriodId && (
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
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => queueMutation.mutate({ periodId: selectedPeriodId, channel: "email" })}
                disabled={queueMutation.isPending}
              >
                {queueMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Queue Remaining Statements
              </Button>

              <Button
                variant="secondary"
                onClick={() => processMutation.mutate({ periodId: selectedPeriodId, batchSize: 25 })}
                disabled={processMutation.isPending || (stats?.queued ?? 0) === 0}
              >
                {processMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <SendHorizonal className="h-4 w-4 mr-2" />
                )}
                Send Queued Now ({stats?.queued ?? 0})
              </Button>

              <Button
                variant="outline"
                onClick={() => setConfirmAction({ type: "retry_all", ids: [] })}
                disabled={(stats?.failed ?? 0) === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry All Failed ({stats?.failed ?? 0})
              </Button>

              {(stats?.stuck_sending ?? 0) > 0 && (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    const { data, error } = await supabase.rpc("requeue_stale_sending", {
                      p_period_id: selectedPeriodId,
                      p_minutes: 15,
                    });
                    if (error) {
                      toast.error(`Failed: ${error.message}`);
                    } else {
                      toast.success(`Requeued ${(data as { requeued_count: number }).requeued_count} stuck deliveries`);
                      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
                      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
                    }
                  }}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Unstick Sending ({stats?.stuck_sending ?? 0})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
          {deliveriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No deliveries found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Use "Queue Remaining Statements" to create delivery records
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Attempts</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => {
                    const statusConfig = getStatusConfig(delivery.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <TableRow key={delivery.id} className="group">
                        <TableCell className="font-medium">
                          {getInvestorName(delivery)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                          {delivery.recipient_email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {delivery.channel.replace("_", " ")}
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
                          {delivery.sent_at
                            ? format(new Date(delivery.sent_at), "MMM d, HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                          {delivery.error_message ? (
                            <span
                              className="text-xs text-destructive truncate cursor-pointer hover:underline block"
                              title={delivery.error_message}
                              onClick={() => setSelectedDelivery(delivery)}
                            >
                              {delivery.error_message.slice(0, 30)}...
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedDelivery(delivery)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {["failed", "cancelled"].includes(delivery.status.toLowerCase()) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => retryMutation.mutate(delivery.id)}
                                disabled={retryMutation.isPending}
                                title="Retry"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            {["queued", "failed"].includes(delivery.status.toLowerCase()) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => cancelMutation.mutate(delivery.id)}
                                disabled={cancelMutation.isPending}
                                title="Cancel"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
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
          {selectedDelivery && (
            <div className="space-y-4">
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
                {selectedDelivery.sent_at && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Sent At</Label>
                    <p className="font-medium text-green-600">
                      {format(new Date(selectedDelivery.sent_at), "PPpp")}
                    </p>
                  </div>
                )}
                {selectedDelivery.error_message && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Error</Label>
                    <div className="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-sm text-destructive font-mono">
                        {selectedDelivery.error_code && (
                          <span className="font-bold">[{selectedDelivery.error_code}] </span>
                        )}
                        {selectedDelivery.error_message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedDelivery && ["failed", "cancelled", "queued"].includes(selectedDelivery.status.toLowerCase()) && (
              <Button
                variant="outline"
                onClick={() => markSentMutation.mutate({ deliveryId: selectedDelivery.id, note: "Manually confirmed sent" })}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Mark as Sent
              </Button>
            )}
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
            <AlertDialogAction
              onClick={() => {
                if (confirmAction?.type === "retry_all") {
                  retryAllFailed();
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
