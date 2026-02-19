/**
 * Regenerate All Confirmation Dialog
 * Destructive operation requiring super admin confirmation.
 * Replaces window.confirm() for regenerate-all.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import { RefreshCw } from "lucide-react";

interface RegenerateAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthLabel: string;
  reportCount: number;
  onConfirm: () => void;
}

export function RegenerateAllDialog({
  open,
  onOpenChange,
  monthLabel,
  reportCount,
  onConfirm,
}: RegenerateAllDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-amber-500" />
            Regenerate All Reports
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>
              This will clear and regenerate <strong>all {reportCount} reports</strong> for{" "}
              <strong>{monthLabel}</strong>.
            </span>
            <br />
            <span className="text-destructive">
              Previously sent reports will need to be re-sent. This operation cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
