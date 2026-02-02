/**
 * ApprovalCard - Individual approval request card
 */

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@/components/ui";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  FileText,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { PendingApproval, ApprovalExpiryStatus } from "@/types/domains/approval";

interface ApprovalCardProps {
  approval: PendingApproval;
  onApprove?: () => void;
  onReject?: () => void;
  canApprove: boolean;
  isOwnRequest?: boolean;
}

function ExpiryBadge({ status }: { status: ApprovalExpiryStatus }) {
  if (!status || status === "VALID") return null;

  if (status === "EXPIRING_SOON") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Expiring Soon
      </Badge>
    );
  }

  if (status === "EXPIRED") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        Expired
      </Badge>
    );
  }

  return null;
}

function ActionTypeBadge({ actionType }: { actionType: string }) {
  const colorMap: Record<string, string> = {
    PERIOD_LOCK: "bg-purple-100 text-purple-800",
    PERIOD_UNLOCK: "bg-purple-100 text-purple-800",
    LARGE_WITHDRAWAL: "bg-red-100 text-red-800",
    LARGE_DEPOSIT: "bg-green-100 text-green-800",
    VOID_TRANSACTION: "bg-orange-100 text-orange-800",
    STAGING_PROMOTION: "bg-blue-100 text-blue-800",
    RECONCILIATION_FINALIZE: "bg-indigo-100 text-indigo-800",
    FEE_STRUCTURE_CHANGE: "bg-yellow-100 text-yellow-800",
  };

  const colorClass = colorMap[actionType] || "bg-gray-100 text-gray-800";

  return (
    <Badge variant="outline" className={colorClass}>
      {actionType.replace(/_/g, " ")}
    </Badge>
  );
}

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  canApprove,
  isOwnRequest = false,
}: ApprovalCardProps) {
  const requestedAt = new Date(approval.requested_at);
  const expiresAt = approval.expires_at ? new Date(approval.expires_at) : null;

  return (
    <Card
      className={approval.expiry_status === "EXPIRING_SOON" ? "border-red-300 bg-red-50/50" : ""}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{approval.action_description}</CardTitle>
            <div className="flex items-center gap-2">
              <ActionTypeBadge actionType={approval.action_type} />
              <ExpiryBadge status={approval.expiry_status} />
              {isOwnRequest && <Badge variant="secondary">Your Request</Badge>}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Requester Info */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Requested by:</span>
          </div>
          <span className="font-medium">{approval.requester_name}</span>
          <span className="text-muted-foreground">({approval.requester_email})</span>
        </div>

        {/* Amount if applicable */}
        {approval.actual_value && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Amount:</span>
            </div>
            <span className="font-medium text-lg">
              $
              {Number(approval.actual_value).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            {approval.threshold_value && (
              <span className="text-muted-foreground">
                (threshold: ${approval.threshold_value.toLocaleString()})
              </span>
            )}
          </div>
        )}

        {/* Reason */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Reason:</span>
          </div>
          <p className="text-sm bg-muted/50 p-3 rounded-md">{approval.reason}</p>
        </div>

        {/* Metadata details if present */}
        {approval.metadata && Object.keys(approval.metadata).length > 0 && (
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Details:</span>
            <div className="text-xs bg-muted/30 p-2 rounded-md font-mono">
              {Object.entries(approval.metadata)
                .filter(([k]) => !["amount", "threshold"].includes(k))
                .map(([key, value]) => (
                  <div key={key}>
                    <span className="text-muted-foreground">{key}:</span>{" "}
                    <span>{String(value)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Requested {formatDistanceToNow(requestedAt, { addSuffix: true })}</span>
          </div>
          {expiresAt && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Expires {format(expiresAt, "MMM d 'at' h:mm a")}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2 pt-4 border-t">
        {isOwnRequest ? (
          <Button variant="outline" onClick={onReject} className="text-red-600 hover:text-red-700">
            <XCircle className="h-4 w-4 mr-2" />
            Cancel Request
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={onReject}
              className="text-red-600 hover:text-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={onApprove}
              disabled={!canApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
