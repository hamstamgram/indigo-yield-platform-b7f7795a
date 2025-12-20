/**
 * Admin List Page
 * Displays all admins with their roles and status
 * Only accessible to Super Admins
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, ShieldCheck, UserPlus, Trash2, Search } from "lucide-react";
import { SuperAdminGuard } from "@/components/admin/SuperAdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "super_admin" | "admin";
  createdAt: string;
}

function AdminListContent() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "super_admin">("admin");
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();

  const loadAdmins = async () => {
    setLoading(true);
    try {
      // Get all profiles that are admins
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, created_at")
        .eq("is_admin", true)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get roles for each admin
      const adminList: AdminUser[] = [];
      for (const profile of profiles || []) {
        // Check for super_admin role first
        const { data: superAdminRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.id)
          .eq("role", "super_admin")
          .maybeSingle();

        adminList.push({
          id: profile.id,
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          role: superAdminRole ? "super_admin" : "admin",
          createdAt: profile.created_at,
        });
      }

      setAdmins(adminList);
    } catch (error) {
      console.error("Error loading admins:", error);
      toast({
        title: "Error",
        description: "Failed to load admin list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleInviteAdmin = async () => {
    if (!inviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setInviting(true);
    try {
      // Generate invite code
      const inviteCode = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create invite
      const { error } = await supabase
        .from("admin_invites")
        .insert({
          email: inviteEmail.toLowerCase().trim(),
          invite_code: inviteCode,
          expires_at: expiresAt.toISOString(),
          created_by: user?.id,
        });

      if (error) throw error;

      const inviteLink = `${window.location.origin}/admin/invite?code=${inviteCode}`;

      toast({
        title: "Invite Created",
        description: (
          <div className="space-y-2">
            <p>Invitation sent to {inviteEmail}</p>
            <p className="text-xs text-muted-foreground">
              Share this link with the admin:
            </p>
            <code className="text-xs bg-muted p-1 rounded block break-all">
              {inviteLink}
            </code>
          </div>
        ),
      });

      // If super_admin role, we'll set it when they accept the invite
      // Store the intended role somewhere (could use metadata or a separate table)
      
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("admin");
    } catch (error) {
      console.error("Error creating invite:", error);
      toast({
        title: "Error",
        description: "Failed to create invite",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (adminId: string, newRole: "admin" | "super_admin") => {
    try {
      // Use secure RPC function that enforces super_admin check server-side
      const { data, error } = await supabase
        .rpc("update_admin_role", {
          p_target_user_id: adminId,
          p_new_role: newRole,
        });

      if (error) {
        // Handle specific error messages
        if (error.message.includes("Super Admin")) {
          toast({
            title: "Permission Denied",
            description: error.message,
            variant: "destructive",
          });
        } else if (error.message.includes("demote yourself")) {
          toast({
            title: "Action Not Allowed",
            description: "You cannot demote yourself from Super Admin",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Role Updated",
        description: `Admin role changed to ${newRole === "super_admin" ? "Super Admin" : "Admin"}`,
      });

      loadAdmins();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
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
                  <TableCell>
                    {format(new Date(admin.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={admin.role}
                      onValueChange={(value) =>
                        handleRoleChange(admin.id, value as "admin" | "super_admin")
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
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
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
            <Button onClick={handleInviteAdmin} disabled={inviting}>
              {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
