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
import { useAuth } from "@/lib/auth/context";
import { Loader2, UserCheck, UserMinus } from "lucide-react";
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
import {
  useAdminUsersList,
  useToggleAdminStatusMutation,
  useSendAdminInviteMutation,
} from "@/hooks/data/admin";

const AdminUsersList = () => {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Use React Query hooks
  const { data: users = [], isLoading: loading } = useAdminUsersList();
  const toggleAdminMutation = useToggleAdminStatusMutation();
  const sendInviteMutation = useSendAdminInviteMutation();

  const handleToggleAdmin = (userId: string, currentStatus: boolean) => {
    toggleAdminMutation.mutate({ userId, currentStatus });
  };

  const handleSendInvite = () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      return;
    }

    sendInviteMutation.mutate(
      { email: inviteEmail, createdBy: user?.id || "" },
      {
        onSuccess: () => {
          setInviteEmail("");
          setIsInviteOpen(false);
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            View and manage all user accounts. Grant or revoke admin privileges.
          </CardDescription>
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
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendInvite} disabled={sendInviteMutation.isPending}>
                {sendInviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                  users.map((userItem) => (
                    <TableRow key={userItem.id}>
                      <TableCell>
                        {userItem.first_name || ""} {userItem.last_name || ""}
                      </TableCell>
                      <TableCell>{userItem.email}</TableCell>
                      <TableCell>{new Date(userItem.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span
                          className={userItem.is_admin ? "text-green-600 font-medium" : "text-muted-foreground"}
                        >
                          {userItem.is_admin ? "Admin" : "User"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleToggleAdmin(userItem.id, userItem.is_admin)}
                          title={userItem.is_admin ? "Revoke admin access" : "Grant admin access"}
                        >
                          {userItem.is_admin ? (
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
