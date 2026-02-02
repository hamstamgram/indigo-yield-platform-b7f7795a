/**
 * Role Change Confirmation Dialog
 * Requires typed confirmation for destructive role changes
 */

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Input,
  Label,
} from "@/components/ui";
import { Shield, ShieldCheck, AlertTriangle } from "lucide-react";

interface RoleChangeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminName: string;
  adminEmail: string;
  currentRole: "admin" | "super_admin";
  newRole: "admin" | "super_admin";
  onConfirm: () => void;
}

export function RoleChangeConfirmDialog({
  open,
  onOpenChange,
  adminName,
  adminEmail,
  currentRole,
  newRole,
  onConfirm,
}: RoleChangeConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState("");

  const isPromotion = newRole === "super_admin" && currentRole === "admin";
  const isDemotion = newRole === "admin" && currentRole === "super_admin";

  const expectedConfirmation = isDemotion ? "DEMOTE" : "CONFIRM";
  const isConfirmed = confirmText === expectedConfirmation;

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      setConfirmText("");
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isDemotion ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-primary" />
            )}
            {isDemotion ? "Demote Administrator" : "Promote Administrator"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are about to {isDemotion ? "demote" : "promote"}{" "}
                <strong>{adminName || adminEmail}</strong> from{" "}
                <span className="inline-flex items-center gap-1">
                  {currentRole === "super_admin" ? (
                    <ShieldCheck className="h-3 w-3" />
                  ) : (
                    <Shield className="h-3 w-3" />
                  )}
                  {currentRole === "super_admin" ? "Super Admin" : "Admin"}
                </span>{" "}
                to{" "}
                <span className="inline-flex items-center gap-1">
                  {newRole === "super_admin" ? (
                    <ShieldCheck className="h-3 w-3" />
                  ) : (
                    <Shield className="h-3 w-3" />
                  )}
                  {newRole === "super_admin" ? "Super Admin" : "Admin"}
                </span>
                .
              </p>

              {isDemotion && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm">
                  <p className="font-medium text-destructive">Warning:</p>
                  <p className="text-muted-foreground">
                    This will remove their ability to manage other admins, edit investor info,
                    approve withdrawals, and manage fee settings.
                  </p>
                </div>
              )}

              {isPromotion && (
                <div className="rounded-md bg-primary/10 p-3 text-sm">
                  <p className="font-medium text-primary">Note:</p>
                  <p className="text-muted-foreground">
                    Super Admins have full access including managing other admins, editing sensitive
                    data, and approving financial operations.
                  </p>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Label htmlFor="confirm-text">
                  Type <strong>{expectedConfirmation}</strong> to confirm
                </Label>
                <Input
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder={expectedConfirmation}
                  autoComplete="off"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className={isDemotion ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {isDemotion ? "Demote" : "Promote"}{" "}
            {newRole === "super_admin" ? "to Super Admin" : "to Admin"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
