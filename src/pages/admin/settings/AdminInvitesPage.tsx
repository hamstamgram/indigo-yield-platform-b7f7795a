/**
 * Admin Invites Page
 * Manage admin invitations - view, create, revoke
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks";
import { SuperAdminGuard } from "@/components/admin/SuperAdminGuard";
import {
  useAdminInvitesList,
  useCreateAdminInvite,
  useRevokeAdminInvite,
  type AdminInvite,
} from "@/hooks/data/admin/useAdminInvitesPage";
import {
  Users,
  UserPlus,
  Copy,
  Trash2,
  Shield,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, isPast } from "date-fns";

type InviteStatus = "pending" | "used" | "expired";

function getInviteStatus(invite: AdminInvite): InviteStatus {
  if (invite.used) return "used";
  if (isPast(new Date(invite.expires_at))) return "expired";
  return "pending";
}

function AdminInvitesContent() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [revokeInvite, setRevokeInvite] = useState<AdminInvite | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");
  const [statusFilter, setStatusFilter] = useState<InviteStatus | "all">("all");

  // Use extracted hooks
  const { data: invites, isLoading } = useAdminInvitesList();

  const createMutation = useCreateAdminInvite({
    onSuccess: ({ email, inviteCode }) => {
      const inviteLink = `${window.location.origin}/admin/invite?code=${inviteCode}`;
      navigator.clipboard.writeText(inviteLink);
      
      toast({
        title: "Invite Created",
        description: (
          <div className="space-y-2">
            <p>Invitation created for {email}</p>
            <p className="text-xs text-muted-foreground">Link copied to clipboard</p>
          </div>
        ),
      });
      setShowCreateDialog(false);
      setNewEmail("");
      setNewRole("admin");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeMutation = useRevokeAdminInvite({
    onSuccess: () => {
      toast({
        title: "Invite Revoked",
        description: "The invitation has been revoked",
      });
      setRevokeInvite(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/admin/invite?code=${code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied",
      description: "Invite link copied to clipboard",
    });
  };

  const filteredInvites = invites?.filter((invite) => {
    if (statusFilter === "all") return true;
    return getInviteStatus(invite) === statusFilter;
  });

  const statusBadge = (status: InviteStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "used":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Used
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Expired
          </Badge>
        );
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/settings-platform">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Admin Invites
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage administrator invitations
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Create Invite
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invitations</CardTitle>
              <CardDescription>
                {invites?.length || 0} total invitations
              </CardDescription>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as InviteStatus | "all")}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-24" />
                </div>
              ))}
            </div>
          ) : filteredInvites?.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                {statusFilter === "all"
                  ? "No invitations yet"
                  : `No ${statusFilter} invitations`}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create First Invite
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvites?.map((invite) => {
                  const status = getInviteStatus(invite);
                  return (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {invite.intended_role === "super_admin" ? (
                            <>
                              <ShieldCheck className="h-3 w-3" />
                              Super Admin
                            </>
                          ) : (
                            <>
                              <Shield className="h-3 w-3" />
                              Admin
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{statusBadge(status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(invite.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(invite.expires_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyInviteLink(invite.invite_code)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setRevokeInvite(invite)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Admin Invite</DialogTitle>
            <DialogDescription>
              Send an invitation to add a new administrator
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "super_admin")}>
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
                {newRole === "super_admin"
                  ? "Super Admins can manage other admins and all settings"
                  : "Admins can view data and send reports"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate({ email: newEmail, role: newRole })}
              disabled={!newEmail || createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create & Copy Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!revokeInvite} onOpenChange={() => setRevokeInvite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the invitation sent to{" "}
              <strong>{revokeInvite?.email}</strong>. They will no longer be able
              to use this link to become an admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeInvite && revokeMutation.mutate(revokeInvite.id)}
            >
              {revokeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminInvitesPage() {
  return (
    <SuperAdminGuard>
      <AdminInvitesContent />
    </SuperAdminGuard>
  );
}
