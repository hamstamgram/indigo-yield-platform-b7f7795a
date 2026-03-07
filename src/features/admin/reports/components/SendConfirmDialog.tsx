/**
 * Send Confirmation Dialog
 * Shows recipient list and requires explicit confirmation before sending emails.
 * Replaces unsafe window.confirm() calls.
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
  Badge,
  ScrollArea,
} from "@/components/ui";
import { Send, Mail } from "lucide-react";
import type { InvestorReportSummary } from "@/services/admin/reportQueryService";

interface SendConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: InvestorReportSummary[];
  monthLabel: string;
  onConfirm: () => void;
}

export function SendConfirmDialog({
  open,
  onOpenChange,
  recipients,
  monthLabel,
  onConfirm,
}: SendConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Confirm Email Delivery
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to send <strong>{recipients.length}</strong> statement
            {recipients.length !== 1 ? "s" : ""} for <strong>{monthLabel}</strong>. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <p className="text-sm font-medium">Recipients:</p>
          <ScrollArea className="max-h-48 rounded-md border p-3">
            <div className="space-y-2">
              {recipients.map((r) => (
                <div key={r.investor_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate font-medium">{r.investor_name}</span>
                  </div>
                  <div className="flex flex-col items-end min-w-0">
                    {r.investor_emails?.map((e, idx) => (
                      <span key={idx} className="text-muted-foreground truncate ml-2 text-xs">
                        {e.email}
                      </span>
                    )) || (
                      <span className="text-muted-foreground truncate ml-2 text-xs">
                        {r.investor_email}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {recipients.length} email{recipients.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            <Send className="h-4 w-4 mr-2" />
            Send {recipients.length} Email{recipients.length !== 1 ? "s" : ""}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
