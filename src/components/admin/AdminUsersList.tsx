
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, UserMinus, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserProfile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  created_at: string;
};

const AdminUsersList = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, is_admin, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentStatus })
        .eq('id', userId);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `User admin status ${!currentStatus ? 'granted' : 'revoked'}`,
      });
      
      // Update the local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_admin: !currentStatus } : user
      ));
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update admin status',
        variant: 'destructive',
      });
    }
  };

  const sendAdminInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please provide a valid email address',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSendingInvite(true);

      // Generate invite code (random string)
      const inviteCode = [...Array(24)]
        .map(() => Math.floor(Math.random() * 36).toString(36))
        .join('');

      // Set expiration date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();

      // Insert the invite into the database
      const { data: invite, error: inviteError } = await supabase
        .from('admin_invites')
        .insert([{
          email: inviteEmail,
          invite_code: inviteCode,
          expires_at: expiresAt.toISOString(),
          created_by: user?.id
        }])
        .select('*')
        .single();

      if (inviteError) throw inviteError;

      // Send the invitation email
      const { error: emailError } = await supabase.functions.invoke('send-admin-invite', {
        body: { invite }
      });

      if (emailError) throw emailError;

      toast({
        title: 'Invitation Sent',
        description: `An admin invitation has been sent to ${inviteEmail}`,
      });

      setInviteEmail('');
      setIsInviteOpen(false);

    } catch (error: any) {
      console.error('Error sending admin invite:', error);
      toast({
        title: 'Invitation Failed',
        description: error.message || 'Failed to send admin invitation',
        variant: 'destructive',
      });
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View and manage all user accounts. Grant or revoke admin privileges.</CardDescription>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button>Invite Admin</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Administrator</DialogTitle>
              <DialogDescription>
                Send an invitation email to add a new administrator to the platform.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  placeholder="email@example.com" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
              <Button onClick={sendAdminInvite} disabled={sendingInvite}>
                {sendingInvite && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {user.first_name || ''} {user.last_name || ''}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className={user.is_admin ? "text-green-600 font-medium" : "text-gray-500"}>
                          {user.is_admin ? 'Admin' : 'User'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                          title={user.is_admin ? "Revoke admin access" : "Grant admin access"}
                        >
                          {user.is_admin ? (
                            <UserMinus className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUsersList;
