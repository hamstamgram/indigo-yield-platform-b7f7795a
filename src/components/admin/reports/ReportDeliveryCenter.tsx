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
  RefreshCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { TestEmailSection } from "./TestEmailSection";

interface DeliveryRecord {
  id: string;
  statement_id: string;
  investor_id: string;
  period_id: string;
  recipient_email: string;
  subject: string;
  status: string;
  channel: string;
  delivery_mode: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  error_code: string | null;
  provider_message_id: string | null;
  provider: string | null;
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
  delivered: { label: "Delivered", variant: "default", icon: CheckCheck },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  bounced: { label: "Bounced", variant: "destructive", icon: XOctagon },
  complained: { label: "Complained", variant: "destructive", icon: AlertTriangle },
  cancelled: { label: "Cancelled", variant: "outline", icon: Ban },
  skipped: { label: "Skipped", variant: "outline", icon: AlertTriangle },
};

type DeliveryMode = "email_html" | "pdf_attachment" | "link_only" | "hybrid";

const DELIVERY_MODES: { value: DeliveryMode; label: string; description: string }[] = [
  { value: "email_html", label: "HTML Email", description: "Full report in email body" },
  { value: "link_only", label: "Link Only", description: "Email with link to view report" },
  { value: "hybrid", label: "HTML + Link", description: "Full report with view link" },
  { value: "pdf_attachment", label: "PDF Attachment", description: "Report as PDF attachment (coming soon)" },
];

