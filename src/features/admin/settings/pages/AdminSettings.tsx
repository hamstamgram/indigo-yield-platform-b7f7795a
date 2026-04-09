/**
 * Admin Settings Page - Platform configuration + Admin Management
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { toast } from "sonner";
import {
  Settings,
  Bell,
  Globe,
  Save,
  RefreshCw,
  Users,
  UserPlus,
  Copy,
  Mail,
  XCircle,
  UserCog,
} from "lucide-react";
import { AdminGuard } from "@/features/admin/shared/AdminGuard";
import { usePlatformSettingsForm } from "@/features/admin/settings/hooks/usePlatformSettings";
import { useAdminUsersWithRoles, useUpdateAdminRole, useSendAdminInviteEmail } from "@/features/admin/settings/hooks/useSystemAdmin";
import {
  useAdminInvitesList,
  useCreateAdminInvite,
  useRevokeAdminInvite,
} from "@/features/admin/settings/hooks/useAdminInvitesPage";
import { useAuth } from "@/services/auth";
import { PageShell } from "@/components/layout/PageShell";
import { SuperAdminGuard } from "@/features/admin/shared/SuperAdminGuard";
import ProfileTab from "@/components/account/ProfileTab";
import SecurityTab from "@/components/account/SecurityTab";
import { usePersonalInfo } from "@/hooks/data/shared/useProfileSettings";

// ============================================================================
// Admin Management Tab
// ============================================================================

function AdminManagementTab() {
  const { user } = useAuth();
  const { data: admins, isLoading: adminsLoading } = useAdminUsersWithRoles();
  const { data: invites, isLoading: invitesLoading } = useAdminInvitesList();
  const updateRole = useUpdateAdminRole();
  const revokeInvite = useRevokeAdminInvite({
    onSuccess: () => toast.success("Invite revoked"),
    onError: (error) => toast.error(error.message || "Failed to revoke invite"),
  });
  const sendEmail = useSendAdminInviteEmail();
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("admin");

  const createInvite = useCreateAdminInvite({
    onSuccess: (data) => {
      toast.success("Invite created", { description: `Sent to ${data.email}` });
      setInviteDialog(false);
      setInviteEmail("");
    },
    onError: (error) => toast.error(error.message || "Failed to create invite"),
  });

  const handleCopyLink = (inviteCode: string) => {
    const link = `${window.location.origin}/admin/invite?code=${inviteCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  const isLoading = adminsLoading || invitesLoading;

  // Combine active admins and pending invites into one list
  type CombinedRow =
    | {
        type: "admin";
        id: string;
        email: string;
        name: string;
        role: "admin" | "super_admin";
        createdAt: string;
      }
    | {
        type: "invite";
        id: string;
        email: string;
        role: string;
        status: string;
        inviteCode: string;
        expiresAt: string;
        createdAt: string;
      };

  const combinedRows: CombinedRow[] = [
    ...(admins || []).map(
      (a) =>
        ({
          type: "admin" as const,
          id: a.id,
          email: a.email || "",
          name: [a.firstName, a.lastName].filter(Boolean).join(" ") || "-",
          role: a.role || "admin",
          createdAt: a.createdAt || "",
        }) satisfies CombinedRow
    ),
    ...(invites || [])
      .filter((inv) => !inv.used && new Date(inv.expires_at) > new Date())
      .map(
        (inv) =>
          ({
            type: "invite" as const,
            id: inv.id,
            email: inv.email,
            role: inv.intended_role || "admin",
            status: "pending",
            inviteCode: inv.invite_code,
            expiresAt: inv.expires_at,
            createdAt: inv.created_at,
          }) satisfies CombinedRow
      ),
  ];

  return (
    <SuperAdminGuard
      fallback={
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Only Super Admins can manage administrators.
          </CardContent>
        </Card>
      }
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Admin Management</CardTitle>
              <CardDescription>Manage administrators and pending invitations</CardDescription>
            </div>
            <Button size="sm" onClick={() => setInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : combinedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No admins found</p>
          ) : (
            <div className="rounded-md border">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.email}</TableCell>
                      <TableCell>{row.type === "admin" ? row.name : "-"}</TableCell>
                      <TableCell>
                        {row.type === "admin" && row.id !== user?.id ? (
                          <Select
                            value={row.role}
                            onValueChange={(newRole) => {
                              updateRole.mutate({
                                userId: row.id,
                                newRole: newRole as "admin" | "super_admin",
                              });
                            }}
                            disabled={updateRole.isPending}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="text-xs capitalize">
                            {row.role.replace("_", " ")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.type === "admin" ? (
                          <Badge className="bg-yield/10 text-yield text-xs">Active</Badge>
                        ) : (
                          <Badge className="bg-yellow-500/10 text-yellow-400 text-xs">
                            Pending Invite
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.type === "invite" && (
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCopyLink(row.inviteCode)}
                              title="Copy invite link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                sendEmail.mutate({
                                  email: row.email,
                                  invite_code: row.inviteCode,
                                  expires_at: row.expiresAt,
                                })
                              }
                              disabled={sendEmail.isPending}
                              title="Send invite email"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => revokeInvite.mutate(row.id)}
                              disabled={revokeInvite.isPending}
                              title="Revoke invite"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New Admin</DialogTitle>
            <DialogDescription>Send an invitation to a new administrator.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createInvite.mutate({ email: inviteEmail, role: inviteRole })}
              disabled={!inviteEmail || createInvite.isPending}
            >
              {createInvite.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminGuard>
  );
}

// ============================================================================
// Account Tab (Profile + Security)
// ============================================================================

function AdminAccountTab() {
  const { data: personalInfo, isLoading } = usePersonalInfo();

  // Map PersonalInfo to the shape ProfileTab expects
  const profile = personalInfo
    ? {
        id: personalInfo.id,
        first_name: personalInfo.first_name,
        last_name: personalInfo.last_name,
        phone: personalInfo.phone,
        email: personalInfo.email,
        avatar_url: personalInfo.avatar_url,
      }
    : null;

  return (
    <div className="space-y-6">
      <ProfileTab profile={profile} loading={isLoading} />
      <SecurityTab />
    </div>
  );
}

// ============================================================================
// Main Settings Page
// ============================================================================

function AdminSettingsContent() {
  const { settings, setSettings, isLoading, isSaving, handleSave } = usePlatformSettingsForm();

  const handleSaveClick = async () => {
    try {
      await handleSave();
      toast.success("Settings saved", {
        description: "Platform settings have been updated successfully.",
      });
    } catch (error) {
      toast.error("Error saving settings", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  return (
    <PageShell maxWidth="narrow">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">Platform configuration and admin management</p>
        </div>
        <Button onClick={handleSaveClick} disabled={isSaving || isLoading}>
          {isSaving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>

          <TabsTrigger value="admins" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Admins
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure basic platform settings and appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="platform_name">Platform Name</Label>
                <Input
                  id="platform_name"
                  value={settings.platform_name}
                  onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                  placeholder="Enter platform name"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable access for non-admin users
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {settings.maintenance_mode && <Badge variant="destructive">Active</Badge>}
                  <Switch
                    checked={settings.maintenance_mode}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, maintenance_mode: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow New Registrations</Label>
                  <p className="text-sm text-muted-foreground">Allow new investors to sign up</p>
                </div>
                <Switch
                  checked={settings.allow_new_registrations}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allow_new_registrations: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure email addresses for notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="notification_email">System Notification Email</Label>
                <Input
                  id="notification_email"
                  type="email"
                  value={settings.notification_email}
                  onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
                  placeholder="notifications@example.com"
                />
                <p className="text-sm text-muted-foreground">
                  Email address for system alerts and notifications
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support_email">Support Email</Label>
                <Input
                  id="support_email"
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  placeholder="support@example.com"
                />
                <p className="text-sm text-muted-foreground">
                  Email address shown to users for support inquiries
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Management */}
        <TabsContent value="admins">
          <AdminManagementTab />
        </TabsContent>

        {/* Account (Personal Profile + Security) */}
        <TabsContent value="account">
          <AdminAccountTab />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

export default function AdminSettings() {
  return (
    <AdminGuard>
      <AdminSettingsContent />
    </AdminGuard>
  );
}
