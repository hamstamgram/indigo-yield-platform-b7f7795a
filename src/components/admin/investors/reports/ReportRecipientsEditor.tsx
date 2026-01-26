/**
 * ReportRecipientsEditor - Admin-only report recipients email editor
 * Manages the list of emails that receive monthly reports for an investor
 */

import { useState, useEffect } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, EmailChipsInput,
} from "@/components/ui";
import { Mail, Pencil, X, Save, Loader2, Info } from "lucide-react";
import { useReportRecipients, useUpdateReportRecipients } from "@/hooks/data/admin";

interface ReportRecipientsEditorProps {
  investorId: string;
  investorEmail: string;
}

export function ReportRecipientsEditor({ investorId, investorEmail }: ReportRecipientsEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);

  // Use React Query hooks
  const { data: savedEmails = [], isLoading } = useReportRecipients(investorId);
  const updateMutation = useUpdateReportRecipients(investorId);

  // Sync editing state with fetched data
  useEffect(() => {
    setEmails(savedEmails);
  }, [savedEmails]);

  const handleCancel = () => {
    setEmails(savedEmails);
    setIsEditing(false);
  };

  const handleSave = () => {
    updateMutation.mutate(emails, {
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Report Recipients</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Report Recipients</CardTitle>
            <CardDescription>Edit emails that receive monthly reports</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={updateMutation.isPending}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <EmailChipsInput
            value={emails}
            onChange={setEmails}
            placeholder="Add email addresses..."
          />
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-xs text-muted-foreground">
              These email addresses will receive monthly investment reports. 
              If no recipients are configured, reports will be sent to the investor's 
              account email ({investorEmail}).
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // View mode
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Report Recipients</CardTitle>
          <CardDescription>Emails that receive monthly reports</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </CardHeader>
      <CardContent>
        {savedEmails.length > 0 ? (
          <div className="space-y-2">
            {savedEmails.map((email) => (
              <div key={email} className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{email}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">
              No report recipients configured. Reports will be sent to the account email ({investorEmail}).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
