
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Send, Trash } from "lucide-react";
import { format } from "date-fns";

type AdminInvite = {
  id: string;
  email: string;
  invite_code: string;
  created_at: string;
  expires_at: string;
  used: boolean;
};

const AdminInvites = () => {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch all admin invites
  const fetchInvites = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('admin_invites')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setInvites(data || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch invitation data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Create a new admin invite
  const createInvite = async () => {
    if (!newEmail || !isValidEmail(newEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      
      // Generate a random invite code
      const inviteCode = generateInviteCode();
      
      // Set expiry date to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const { data, error } = await supabase
        .from('admin_invites')
        .insert([
          { 
            email: newEmail, 
            invite_code: inviteCode, 
            expires_at: expiresAt.toISOString(),
          }
        ])
        .select('*')
        .single();
      
      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Duplicate Email',
            description: 'An invitation for this email already exists.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }
      
      toast({
        title: 'Invitation Created',
        description: 'Admin invitation has been created successfully.',
      });
      
      // Add the new invite to the state
      setInvites([data, ...invites]);
      setNewEmail("");
    } catch (error) {
      console.error('Error creating invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to create invitation',
        variant: 'destructive',
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
      const { error } = await supabase.functions.invoke('send-admin-invite', {
        body: { invite }
      });
      
      if (error) throw error;
      
      toast({
        title: 'Invitation Sent',
        description: `Invitation email sent to ${invite.email}`,
      });
    } catch (error) {
      console.error('Error sending invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation email',
        variant: 'destructive',
      });
    } finally {
      setSending(null);
    }
  };

  // Delete an invite
  const deleteInvite = async (id: string) => {
    try {
      setDeleting(id);
      
      const { error } = await supabase
        .from('admin_invites')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Remove the invite from state
      setInvites(invites.filter(invite => invite.id !== id));
      
      toast({
        title: 'Invitation Deleted',
        description: 'Admin invitation has been deleted.',
      });
    } catch (error) {
      console.error('Error deleting invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete invitation',
        variant: 'destructive',
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
      title: 'Link Copied',
      description: 'Invitation link copied to clipboard',
    });
  };

  // Helper to validate email
  const isValidEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Helper to generate a random invite code
  const generateInviteCode = () => {
    return [...Array(24)]
      .map(() => Math.floor(Math.random() * 36).toString(36))
      .join('');
  };

  // Fetch invites on component mount
  useEffect(() => {
    fetchInvites();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Invitations</CardTitle>
        <CardDescription>Invite new administrators to the platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Create new invitation form */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Create New Invitation</h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="email" className="sr-only">Email</Label>
                <Input
                  id="email"
                  placeholder="Enter email address"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={creating}
                />
              </div>
              <Button onClick={createInvite} disabled={creating}>
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
              <p className="text-center py-6 text-muted-foreground">
                No active invitations found
              </p>
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
                        <TableCell>
                          {format(new Date(invite.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invite.expires_at), "MMM d, yyyy")}
                        </TableCell>
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
                              disabled={!!sending || invite.used}
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
                              disabled={!!deleting}
                              title="Delete invite"
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
