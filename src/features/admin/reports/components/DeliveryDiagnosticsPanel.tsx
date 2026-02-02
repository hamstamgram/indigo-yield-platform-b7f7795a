/**
 * DeliveryDiagnosticsPanel
 * Shows detailed diagnostics for email delivery troubleshooting
 */

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Alert,
  AlertDescription,
  AlertTitle,
  Skeleton,
} from "@/components/ui";
import {
  FileText,
  Mail,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Info,
} from "lucide-react";
import { useDeliveryDiagnostics } from "@/hooks/data";

interface DeliveryDiagnosticsPanelProps {
  periodId: string;
  periodName: string;
}

export function DeliveryDiagnosticsPanel({ periodId, periodName }: DeliveryDiagnosticsPanelProps) {
  const { data: diagnostics, isLoading, error } = useDeliveryDiagnostics(periodId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Delivery Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error loading diagnostics</AlertTitle>
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  if (!diagnostics) return null;

  const canSendEmails =
    diagnostics.statements_generated > 0 && diagnostics.investors_with_email > 0;
  const allSent = diagnostics.deliveries_sent >= diagnostics.investors_with_email;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4" />
          Delivery Diagnostics
        </CardTitle>
        <CardDescription>Period: {periodName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium">Statements</span>
            </div>
            <p className="text-2xl font-bold">{diagnostics.statements_generated}</p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Mail className="h-4 w-4" />
              <span className="text-xs font-medium">With Email</span>
            </div>
            <p className="text-2xl font-bold">{diagnostics.investors_with_email}</p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium">Sent</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{diagnostics.deliveries_sent}</p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium">Failed</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{diagnostics.deliveries_failed}</p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="space-y-2">
          {diagnostics.statements_generated === 0 && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>No statements generated</strong> for this period. Generate statements first
                from the Investor Reports page.
              </AlertDescription>
            </Alert>
          )}

          {diagnostics.statements_generated > 0 && diagnostics.investors_missing_email > 0 && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <Users className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>{diagnostics.investors_missing_email} investor(s) missing email:</strong>
                <span className="ml-1 text-sm">
                  {diagnostics.missing_email_names.slice(0, 5).join(", ")}
                  {diagnostics.missing_email_names.length > 5 &&
                    ` and ${diagnostics.missing_email_names.length - 5} more`}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {allSent && diagnostics.deliveries_sent > 0 && (
            <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>All eligible emails sent!</strong> {diagnostics.deliveries_sent}{" "}
                delivery(ies) completed.
              </AlertDescription>
            </Alert>
          )}

          {diagnostics.deliveries_queued > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>{diagnostics.deliveries_queued} email(s) queued</strong> and ready to send.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Eligibility Summary */}
        <div className="text-sm text-muted-foreground border-t pt-3">
          <p className="font-medium mb-2">Eligibility Breakdown:</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2">
              {diagnostics.statements_generated > 0 ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <XCircle className="h-3 w-3 text-red-600" />
              )}
              {diagnostics.statements_generated} statement(s) generated
            </li>
            <li className="flex items-center gap-2">
              {diagnostics.investors_with_email > 0 ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <XCircle className="h-3 w-3 text-red-600" />
              )}
              {diagnostics.investors_with_email} investor(s) have email addresses
            </li>
            <li className="flex items-center gap-2">
              {canSendEmails ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <XCircle className="h-3 w-3 text-red-600" />
              )}
              {canSendEmails ? "Ready to send emails" : "Cannot send emails - fix issues above"}
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
