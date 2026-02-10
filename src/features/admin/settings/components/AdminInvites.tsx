/**
 * AdminInvites - Refactored to use data hooks
 */
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { useToast } from "@/hooks";
import { Loader2, Copy, Send, Trash, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
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

    createInviteMutation.mutate(
      { email: newEmail },
      {
        onSuccess: () => setNewEmail(""),
      }
    );
  };

  // Send invitation email
  const sendInvite = async (invite: {
    id: string;
    email: string;
    invite_code: string;
    created_at: string;
    expires_at: string;
    used: boolean | null;
    created_by: string | null;
  }) => {
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
                Only super admins can create or delete admin invitations. You can view existing
                invitations.
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
                {createInviteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
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
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Email</TableHead>
                      <TableHead className="whitespace-nowrap">Created</TableHead>
                      <TableHead className="whitespace-nowrap">Expires</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="w-[180px] whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="py-1.5 truncate max-w-[150px]">
                          {invite.email}
                        </TableCell>
                        <TableCell className="py-1.5 whitespace-nowrap">
                          {format(new Date(invite.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="py-1.5 whitespace-nowrap">
                          {format(new Date(invite.expires_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="py-1.5">
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
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => copyInviteLink(invite.invite_code)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy invite link</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => sendInvite(invite)}
                                  disabled={sendInviteMutation.isPending || !!invite.used}
                                >
                                  {sendInviteMutation.isPending &&
                                  sendInviteMutation.variables?.id === invite.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Send invitation email</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => deleteInvite(invite.id)}
                                  disabled={deleteInviteMutation.isPending || !isSuperAdmin}
                                >
                                  {deleteInviteMutation.isPending &&
                                  deleteInviteMutation.variables === invite.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {!isSuperAdmin ? "Only super admins can delete" : "Delete invite"}
                              </TooltipContent>
                            </Tooltip>
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
