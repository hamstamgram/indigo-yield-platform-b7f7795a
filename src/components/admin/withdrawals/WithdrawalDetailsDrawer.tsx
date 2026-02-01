import { useState } from "react";
import { Withdrawal, WithdrawalFullStatus } from "@/types/domains";
import { CryptoIcon } from "@/components/CryptoIcons";
import { format } from "date-fns";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  Badge,
  Button,
  Separator,
  TruncatedText,
} from "@/components/ui";
import {
  Loader2,
  X,
  ExternalLink,
  Copy,
  CheckCircle,
  XCircle,
  Play,
  CheckCircle2,
  ArrowRightLeft,
} from "lucide-react";
import { WithdrawalAuditTimeline } from "./WithdrawalAuditTimeline";
import { RouteToFeesDialog } from "./RouteToFeesDialog";
import { toast } from "sonner";
import { useWithdrawalById } from "@/hooks/data/admin";

interface WithdrawalDetailsDrawerProps {
  withdrawalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction?: (
    action: "approve" | "reject" | "process" | "complete",
    withdrawal: Withdrawal
  ) => void;
}

const statusColors: Record<WithdrawalFullStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  approved: "bg-green-500/10 text-green-600 border-green-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-green-700/10 text-green-700 border-green-700/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export function WithdrawalDetailsDrawer({
  withdrawalId,
  open,
  onOpenChange,
  onAction,
}: WithdrawalDetailsDrawerProps) {
  const [routeToFeesOpen, setRouteToFeesOpen] = useState(false);

  const {
    data: withdrawal,
    isLoading,
    error,
    refetch,
  } = useWithdrawalById(open ? withdrawalId : null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const canRouteToFees =
    withdrawal?.status === "pending" ||
    withdrawal?.status === "approved" ||
    withdrawal?.status === "processing";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-2xl overflow-y-auto">
          <DrawerHeader className="flex flex-row items-start justify-between">
            <div>
              <DrawerTitle className="text-xl">Withdrawal Details</DrawerTitle>
              <DrawerDescription>
                {withdrawalId ? `Request ID: ${withdrawalId.slice(0, 8)}...` : "Loading..."}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>

          <div className="px-4 pb-8 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error || !withdrawal ? (
              <div className="text-center py-12 text-muted-foreground">
                Failed to load withdrawal details
              </div>
            ) : (
              <>
                {/* Status & Amount */}
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-sm px-3 py-1 ${statusColors[withdrawal.status]}`}
                  >
                    {withdrawal.status.toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-2 text-2xl font-bold">
                    <CryptoIcon
                      symbol={withdrawal.asset || withdrawal.fund_class || "ASSET"}
                      className="h-6 w-6"
                    />
                    {withdrawal.requested_amount.toLocaleString()}{" "}
                    <span className="text-muted-foreground text-lg font-normal">
                      {(withdrawal.asset || withdrawal.fund_class || "UNITS").toUpperCase()}
                    </span>
                  </div>
                </div>

                {withdrawal.processed_amount &&
                  withdrawal.processed_amount !== withdrawal.requested_amount && (
                    <p className="text-sm text-muted-foreground">
                      Processed amount: {withdrawal.processed_amount.toLocaleString()}{" "}
                      {(withdrawal.asset || "").toUpperCase()}
                    </p>
                  )}

                <Separator />

                {/* Investor Info */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Investor</h3>
                  <div className="space-y-1">
                    <TruncatedText
                      text={withdrawal.investor_name}
                      className="font-medium"
                      maxWidth="100%"
                    />
                    <TruncatedText
                      text={withdrawal.investor_email}
                      className="text-sm text-muted-foreground"
                      maxWidth="100%"
                    />
                    <button
                      onClick={() => copyToClipboard(withdrawal.investor_id, "Investor ID")}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      {withdrawal.investor_id.slice(0, 8)}...
                    </button>
                  </div>
                </div>

                <Separator />

                {/* Request Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Fund</h3>
                    <p className="font-medium">
                      {withdrawal.fund_name || withdrawal.fund_code || "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Type</h3>
                    <Badge variant="outline">{withdrawal.withdrawal_type}</Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Request Date</h3>
                    <p>{format(new Date(withdrawal.request_date), "MMM d, yyyy")}</p>
                  </div>
                  {withdrawal.processed_at && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Processed Date
                      </h3>
                      <p>{format(new Date(withdrawal.processed_at), "MMM d, yyyy")}</p>
                    </div>
                  )}
                </div>

                {/* TX Hash */}
                {withdrawal.tx_hash && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Transaction Hash
                      </h3>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                          {withdrawal.tx_hash}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(withdrawal.tx_hash!, "TX Hash")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Notes */}
                {(withdrawal.notes ||
                  withdrawal.admin_notes ||
                  withdrawal.rejection_reason ||
                  withdrawal.cancellation_reason) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      {withdrawal.notes && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">
                            Investor Notes
                          </h3>
                          <p className="text-sm">{withdrawal.notes}</p>
                        </div>
                      )}
                      {withdrawal.admin_notes && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">
                            Admin Notes
                          </h3>
                          <p className="text-sm">{withdrawal.admin_notes}</p>
                        </div>
                      )}
                      {withdrawal.rejection_reason && (
                        <div>
                          <h3 className="text-sm font-medium text-red-600 mb-1">
                            Rejection Reason
                          </h3>
                          <p className="text-sm text-red-600">{withdrawal.rejection_reason}</p>
                        </div>
                      )}
                      {withdrawal.cancellation_reason && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">
                            Cancellation Reason
                          </h3>
                          <p className="text-sm">{withdrawal.cancellation_reason}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Actions */}
                {onAction && (
                  <div className="flex gap-2 flex-wrap">
                    {withdrawal.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => onAction("approve", withdrawal)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onAction("reject", withdrawal)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {withdrawal.status === "approved" && (
                      <Button size="sm" onClick={() => onAction("process", withdrawal)}>
                        <Play className="h-4 w-4 mr-1" />
                        Start Processing
                      </Button>
                    )}
                    {withdrawal.status === "processing" && (
                      <Button size="sm" onClick={() => onAction("complete", withdrawal)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                )}

                {/* Route to INDIGO FEES - always visible for valid statuses */}
                {canRouteToFees && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRouteToFeesOpen(true)}
                      className="border-primary/50 text-primary hover:bg-primary/10"
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-1" />
                      Route to INDIGO FEES
                    </Button>
                  </div>
                )}

                <Separator />

                {/* Audit Timeline */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">
                    Activity History
                  </h3>
                  <WithdrawalAuditTimeline withdrawalId={withdrawal.id} />
                </div>
              </>
            )}
          </div>
        </div>
      </DrawerContent>

      {/* Route to INDIGO FEES Dialog */}
      <RouteToFeesDialog
        open={routeToFeesOpen}
        onOpenChange={setRouteToFeesOpen}
        withdrawal={withdrawal || null}
        onSuccess={() => refetch()}
      />
    </Drawer>
  );
}
