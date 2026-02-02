/**
 * Admin List Page
 * Displays all admins with their roles and status
 * Only accessible to Super Admins
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";
import { Loader2, Shield, ShieldCheck, UserPlus, Search } from "lucide-react";
import { SuperAdminGuard } from "@/features/admin/shared/SuperAdminGuard";
import { RoleChangeConfirmDialog } from "@/features/admin/settings/components/RoleChangeConfirmDialog";
import { useToast } from "@/hooks";
import { logError } from "@/lib/logger";
import { format } from "date-fns";
import {
  useAdminUsersWithRoles,
  useUpdateAdminRole,
  useCreateSystemAdminInvite,
  type AdminUser,
} from "@/hooks/data";

interface PendingRoleChange {
  adminId: string;
  adminName: string;
  adminEmail: string;
  currentRole: "admin" | "super_admin";
  newRole: "admin" | "super_admin";
}

function AdminListContent() {
  const { data: admins = [], isLoading: loading, refetch } = useAdminUsersWithRoles();
  const updateRoleMutation = useUpdateAdminRole();
  const createInviteMutation = useCreateSystemAdminInvite();

  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "super_admin">("admin");
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const { toast } = useToast();

  const handleInviteAdmin = async () => {
    if (!inviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      const { inviteCode } = await createInviteMutation.mutateAsync({
        email: inviteEmail,
        intendedRole: inviteRole,
      });

      const inviteLink = `${window.location.origin}/admin/invite?code=${inviteCode}`;

      toast({
        title: "Invite Created",
        description: (
          <div className="space-y-2">
            <p>Invitation sent to {inviteEmail}</p>
            <p className="text-xs text-muted-foreground">Share this link with the admin:</p>
            <code className="text-xs bg-muted p-1 rounded block break-all">{inviteLink}</code>
          </div>
        ),
      });

      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("admin");
    } catch (error) {
      logError("admin.createInvite", error, { inviteEmail });
      toast({
        title: "Error",
        description: "Failed to create invite",
        variant: "destructive",
      });
    }
  };

  const initiateRoleChange = (admin: AdminUser, newRole: "admin" | "super_admin") => {
    if (admin.role === newRole) return;

    setPendingRoleChange({
      adminId: admin.id,
      adminName: `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || admin.email,
      adminEmail: admin.email,
      currentRole: admin.role,
      newRole,
    });
  };

  const executeRoleChange = async () => {
    if (!pendingRoleChange) return;

    try {
      await updateRoleMutation.mutateAsync({
        userId: pendingRoleChange.adminId,
        newRole: pendingRoleChange.newRole,
      });

      toast({
        title: "Role Updated",
        description: `Admin role changed to ${pendingRoleChange.newRole === "super_admin" ? "Super Admin" : "Admin"}`,
      });

      refetch();
    } catch (error: any) {
      logError("admin.updateRole", error, {
        adminId: pendingRoleChange.adminId,
        newRole: pendingRoleChange.newRole,
      });
      if (error.message?.includes("Super Admin")) {
        toast({
          title: "Permission Denied",
          description: error.message,
          variant: "destructive",
        });
      } else if (error.message?.includes("demote yourself")) {
        toast({
          title: "Action Not Allowed",
          description: "You cannot demote yourself from Super Admin",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update role",
          variant: "destructive",
        });
      }
    } finally {
      setPendingRoleChange(null);
    }
  };

  const filteredAdmins = admins.filter((admin) => {
    const search = searchTerm.toLowerCase();
    const name = `${admin.firstName || ""} ${admin.lastName || ""}`.toLowerCase();
    return name.includes(search) || admin.email.toLowerCase().includes(search);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Admin Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage administrator accounts and permissions
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Administrators</CardTitle>
              <CardDescription>{admins.length} admin accounts</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search admins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {admin.firstName || admin.lastName
                          ? `${admin.firstName || ""} ${admin.lastName || ""}`.trim()
                          : "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={admin.role === "super_admin" ? "default" : "secondary"}
                      className="gap-1"
                    >
                      {admin.role === "super_admin" ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <Shield className="h-3 w-3" />
                      )}
                      {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(admin.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={admin.role}
                      onValueChange={(value) =>
                        initiateRoleChange(admin, value as "admin" | "super_admin")
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAdmins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No admins match your search" : "No administrators found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>Access levels for each admin role</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                <TableHead className="text-center">Admin</TableHead>
                <TableHead className="text-center">Super Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>View dashboards and data</TableCell>
                <TableCell className="text-center text-green-600">✓</TableCell>
                <TableCell className="text-center text-green-600">✓</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Send reports to investors</TableCell>
                <TableCell className="text-center text-green-600">✓</TableCell>
                <TableCell className="text-center text-green-600">✓</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>View withdrawals and transactions</TableCell>
                <TableCell className="text-center text-green-600">✓</TableCell>
                <TableCell className="text-center text-green-600">✓</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Edit investor personal info</TableCell>
                <TableCell className="text-center text-muted-foreground">—</TableCell>
                <TableCell className="text-center text-green-600">✓</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Manage fee settings</TableCell>
                <TableCell className="text-center text-muted-foreground">—</TableCell>
                <TableCell className="text-center text-green-600">✓</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Manage yield/AUM entries</TableCell>
                <TableCell className="text-center text-muted-foreground">—</TableCell>
                <TableCell className="text-center text-green-600">✓</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Approve/deny withdrawals</TableCell>
                <TableCell className="text-center text-muted-foreground">—</TableCell>
                <TableCell className="text-center text-green-600">✓</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Manage admin accounts</TableCell>
                <TableCell className="text-center text-muted-foreground">—</TableCell>
                <TableCell className="text-center text-green-600">✓</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Administrator</DialogTitle>
            <DialogDescription>
              Send an invitation to add a new administrator to the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="admin@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Admin Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as "admin" | "super_admin")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin (Limited)
                    </div>
                  </SelectItem>
                  <SelectItem value="super_admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Super Admin (Full Access)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {inviteRole === "super_admin"
                  ? "Super Admins can manage other admins, edit investor info, and approve withdrawals."
                  : "Admins can view data and send reports, but cannot edit sensitive settings."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteAdmin} disabled={createInviteMutation.isPending}>
              {createInviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Confirmation Dialog */}
      <RoleChangeConfirmDialog
        open={!!pendingRoleChange}
        onOpenChange={(open) => !open && setPendingRoleChange(null)}
        adminName={pendingRoleChange?.adminName || ""}
        adminEmail={pendingRoleChange?.adminEmail || ""}
        currentRole={pendingRoleChange?.currentRole || "admin"}
        newRole={pendingRoleChange?.newRole || "admin"}
        onConfirm={executeRoleChange}
      />
    </div>
  );
}

export default function AdminListPage() {
  return (
    <SuperAdminGuard>
      <AdminListContent />
    </SuperAdminGuard>
  );
}
