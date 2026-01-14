/**
 * ApprovalQueuePage - Admin approval audit log
 * Shows history of approved operations with audit trail
 * Single-person mode: Operations are auto-approved with audit logging
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  Skeleton,
} from "@/components/ui";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Shield,
  History,
} from "lucide-react";
import { useApprovals, useCanApprove } from "@/hooks/admin/useApprovals";
import { ApprovalCard } from "./ApprovalCard";
import { ApprovalHistoryTable } from "./ApprovalHistoryTable";
import { ApproveDialog } from "./ApproveDialog";
import { RejectDialog } from "./RejectDialog";
import type { PendingApproval } from "@/types/domains/approval";

export function ApprovalQueuePage() {
  const {
    pendingApprovals,
    myRequests,
    history,
    thresholds,
    isLoadingPending,
    isLoadingHistory,
    refetchPending,
    refetchHistory,
    cleanupExpired,
    isCleaning,
  } = useApprovals();

  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const handleApprove = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setApproveDialogOpen(true);
  };

  const handleReject = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setRejectDialogOpen(true);
  };

  const handleRefresh = () => {
    refetchPending();
    refetchHistory();
  };

  const handleCleanup = async () => {
    await cleanupExpired();
  };

  const expiringApprovals = pendingApprovals.filter((a) => a.expiry_status === "EXPIRING_SOON");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Approval Audit Log
          </h1>
          <p className="text-muted-foreground">
            Track and audit high-risk operations with approval history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCleanup} disabled={isCleaning}>
            {isCleaning ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            Cleanup Expired
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Expiring Soon Alert */}
      {expiringApprovals.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Approvals Expiring Soon</AlertTitle>
          <AlertDescription>
            {expiringApprovals.length} approval(s) will expire within the next hour. Action required
            immediately.
          </AlertDescription>
        </Alert>
      )}

      {/* Thresholds Info */}
      {thresholds && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Approval Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Withdrawals:</span>{" "}
                <span className="font-medium">
                  ${thresholds.withdrawal_amount.toLocaleString()}+
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Deposits:</span>{" "}
                <span className="font-medium">${thresholds.deposit_amount.toLocaleString()}+</span>
              </div>
              <div>
                <span className="text-muted-foreground">Void Transactions:</span>{" "}
                <span className="font-medium">
                  ${thresholds.void_transaction.toLocaleString()}+
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Period Lock:</span>{" "}
                <span className="font-medium">Always</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Awaiting Your Approval
            {pendingApprovals.length > 0 && (
              <Badge variant="destructive">{pendingApprovals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-requests" className="gap-2">
            My Requests
            {myRequests.length > 0 && <Badge variant="secondary">{myRequests.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Pending Approvals Tab */}
        <TabsContent value="pending" className="space-y-4">
          {isLoadingPending ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : pendingApprovals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">All Caught Up</h3>
                <p className="text-muted-foreground">No pending approvals require your action.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingApprovals.map((approval) => (
                <ApprovalCard
                  key={approval.approval_id}
                  approval={approval}
                  onApprove={() => handleApprove(approval)}
                  onReject={() => handleReject(approval)}
                  canApprove={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Requests Tab */}
        <TabsContent value="my-requests" className="space-y-4">
          {myRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Pending Requests</h3>
                <p className="text-muted-foreground">
                  You have no approval requests awaiting review.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {myRequests.map((request) => (
                <ApprovalCard
                  key={request.approval_id}
                  approval={request}
                  onReject={() => handleReject(request)} // Can cancel own request
                  canApprove={false}
                  isOwnRequest
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {isLoadingHistory ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ApprovalHistoryTable history={history} />
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ApproveDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        approval={selectedApproval}
        onSuccess={() => {
          setApproveDialogOpen(false);
          setSelectedApproval(null);
          refetchPending();
        }}
      />

      <RejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        approval={selectedApproval}
        onSuccess={() => {
          setRejectDialogOpen(false);
          setSelectedApproval(null);
          refetchPending();
        }}
      />
    </div>
  );
}
