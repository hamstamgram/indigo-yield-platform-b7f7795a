/**
 * AdminInvites - Refactored to use data hooks
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks";
import { Loader2, Copy, Send, Trash, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useAdminInvites,
  useCreateAdminInvite,
  useSendAdminInvite,
  useDeleteAdminInvite,
  useCopyInviteLink,
  useIsSuperAdmin,
} from "@/hooks/data";

const AdminInvites = () => {
  const [newEmail, setNewEmail] = useState("");
  const { toast } = useToast();

  // Data hooks
  const { data: invites = [], isLoading: loading } = useAdminInvites();
  const { data: isSuperAdmin = false, isLoading: checkingPermission } = useIsSuperAdmin();
  const createInviteMutation = useCreateAdminInvite();
  const sendInviteMutation = useSendAdminInvite();
  const deleteInviteMutation = useDeleteAdminInvite();
  const copyInviteLink = useCopyInviteLink();

  // Create invitation handler
  const createInvite = async () => {
    if (!newEmail || !isValidEmail(newEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (!isSuperAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only super admins can create admin invitations.",
        variant: "destructive",
      });
      return;
    }

    createInviteMutation.mutate(newEmail, {
      onSuccess: () => setNewEmail(""),
    });
  };

  // Send invitation email
  const sendInvite = async (invite: { id: string; email: string; invite_code: string; created_at: string; expires_at: string; used: boolean | null; created_by: string | null }) => {
    sendInviteMutation.mutate(invite);
  };

  // Delete an invite
  const deleteInvite = (id: string) => {
    if (!isSuperAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only super admins can delete admin invitations.",
        variant: "destructive",
      });
      return;
    }

    deleteInviteMutation.mutate(id);
  };

  // Helper to validate email
  const isValidEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Invitations</CardTitle>
        <CardDescription>Invite new administrators to the platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Permission warning for non-super admins */}
          {!checkingPermission && !isSuperAdmin && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                Only super admins can create or delete admin invitations. You can view existing invitations.
              </AlertDescription>
            </Alert>
          )}

          {/* Create new invitation form */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Create New Invitation</h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="email" className="sr-only">
                  Email
                </Label>
                <Input
                  id="email"
                  placeholder="Enter email address"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={createInviteMutation.isPending || !isSuperAdmin}
                />
              </div>
              <Button 
                onClick={createInvite} 
                disabled={createInviteMutation.isPending || !isSuperAdmin || checkingPermission}
                title={!isSuperAdmin ? "Only super admins can create invitations" : undefined}
              >
                {createInviteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create Invitation
              </Button>
            </div>
          </div>

          {/* Invites list */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Active Invitations</h3>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : invites.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">No active invitations found</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell>{invite.email}</TableCell>
                        <TableCell>{format(new Date(invite.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{format(new Date(invite.expires_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <span
                            className={
                              invite.used
                                ? "text-green-600 font-medium"
                                : "text-amber-500 font-medium"
                            }
                          >
                            {invite.used ? "Used" : "Pending"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => copyInviteLink(invite.invite_code)}
                              title="Copy invite link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => sendInvite(invite)}
                              disabled={sendInviteMutation.isPending || !!invite.used}
                              title="Send invitation email"
                            >
                              {sendInviteMutation.isPending && sendInviteMutation.variables?.id === invite.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => deleteInvite(invite.id)}
                              disabled={deleteInviteMutation.isPending || !isSuperAdmin}
                              title={!isSuperAdmin ? "Only super admins can delete" : "Delete invite"}
                            >
                              {deleteInviteMutation.isPending && deleteInviteMutation.variables === invite.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminInvites;
