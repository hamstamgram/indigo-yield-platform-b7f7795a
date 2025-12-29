import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { UserCog, UserPlus, Trash2, Shield, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useAdminUsers,
  useRemoveAdminRole,
  useCreateAdminInvite,
  useSendAdminInviteEmail,
  useForceResetPassword,
} from "@/hooks/data/useSystemAdmin";

function AdminUserManagementContent() {
  const { data: admins = [], isLoading, refetch } = useAdminUsers();
  const removeAdminMutation = useRemoveAdminRole();
  const createInviteMutation = useCreateAdminInvite();
  const sendInviteEmailMutation = useSendAdminInviteEmail();
  const resetPasswordMutation = useForceResetPassword();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  // Password Reset State
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Remove admin confirmation state
  const [removeAdminOpen, setRemoveAdminOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      const { inviteCode, expiresAt } = await createInviteMutation.mutateAsync({ email: inviteEmail });

      // Try to send email
      try {
        await sendInviteEmailMutation.mutateAsync({
          email: inviteEmail,
          invite_code: inviteCode,
          expires_at: expiresAt,
        });
        toast.success("Invite Sent", {
          description: `Invitation sent to ${inviteEmail}`,
        });
      } catch {
        toast.error("Invite Created (Email Failed)", {
          description: "The invite was created, but the email failed to send. You can manually share the code.",
        });
      }

      setInviteOpen(false);
      setInviteEmail("");
    } catch (error: any) {
      console.error("Invite error:", error);
      toast.error("Error", {
        description: error.message || "Failed to send invite",
      });
    }
  };

  const handleRemoveAdminClick = (id: string) => {
    setPendingRemoveId(id);
    setRemoveAdminOpen(true);
  };

  const confirmRemoveAdmin = async () => {
    if (!pendingRemoveId) return;

    try {
      await removeAdminMutation.mutateAsync(pendingRemoveId);
      toast.success("Admin privileges removed");
      refetch();
    } catch (error: any) {
      toast.error("Error", {
        description: error.message,
      });
    } finally {
      setRemoveAdminOpen(false);
      setPendingRemoveId(null);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail || !newPassword) return;

    try {
      await resetPasswordMutation.mutateAsync({ email: resetEmail, password: newPassword });
      toast.success("Success", {
        description: `Password updated for ${resetEmail}`,
      });
      setResetEmail("");
      setNewPassword("");
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to update password",
      });
    }
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin & User Management
          </h1>
          <p className="text-muted-foreground">Manage platform administrators and user security.</p>
        </div>
      </div>

      <Tabs defaultValue="admins">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="admins">Admin Team</TabsTrigger>
          <TabsTrigger value="users">User Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Administrators</CardTitle>
                <CardDescription>Users with full access to the platform.</CardDescription>
              </div>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite New Administrator</DialogTitle>
                    <DialogDescription>
                      Enter the email address. They will receive a link to set up their admin
                      account.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleInviteAdmin} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        placeholder="colleague@indigo.fund"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createInviteMutation.isPending}>
                        {createInviteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        Send Invite
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : (
                    admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">
                          {admin.first_name} {admin.last_name}
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveAdminClick(admin.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4 mt-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Force Password Reset
              </CardTitle>
              <CardDescription>
                Manually update a user's password if they are locked out.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">User Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <Button onClick={handlePasswordReset} disabled={resetPasswordMutation.isPending} className="w-full">
                {resetPasswordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  "Update Password"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Remove Admin Confirmation Dialog */}
      <AlertDialog open={removeAdminOpen} onOpenChange={setRemoveAdminOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin Privileges</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove admin privileges from this user? They will lose access
              to all admin features immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminUserManagement() {
  return (
    <AdminGuard>
      <AdminUserManagementContent />
    </AdminGuard>
  );
}
