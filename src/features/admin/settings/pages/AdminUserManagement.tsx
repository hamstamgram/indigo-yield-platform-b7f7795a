import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  QueryErrorBoundary,
} from "@/components/ui";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { AdminGuard } from "@/components/admin";
import { UserCog, UserPlus, Trash2, Shield, RefreshCw, Loader2 } from "lucide-react";
import {
  useAdminUsers,
  useRemoveAdminRole,
  useCreateSystemAdminInvite,
  useSendAdminInviteEmail,
  useForceResetPassword,
} from "@/hooks/data";
import { PageShell } from "@/components/layout/PageShell";

function AdminUserManagementContent() {
  const { data: admins = [], isLoading, refetch } = useAdminUsers();
  const removeAdminMutation = useRemoveAdminRole();
  const createInviteMutation = useCreateSystemAdminInvite();
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
      const { inviteCode, expiresAt } = await createInviteMutation.mutateAsync({
        email: inviteEmail,
      });

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
          description:
            "The invite was created, but the email failed to send. You can manually share the code.",
        });
      }

      setInviteOpen(false);
      setInviteEmail("");
    } catch (error: any) {
      logError("admin.invite", error, { email: inviteEmail });
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
    <PageShell>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <Shield className="h-8 w-8 text-indigo-400" />
            Admin & User Management
          </h1>
          <p className="text-zinc-400 font-light mt-1">
            Manage platform administrators and user security.
          </p>
        </div>
      </div>

      <Tabs defaultValue="admins" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-full">
          <TabsTrigger
            value="admins"
            className="rounded-full data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 px-6"
          >
            Admin Team
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="rounded-full data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 px-6"
          >
            User Operations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-row items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Administrators</h2>
                <p className="text-zinc-400 text-sm">Users with full access to the platform.</p>
              </div>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border-0">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Admin
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-dialog border-white/10 bg-black/80 backdrop-blur-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white">Invite New Administrator</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                      Enter the email address. They will receive a link to set up their admin
                      account.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleInviteAdmin} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Email Address</Label>
                      <Input
                        type="email"
                        placeholder="colleague@indigo.fund"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        className="glass-input bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={createInviteMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white"
                      >
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
            </div>

            <div className="rounded-xl border border-white/5 overflow-hidden bg-black/20">
              <Table className="text-xs">
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-zinc-400 whitespace-nowrap">Name</TableHead>
                    <TableHead className="text-zinc-400 whitespace-nowrap">Email</TableHead>
                    <TableHead className="text-zinc-400 whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-zinc-400 whitespace-nowrap">Joined</TableHead>
                    <TableHead className="text-right text-zinc-400 whitespace-nowrap">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow className="border-white/5">
                      <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : (
                    admins.map((admin) => (
                      <TableRow
                        key={admin.id}
                        className="border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <TableCell className="font-medium text-zinc-200 py-1.5 truncate max-w-[120px]">
                          {admin.first_name} {admin.last_name}
                        </TableCell>
                        <TableCell className="text-zinc-400 py-1.5 truncate max-w-[150px]">
                          {admin.email}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          >
                            Active
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-400 py-1.5 whitespace-nowrap">
                          {new Date(admin.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right py-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
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
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl max-w-2xl">
            <div className="flex flex-col gap-1 mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-indigo-400" />
                Force Password Reset
              </h2>
              <p className="text-zinc-400 text-sm">
                Manually update a user's password if they are locked out.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">
                  User Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="glass-input bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="glass-input bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                />
              </div>

              <Button
                onClick={handlePasswordReset}
                disabled={resetPasswordMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              >
                {resetPasswordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Remove Admin Confirmation Dialog */}
      <AlertDialog open={removeAdminOpen} onOpenChange={setRemoveAdminOpen}>
        <AlertDialogContent className="glass-dialog border-white/10 bg-black/90 backdrop-blur-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Admin Privileges</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to remove admin privileges from this user? They will lose access
              to all admin features immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 text-white border-white/10 hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveAdmin}
              className="bg-rose-600 text-white hover:bg-rose-700 border-0"
            >
              Remove Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

export default function AdminUserManagement() {
  return (
    <AdminGuard>
      <QueryErrorBoundary>
        <AdminUserManagementContent />
      </QueryErrorBoundary>
    </AdminGuard>
  );
}