export default function ReportDeliveryCenter() {
  const queryClient = useQueryClient();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [deliveryModeFilter, setDeliveryModeFilter] = useState<string>("all");
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState<DeliveryMode>("email_html");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRecord | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; ids: string[] } | null>(null);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number; sent: number; failed: number } | null>(null);

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
    queryKey: ["deliveries", selectedPeriodId, statusFilter, channelFilter, deliveryModeFilter, searchQuery],
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
      if (deliveryModeFilter !== "all") {
        query = query.eq("delivery_mode", deliveryModeFilter);
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

  // Send via MailerSend
  const sendViaMutation = useMutation({
    mutationFn: async ({ deliveryId, deliveryMode }: { deliveryId: string; deliveryMode: DeliveryMode }) => {
      const { data, error } = await supabase.functions.invoke("send-report-mailersend", {
        body: { delivery_id: deliveryId, delivery_mode: deliveryMode },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Report sent", {
        description: `Message ID: ${data.message_id?.slice(0, 12)}...`,
      });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
    },
    onError: (error) => {
      toast.error(`Failed to send: ${error.message}`);
    },
  });

  // Batch send via MailerSend
  const processMutation = useMutation({
    mutationFn: async ({ periodId, deliveryMode }: { periodId: string; deliveryMode: DeliveryMode }) => {
      // Get queued deliveries for period
      const { data: queued, error: queryError } = await supabase
        .from("statement_email_delivery")
        .select("id")
        .eq("period_id", periodId)
        .or("status.eq.queued,status.eq.QUEUED")
        .limit(25);
      
      if (queryError) throw queryError;
      if (!queued || queued.length === 0) {
        return { sent: 0, failed: 0, total: 0 };
      }

      setSendProgress({ current: 0, total: queued.length, sent: 0, failed: 0 });
      
      let sent = 0;
      let failed = 0;
      
      // Process sequentially to avoid rate limits
      for (let i = 0; i < queued.length; i++) {
        const delivery = queued[i];
        try {
          const { error } = await supabase.functions.invoke("send-report-mailersend", {
            body: { delivery_id: delivery.id, delivery_mode: deliveryMode },
          });
          if (error) throw error;
          sent++;
        } catch {
          failed++;
        }
        setSendProgress({ current: i + 1, total: queued.length, sent, failed });
      }
      
      setSendProgress(null);
      return { sent, failed, total: queued.length };
    },
    onSuccess: (data) => {
      toast.success("Queue processed via MailerSend", {
        description: `${data.sent} sent, ${data.failed} failed`,
      });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
    },
    onError: (error) => {
      setSendProgress(null);
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

  // Refresh delivery status mutation
  const refreshStatusMutation = useMutation({
    mutationFn: async (deliveryId: string) => {
      const { data, error } = await supabase.functions.invoke("refresh-delivery-status", {
        body: { delivery_id: deliveryId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.status_changed) {
        toast.success(`Status updated: ${data.old_status} → ${data.new_status}`);
        queryClient.invalidateQueries({ queryKey: ["deliveries"] });
        queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
      } else {
        toast.info("Status unchanged", {
          description: `Current status: ${data.new_status}`,
        });
      }
    },
    onError: (error) => {
      toast.error(`Failed to refresh: ${error.message}`);
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
        <div className="space-y-4">
          {/* Test Email Section */}
          <TestEmailSection 
            selectedPeriodId={selectedPeriodId}
            selectedDeliveryMode={selectedDeliveryMode}
          />
          
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
              {/* Delivery Mode Selector */}
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium min-w-fit">Delivery Mode:</Label>
                <Select value={selectedDeliveryMode} onValueChange={(v) => setSelectedDeliveryMode(v as DeliveryMode)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_MODES.map((mode) => (
                      <SelectItem 
                        key={mode.value} 
                        value={mode.value}
                        disabled={mode.value === "pdf_attachment"}
                      >
                        <div className="flex flex-col">
                          <span>{mode.label}</span>
                          <span className="text-xs text-muted-foreground">{mode.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Progress Bar */}
              {sendProgress && (
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span>Sending reports via MailerSend...</span>
                    <span>{sendProgress.current} / {sendProgress.total}</span>
                  </div>
                  <Progress value={(sendProgress.current / sendProgress.total) * 100} className="h-2" />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="text-green-600">✓ Sent: {sendProgress.sent}</span>
                    <span className="text-destructive">✗ Failed: {sendProgress.failed}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
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
                  onClick={() => processMutation.mutate({ periodId: selectedPeriodId, deliveryMode: selectedDeliveryMode })}
                  disabled={processMutation.isPending || (stats?.queued ?? 0) === 0}
                >
                  {processMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <SendHorizonal className="h-4 w-4 mr-2" />
                  )}
                  Send via MailerSend ({stats?.queued ?? 0})
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
            </div>
          </CardContent>
        </Card>
        </div>
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
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Attempts</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Delivered</TableHead>
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
                        <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                          {delivery.recipient_email}
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
                          {delivery.sent_at
                            ? format(new Date(delivery.sent_at), "MMM d, HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {delivery.delivered_at
                            ? format(new Date(delivery.delivered_at), "MMM d, HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell className="max-w-[120px]">
                          {delivery.error_message ? (
                            <span
                              className="text-xs text-destructive truncate cursor-pointer hover:underline block"
                              title={delivery.error_message}
                              onClick={() => setSelectedDelivery(delivery)}
                            >
                              {delivery.error_message.slice(0, 25)}...
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Send button for queued items */}
                            {["queued"].includes(delivery.status.toLowerCase()) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => sendViaMutation.mutate({ 
                                  deliveryId: delivery.id, 
                                  deliveryMode: selectedDeliveryMode 
                                })}
                                disabled={sendViaMutation.isPending}
                                title="Send via MailerSend"
                              >
                                <SendHorizonal className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Refresh status for sent items */}
                            {["sent", "sending"].includes(delivery.status.toLowerCase()) && delivery.provider_message_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => refreshStatusMutation.mutate(delivery.id)}
                                disabled={refreshStatusMutation.isPending}
                                title="Refresh delivery status from MailerSend"
                              >
                                <RefreshCcw className={`h-4 w-4 ${refreshStatusMutation.isPending ? 'animate-spin' : ''}`} />
                              </Button>
                            )}
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
                                onClick={() => sendViaMutation.mutate({ 
                                  deliveryId: delivery.id, 
                                  deliveryMode: selectedDeliveryMode 
                                })}
                                disabled={sendViaMutation.isPending}
                                title="Resend via MailerSend"
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
                  <div>
                    <Label className="text-muted-foreground text-xs">Sent At</Label>
                    <p className="font-medium text-blue-600">
                      {format(new Date(selectedDelivery.sent_at), "PPpp")}
                    </p>
                  </div>
                )}
                {selectedDelivery.delivered_at && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Delivered At</Label>
                    <p className="font-medium text-green-600">
                      {format(new Date(selectedDelivery.delivered_at), "PPpp")}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground text-xs">Delivery Mode</Label>
                  <p className="font-medium capitalize">{selectedDelivery.delivery_mode?.replace("_", " ") || "email"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Provider</Label>
                  <p className="font-medium capitalize">{selectedDelivery.provider || "resend"}</p>
                </div>
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
