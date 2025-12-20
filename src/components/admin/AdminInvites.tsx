import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Send, Trash, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AdminInvite = {
  id: string;
  email: string;
  invite_code: string;
  created_at: string;
  expires_at: string;
  used: boolean | null;
  created_by: string | null;
};

const AdminInvites = () => {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const { toast } = useToast();

  // Check if current user is super admin
  const checkSuperAdminStatus = useCallback(async () => {
    try {
      setCheckingPermission(true);
      const { data, error } = await supabase.rpc('is_super_admin');
      if (error) throw error;
      setIsSuperAdmin(!!data);
    } catch (error) {
      console.error("Error checking super admin status:", error);
      setIsSuperAdmin(false);
    } finally {
      setCheckingPermission(false);
    }
  }, []);

  // Fetch all admin invites
  const fetchInvites = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("admin_invites")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setInvites((data || []) as AdminInvite[]);
    } catch (error) {
      console.error("Error fetching invites:", error);
      toast({
        title: "Error",
        description: "Failed to fetch invitation data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Create a new admin invite using secure RPC
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

    try {
      setCreating(true);

      // Use secure RPC function that checks super_admin permission
      const { data, error } = await supabase.rpc('create_admin_invite', {
        p_email: newEmail.toLowerCase().trim()
      });

      if (error) {
        if (error.message?.includes("Super admin")) {
          toast({
            title: "Permission Denied",
            description: "Only super admins can create admin invitations.",
            variant: "destructive",
          });
        } else if (error.message?.includes("already exists")) {
          toast({
            title: "Duplicate Email",
            description: "An invitation for this email already exists.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Invitation Created",
        description: "Admin invitation has been created successfully.",
      });

      // Refresh invites list
      await fetchInvites();
      setNewEmail("");
    } catch (error) {
      console.error("Error creating invite:", error);
      toast({
        title: "Error",
        description: "Failed to create invitation",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Send invitation email
  const sendInvite = async (invite: AdminInvite) => {
    try {
      setSending(invite.id);

      // Call the edge function to send the email
      const { error } = await supabase.functions.invoke("send-admin-invite", {
        body: { invite },
      });

      if (error) throw error;

      toast({
        title: "Invitation Sent",
        description: `Invitation email sent to ${invite.email}`,
      });
    } catch (error) {
      console.error("Error sending invite:", error);
      toast({
        title: "Error",
        description: "Failed to send invitation email",
        variant: "destructive",
      });
    } finally {
      setSending(null);
    }
  };

  // Delete an invite
  const deleteInvite = async (id: string) => {
    if (!isSuperAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only super admins can delete admin invitations.",
        variant: "destructive",
      });
      return;
    }

    try {
      setDeleting(id);

      const { error } = await supabase.from("admin_invites").delete().eq("id", id);

      if (error) throw error;

      // Remove the invite from state
      setInvites(invites.filter((invite) => invite.id !== id));

      toast({
        title: "Invitation Deleted",
        description: "Admin invitation has been deleted.",
      });
    } catch (error) {
      console.error("Error deleting invite:", error);
      toast({
        title: "Error",
        description: "Failed to delete invitation",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  // Copy invite link to clipboard
  const copyInviteLink = (inviteCode: string) => {
    const link = `${window.location.origin}/admin-invite?code=${inviteCode}`;
    navigator.clipboard.writeText(link);

    toast({
      title: "Link Copied",
      description: "Invitation link copied to clipboard",
    });
  };

  // Helper to validate email
  const isValidEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Fetch data on component mount
  useEffect(() => {
    checkSuperAdminStatus();
    fetchInvites();
  }, [checkSuperAdminStatus, fetchInvites]);

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
                  disabled={creating || !isSuperAdmin}
                />
              </div>
              <Button 
                onClick={createInvite} 
                disabled={creating || !isSuperAdmin || checkingPermission}
                title={!isSuperAdmin ? "Only super admins can create invitations" : undefined}
              >
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
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
                              disabled={!!sending || !!invite.used}
                              title="Send invitation email"
                            >
                              {sending === invite.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => deleteInvite(invite.id)}
                              disabled={!!deleting || !isSuperAdmin}
                              title={!isSuperAdmin ? "Only super admins can delete" : "Delete invite"}
                            >
                              {deleting === invite.id ? (
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
