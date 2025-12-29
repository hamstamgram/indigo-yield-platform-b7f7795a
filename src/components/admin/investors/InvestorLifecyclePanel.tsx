/**
 * Investor Lifecycle Panel
 * Manages investor status, position locking, and cleanup operations
 */

import { useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Input, Label, Textarea,
} from "@/components/ui";
import { Calendar, Clock, User, UserX, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks";
import {
  useAdminUpdateInvestorStatus as useUpdateInvestorStatus,
  useLockPositions,
  useCleanupInactiveInvestors,
} from "@/hooks/data/admin";

const InvestorLifecyclePanel = () => {
  const [selectedInvestor] = useState<string>("");
  const [entryDate, setEntryDate] = useState<string>("");
  const [exitDate, setExitDate] = useState<string>("");
  const [lockUntilDate, setLockUntilDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const { toast } = useToast();

  // React Query mutations
  const updateStatusMutation = useUpdateInvestorStatus();
  const lockPositionsMutation = useLockPositions();
  const cleanupMutation = useCleanupInactiveInvestors();

  const isProcessing =
    updateStatusMutation.isPending ||
    lockPositionsMutation.isPending ||
    cleanupMutation.isPending;

  const handleUpdateInvestorStatus = (
    investorId: string,
    status: "active" | "inactive" | "suspended" | "exited"
  ) => {
    updateStatusMutation.mutate(
      { investorId, status },
      {
        onSuccess: () => {
          toast({
            title: "Status Updated",
            description: `Investor status changed to ${status}`,
          });
        },
        onError: (error) => {
          console.error("Error updating investor status:", error);
          toast({
            title: "Update Failed",
            description: "Failed to update investor status",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleLockPositions = (investorId: string, lockUntil: string) => {
    lockPositionsMutation.mutate(
      { investorId, lockUntil, reason },
      {
        onSuccess: () => {
          toast({
            title: "Positions Locked",
            description: `Positions locked until ${lockUntil}`,
          });
        },
        onError: (error) => {
          console.error("Error locking positions:", error);
          toast({
            title: "Lock Failed",
            description: "Failed to lock investor positions",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleCleanupInactiveInvestors = () => {
    cleanupMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.archivedCount === 0) {
          toast({
            title: "No Cleanup Needed",
            description: "No inactive profiles found for cleanup",
          });
        } else {
          toast({
            title: "Cleanup Complete",
            description: `Archived ${result.archivedCount} inactive profiles`,
          });
        }
      },
      onError: (error) => {
        console.error("Error during cleanup:", error);
        toast({
          title: "Cleanup Failed",
          description: "Failed to cleanup inactive profiles",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Status Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Investor Status Management
          </CardTitle>
          <CardDescription>Manage investor lifecycle status and access controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entry Date Tracking</Label>
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                placeholder="Set investor entry date"
              />
            </div>
            <div className="space-y-2">
              <Label>Exit Date (if applicable)</Label>
              <Input
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                placeholder="Set investor exit date"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() =>
                selectedInvestor && handleUpdateInvestorStatus(selectedInvestor, "active")
              }
              disabled={!selectedInvestor || isProcessing}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Activate
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                selectedInvestor && handleUpdateInvestorStatus(selectedInvestor, "inactive")
              }
              disabled={!selectedInvestor || isProcessing}
              className="flex items-center gap-2"
            >
              <UserX className="h-4 w-4" />
              Deactivate
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedInvestor && handleUpdateInvestorStatus(selectedInvestor, "suspended")
              }
              disabled={!selectedInvestor || isProcessing}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Suspend
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Position Locking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Position Lock Management
          </CardTitle>
          <CardDescription>
            Lock investor positions based on status or compliance requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Lock Positions Until</Label>
            <Input
              type="date"
              value={lockUntilDate}
              onChange={(e) => setLockUntilDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Reason for Lock</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for position lock..."
              rows={3}
            />
          </div>

          <Button
            onClick={() =>
              selectedInvestor &&
              lockUntilDate &&
              handleLockPositions(selectedInvestor, lockUntilDate)
            }
            disabled={!selectedInvestor || !lockUntilDate || isProcessing}
          >
            Apply Position Lock
          </Button>
        </CardContent>
      </Card>

      {/* Cleanup Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Automated Cleanup
          </CardTitle>
          <CardDescription>Clean up inactive investors and maintain data hygiene</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Cleanup Criteria:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Investors inactive for 90+ days</li>
              <li>• Zero balance across all positions</li>
              <li>• No pending transactions or withdrawals</li>
              <li>• Status will be changed to "archived"</li>
            </ul>
          </div>

          <Button
            variant="outline"
            onClick={handleCleanupInactiveInvestors}
            disabled={isProcessing}
            className="w-full"
          >
            {cleanupMutation.isPending ? "Processing..." : "Run Cleanup for Inactive Investors"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestorLifecyclePanel;
