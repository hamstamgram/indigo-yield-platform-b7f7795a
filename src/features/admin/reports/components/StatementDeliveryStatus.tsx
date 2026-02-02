import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Skeleton } from "@/components/ui";
import { format } from "date-fns";
import {
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Mail,
} from "lucide-react";
import { useDeliveryStatus, useRetryDelivery } from "@/hooks/data";

interface StatementDeliveryStatusProps {
  statementId: string;
  investorId?: string;
  periodId?: string;
  showActions?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ElementType;
    color: string;
  }
> = {
  queued: { label: "Queued", variant: "secondary", icon: Clock, color: "text-yellow-600" },
  sending: { label: "Sending", variant: "outline", icon: Loader2, color: "text-blue-600" },
  sent: { label: "Sent", variant: "default", icon: CheckCircle, color: "text-green-600" },
  failed: { label: "Failed", variant: "destructive", icon: XCircle, color: "text-destructive" },
  cancelled: { label: "Cancelled", variant: "outline", icon: Ban, color: "text-muted-foreground" },
  skipped: { label: "Skipped", variant: "outline", icon: AlertTriangle, color: "text-orange-600" },
};

export function StatementDeliveryStatus({
  statementId,
  investorId,
  periodId,
  showActions = true,
}: StatementDeliveryStatusProps) {
  const {
    data: deliveries,
    isLoading,
    refetch,
  } = useDeliveryStatus(statementId, investorId, periodId);
  const retryMutation = useRetryDelivery();

  const handleRetry = async (deliveryId: string) => {
    await retryMutation.mutateAsync(deliveryId);
    refetch();
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status.toLowerCase()] || STATUS_CONFIG.queued;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Delivery Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!deliveries || deliveries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Delivery Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No delivery records found</p>
            <p className="text-xs mt-1">Statement has not been queued for delivery</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestDelivery = deliveries[0];
  const statusConfig = getStatusConfig(latestDelivery.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Delivery Status
          </span>
          <Badge variant={statusConfig.variant} className="gap-1">
            <StatusIcon
              className={`h-3 w-3 ${latestDelivery.status.toLowerCase() === "sending" ? "animate-spin" : ""}`}
            />
            {statusConfig.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Recipient */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Recipient</span>
          <span
            className="font-medium truncate max-w-[200px]"
            title={latestDelivery.recipient_email}
          >
            {latestDelivery.recipient_email}
          </span>
        </div>

        {/* Channel */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Channel</span>
          <span className="font-medium capitalize">{latestDelivery.channel.replace("_", " ")}</span>
        </div>

        {/* Attempts */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Attempts</span>
          <span className="font-medium">{latestDelivery.attempt_count}</span>
        </div>

        {/* Timestamps */}
        {latestDelivery.sent_at && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sent At</span>
            <span className="font-medium text-green-600">
              {format(new Date(latestDelivery.sent_at), "MMM d, yyyy HH:mm")}
            </span>
          </div>
        )}

        {latestDelivery.failed_at && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Failed At</span>
            <span className="font-medium text-destructive">
              {format(new Date(latestDelivery.failed_at), "MMM d, yyyy HH:mm")}
            </span>
          </div>
        )}

        {/* Error Message */}
        {latestDelivery.error_message && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Error</p>
            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
              {latestDelivery.error_message}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && ["failed", "cancelled"].includes(latestDelivery.status.toLowerCase()) && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleRetry(latestDelivery.id)}
              disabled={retryMutation.isPending}
            >
              <RotateCcw className="h-3 w-3 mr-2" />
              Retry Delivery
            </Button>
          </div>
        )}

        {/* History indicator */}
        {deliveries.length > 1 && (
          <p className="text-xs text-muted-foreground text-center pt-2 border-t">
            {deliveries.length} delivery attempts on record
          </p>
        )}
      </CardContent>
    </Card>
  );
}
