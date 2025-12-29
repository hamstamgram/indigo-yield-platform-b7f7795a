/**
 * InvestorSettingsPanel - Combined Settings view
 * Sections: Profile, IB Settings, Fee Schedule, Danger Zone
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSuperAdmin } from "@/components/admin/SuperAdminGuard";
import { InvestorProfileEditor } from "./InvestorProfileEditor";
import { IBSettingsSection } from "./IBSettingsSection";
import { InvestorFeeManager } from "./InvestorFeeManager";
import { ReportRecipientsEditor } from "./ReportRecipientsEditor";
import { useInvestorProfileSettings, useDeleteInvestorProfile } from "@/hooks/data/useInvestorSettings";

interface InvestorSettingsPanelProps {
  investorId: string;
  investorName: string;
  investorEmail: string;
  onDataChange?: () => void;
}

export function InvestorSettingsPanel({
  investorId,
  investorName,
  investorEmail,
  onDataChange,
}: InvestorSettingsPanelProps) {
  const navigate = useNavigate();
  const { isSuperAdmin } = useSuperAdmin();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(1);

  // Use hooks for data fetching and mutations
  const { data: investor, isLoading: loading, refetch: refetchProfile } = useInvestorProfileSettings(investorId);
  const deleteProfileMutation = useDeleteInvestorProfile();

  const handleDeleteInvestor = async () => {
    if (deleteConfirmStep < 2) {
      setDeleteConfirmStep((prev) => prev + 1);
      return;
    }

    try {
      await deleteProfileMutation.mutateAsync(investorId);
      toast.success("Investor deleted successfully");
      navigate("/admin/investors");
    } catch (error: any) {
      console.error("Error deleting investor:", error);
      toast.error(error.message || "Failed to delete investor");
    } finally {
      setShowDeleteDialog(false);
      setDeleteConfirmStep(1);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setDeleteConfirmStep(1);
    }
    setShowDeleteDialog(open);
  };

  const handleProfileUpdate = () => {
    refetchProfile();
    onDataChange?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <section id="profile-section">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="text-sm text-muted-foreground">
            Basic investor information and contact details
          </p>
        </div>
        <div className="space-y-6">
          {investor && (
            <InvestorProfileEditor
              investor={investor}
              onUpdate={handleProfileUpdate}
            />
          )}
          <ReportRecipientsEditor 
            investorId={investorId} 
            investorEmail={investorEmail}
          />
        </div>
      </section>

      <Separator />

      {/* IB Settings Section */}
      <section id="ib-section">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">IB Settings</h2>
          <p className="text-sm text-muted-foreground">
            Introducing Broker configuration and fee sharing
          </p>
        </div>
        <IBSettingsSection investorId={investorId} />
      </section>

      <Separator />

      {/* Fee Schedule Section */}
      <section id="fee-section">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Fee Schedule</h2>
          <p className="text-sm text-muted-foreground">
            Custom fee percentages by effective date
          </p>
        </div>
        <InvestorFeeManager investorId={investorId} />
      </section>

      <Separator />

      {/* Danger Zone */}
      <section id="danger-zone">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect this investor's account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div>
                <h4 className="font-medium">Delete Investor</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this investor and all associated data. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={!isSuperAdmin}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
            {!isSuperAdmin && (
              <p className="text-sm text-muted-foreground">
                Only super admins can delete investors.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Delete Confirmation Dialog - Multi-step */}
      <AlertDialog open={showDeleteDialog} onOpenChange={handleDialogClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {deleteConfirmStep === 1 ? "Delete Investor?" : "Are you absolutely sure?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmStep === 1 ? (
                <>
                  You are about to delete <strong>{investorName}</strong>. This will permanently
                  remove all their data including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Profile information</li>
                    <li>Transaction history</li>
                    <li>Positions and balances</li>
                    <li>Generated reports</li>
                  </ul>
                </>
              ) : (
                <>
                  This action is <strong>irreversible</strong>. All data for{" "}
                  <strong>{investorName}</strong> will be permanently deleted from the system.
                  <br /><br />
                  Click "Delete Forever" to proceed.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProfileMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvestor}
              disabled={deleteProfileMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : deleteConfirmStep === 1 ? (
                "Continue"
              ) : (
                "Delete Forever"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
