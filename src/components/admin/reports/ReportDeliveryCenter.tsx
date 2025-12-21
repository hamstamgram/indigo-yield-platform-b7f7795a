import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
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
  Filter,
  Users,
  FileText,
  Inbox,
  SendHorizonal,
  CheckCheck,
  XOctagon,
} from "lucide-react";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
        // Use case-insensitive comparison for status
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

  // Queue deliveries mutation
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
      toast.success(`Queued ${result.queued_count} deliveries. ${result.already_exists_count} already existed, ${result.skipped_missing_email} skipped (no email).`);
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
    },
    onError: (error) => {
      toast.error(`Failed to queue: ${error.message}`);
    },
  });

  // Process queue mutation
  const processMutation = useMutation({
    mutationFn: async ({ periodId, batchSize }: { periodId: string; batchSize: number }) => {
      const { data, error } = await supabase.functions.invoke("process-report-delivery-queue", {
        body: { period_id: periodId, batch_size: batchSize },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Processed: ${data.sent} sent, ${data.failed} failed`);
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
    },
    onError: (error) => {
      toast.error(`Failed to process: ${error.message}`);
    },
  });

  // Retry mutation
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

  // Cancel mutation
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

  // Mark sent mutation
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

  // Bulk retry failed
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

  const remaining = stats ? stats.statements_generated - stats.sent : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Report Delivery Center</h1>
          <p className="text-muted-foreground">
            Track and manage statement delivery to investors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchDeliveries()}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-64">
              <Label>Statement Period</Label>
              <Select
                value={selectedPeriodId}
                onValueChange={setSelectedPeriodId}
              >
                <SelectTrigger>
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

            <div className="w-40">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="sending">Sending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Label>Channel</Label>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="download_link">Download Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {selectedPeriodId && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Investors</span>
              </div>
              <p className="text-2xl font-bold">{stats?.investors_in_scope ?? "-"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Generated</span>
              </div>
              <p className="text-2xl font-bold">{stats?.statements_generated ?? "-"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Queued</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats?.queued ?? 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <SendHorizonal className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Sending</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats?.sending ?? 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <CheckCheck className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Sent</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats?.sent ?? 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <XOctagon className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Failed</span>
              </div>
              <p className="text-2xl font-bold text-destructive">{stats?.failed ?? 0}</p>
            </CardContent>
          </Card>

          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Remaining</span>
              </div>
              <p className="text-2xl font-bold text-primary">{remaining}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedPeriodId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Actions</CardTitle>
            <CardDescription>
              Manage delivery queue for this period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => queueMutation.mutate({ periodId: selectedPeriodId, channel: "email" })}
                disabled={queueMutation.isPending}
              >
                {queueMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                Queue Remaining
              </Button>

              <Button
                variant="secondary"
                onClick={() => processMutation.mutate({ periodId: selectedPeriodId, batchSize: 25 })}
                disabled={processMutation.isPending || (stats?.queued ?? 0) === 0}
              >
                {processMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
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
        <CardHeader>
          <CardTitle className="text-lg">Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          {deliveriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No deliveries found. Use "Queue Remaining" to create delivery records.
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
                    <TableHead>Attempts</TableHead>
                    <TableHead>Last Attempt</TableHead>
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
                      <TableRow key={delivery.id}>
                        <TableCell className="font-medium">
                          {getInvestorName(delivery)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {delivery.recipient_email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {delivery.channel.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant} className="gap-1">
                            <StatusIcon className={`h-3 w-3 ${delivery.status.toLowerCase() === 'sending' ? 'animate-spin' : ''}`} />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{delivery.attempt_count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {delivery.last_attempt_at
                            ? format(new Date(delivery.last_attempt_at), "MMM d, HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {delivery.sent_at
                            ? format(new Date(delivery.sent_at), "MMM d, HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {delivery.error_message ? (
                            <span
                              className="text-sm text-destructive truncate cursor-pointer hover:underline"
                              title={delivery.error_message}
                              onClick={() => setSelectedDelivery(delivery)}
                            >
                              {delivery.error_message.slice(0, 40)}...
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
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
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="font-medium capitalize">{selectedDelivery.status}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Channel</Label>
                  <p className="font-medium capitalize">{selectedDelivery.channel}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Attempts</Label>
                  <p className="font-medium">{selectedDelivery.attempt_count}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Provider ID</Label>
                  <p className="font-medium font-mono text-xs">
                    {selectedDelivery.provider_message_id || "-"}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Created At</Label>
                  <p className="font-medium">
                    {format(new Date(selectedDelivery.created_at!), "PPpp")}
                  </p>
                </div>
                {selectedDelivery.sent_at && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Sent At</Label>
                    <p className="font-medium">
                      {format(new Date(selectedDelivery.sent_at), "PPpp")}
                    </p>
                  </div>
                )}
                {selectedDelivery.error_message && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Error</Label>
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
                {Object.keys(selectedDelivery.metadata || {}).length > 0 && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Metadata</Label>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-auto max-h-32">
                      {JSON.stringify(selectedDelivery.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
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
