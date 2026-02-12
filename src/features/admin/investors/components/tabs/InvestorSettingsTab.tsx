/**
 * Investor Settings Tab
 * Consolidated settings for IB configuration, fee schedule, and danger zone
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import { Trash2, ExternalLink, Mail, AlertTriangle, Loader2 } from "lucide-react";
import { IBSettingsSection } from "../shared/IBSettingsSection";
import { FeeScheduleSection } from "../shared/FeeScheduleSection";

interface InvestorSettingsTabProps {
  investorId: string;
  investorName: string;
  onDelete?: () => Promise<void>;
  onDataChange?: () => void;
  /** If true, shows compact version for drawer */
  compact?: boolean;
}

export function InvestorSettingsTab({
  investorId,
  investorName,
  onDelete,
  onDataChange,
  compact = false,
}: InvestorSettingsTabProps) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete();
      setDeleteDialogOpen(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenFullProfile = () => {
    navigate(`/admin/investors/${investorId}`);
  };

  return (
    <div className="space-y-6">
      {/* Per-Fund Fee Schedule */}
      <FeeScheduleSection investorId={investorId} />

      {/* IB Settings (parent config, promote, referrals, commission schedule) */}
      <IBSettingsSection investorId={investorId} onUpdate={onDataChange} />

      {/* Report Recipients Link (drawer only) */}
      {compact && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Report Recipients
            </CardTitle>
            <CardDescription>Configure email recipients for investor reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={handleOpenFullProfile}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage in Full Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      {onDelete && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that permanently affect this investor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Investor
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Investor
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{investorName}</strong>? This action cannot be
              undone and will remove all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All fund positions</li>
                <li>Transaction history</li>
                <li>Withdrawal requests</li>
                <li>Report data</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Investor
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default InvestorSettingsTab;
