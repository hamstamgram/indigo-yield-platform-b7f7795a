/**
 * IB (Introducing Broker) Settings Section
 * Allows Super Admins to configure IB parent and percentage for investors
 * Includes ability to assign IB role to existing users
 * NEW: Includes "Promote to IB" functionality for the current investor
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Alert,
  AlertDescription,
} from "@/components/ui";
import {
  Loader2,
  Users,
  Percent,
  Save,
  AlertCircle,
  UserPlus,
  Search,
  Crown,
  Trash2,
} from "lucide-react";
import { IBScheduleSection } from "./IBScheduleSection";
import { useToast } from "@/hooks";
import { logError } from "@/lib/logger";
import { useSuperAdmin } from "@/features/admin/shared/SuperAdminGuard";
import {
  useIBSettings,
  useSearchUsersForIB,
  useUpdateIBConfig,
  useAssignIBRole,
  usePromoteToIB,
  useRemoveIBRole,
  type UserSearchResult,
} from "@/hooks/data";

interface IBSettingsSectionProps {
  investorId: string;
  onUpdate?: () => void;
}

export function IBSettingsSection({ investorId, onUpdate }: IBSettingsSectionProps) {
  const { toast } = useToast();
  const { isSuperAdmin, loading: roleLoading } = useSuperAdmin();

  // Use data hooks
  const { data: ibSettings, isLoading: loading, error, refetch } = useIBSettings(investorId);
  const { searchUsers } = useSearchUsersForIB(investorId);
  const updateIBConfigMutation = useUpdateIBConfig();
  const assignIBRoleMutation = useAssignIBRole();
  const promoteToIBMutation = usePromoteToIB();
  const removeIBRoleMutation = useRemoveIBRole();

  // Local state for form
  const [ibParentId, setIbParentId] = useState<string | null>(null);
  const [ibPercentage, setIbPercentage] = useState<number>(0);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showRemoveIBDialog, setShowRemoveIBDialog] = useState(false);

  // Create IB dialog state
  const [showCreateIBDialog, setShowCreateIBDialog] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Sync local state with fetched data
  useState(() => {
    if (ibSettings) {
      setIbParentId(ibSettings.ibParentId);
      setIbPercentage(ibSettings.ibPercentage);
    }
  });

  // Update local state when data changes
  if (ibSettings && ibParentId === null && ibSettings.ibParentId !== null) {
    setIbParentId(ibSettings.ibParentId);
    setIbPercentage(ibSettings.ibPercentage);
  }

  const handleSave = async () => {
    // Validation: IB percentage required if IB parent is set
    if (ibParentId && ibPercentage <= 0) {
      toast({
        title: "Validation Error",
        description: "IB commission percentage is required when an IB parent is set",
        variant: "destructive",
      });
      return;
    }

    // Validation: percentage range
    if (ibPercentage < 0 || ibPercentage > 100) {
      toast({
        title: "Validation Error",
        description: "IB commission must be between 0% and 100%",
        variant: "destructive",
      });
      return;
    }

    await updateIBConfigMutation.mutateAsync({
      investorId,
      ibParentId,
      ibPercentage,
    });
    onUpdate?.();
  };

  const handleSearchUsers = async () => {
    if (!searchEmail.trim()) return;

    setSearching(true);
    try {
      const results = await searchUsers(searchEmail);
      setSearchResults(results);
    } catch (err) {
      logError("IBSettingsSection.handleSearchUsers", err, { searchEmail });
      toast({
        title: "Search Failed",
        description: "Could not search for users",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleAssignIBRole = async (user: UserSearchResult) => {
    await assignIBRoleMutation.mutateAsync({
      userId: user.id,
      investorId,
    });

    // Update search result to show they now have IB role
    setSearchResults((prev) => prev.map((u) => (u.id === user.id ? { ...u, hasIBRole: true } : u)));

    // Auto-select this user as the IB parent
    setIbParentId(user.id);
    setShowCreateIBDialog(false);

    toast({
      title: "IB Selected",
      description: `${user.email} has been selected as the IB parent. Don't forget to set the commission percentage and save.`,
    });
  };

  const handleSelectExistingIB = (user: UserSearchResult) => {
    setIbParentId(user.id);
    setShowCreateIBDialog(false);
    toast({
      title: "IB Selected",
      description: `${user.email} has been selected as the IB parent. Don't forget to save.`,
    });
  };

  const handlePromoteToIB = async () => {
    await promoteToIBMutation.mutateAsync(investorId);
    setShowPromoteDialog(false);
    onUpdate?.();
  };

  const handleRemoveIBRole = async () => {
    const hasReferrals = (ibSettings?.referrals?.length || 0) > 0;
    if (hasReferrals) {
      toast({
        title: "Cannot Remove IB Role",
        description: `This investor has ${ibSettings?.referrals.length} active referral(s). Reassign them first.`,
        variant: "destructive",
      });
      setShowRemoveIBDialog(false);
      return;
    }

    await removeIBRoleMutation.mutateAsync({ investorId, hasReferrals });
    setShowRemoveIBDialog(false);
    onUpdate?.();
  };

  if (roleLoading || loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load IB settings</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show read-only view for non-super admins
  const isReadOnly = !isSuperAdmin;
  const hasIBRole = ibSettings?.hasIBRole || false;
  const availableParents = ibSettings?.availableParents || [];
  const referrals = ibSettings?.referrals || [];

  return (
    <div className="space-y-4">
      {/* Promote to IB Card - Only show if investor is NOT already an IB */}
      {!hasIBRole && !isReadOnly && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-5 w-5 text-primary" />
              Promote to Introducing Broker
            </CardTitle>
            <CardDescription>
              Grant this investor IB permissions so they can earn referral commissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowPromoteDialog(true)}>
              <Crown className="h-4 w-4 mr-2" />
              Promote to IB
            </Button>
          </CardContent>
        </Card>
      )}

      {/* IB Status Badge - Show if investor IS an IB */}
      {hasIBRole && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-green-600">
                  <Crown className="h-3 w-3 mr-1" />
                  Active IB
                </Badge>
                <span className="text-sm text-muted-foreground">
                  This investor can receive referral commissions
                </span>
              </div>
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowRemoveIBDialog(true)}
                  disabled={referrals.length > 0}
                  title={
                    referrals.length > 0
                      ? "Cannot remove IB with active referrals"
                      : "Remove IB role"
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* IB Parent Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            IB (Introducing Broker) Settings
          </CardTitle>
          <CardDescription>
            Configure referral relationships and commission percentages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isReadOnly && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only Super Admins can modify IB settings. You have read-only access.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* IB Parent Selection */}
            <div className="space-y-2">
              <Label htmlFor="ib-parent">IB Parent (Referrer)</Label>
              <div className="flex gap-2">
                <Select
                  value={ibParentId || "none"}
                  onValueChange={(value) => setIbParentId(value === "none" ? null : value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="ib-parent" className="flex-1">
                    <SelectValue placeholder="Select IB parent..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No IB Parent</SelectItem>
                    {availableParents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.name || parent.emailMasked || "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setShowCreateIBDialog(true);
                      setSearchEmail("");
                      setSearchResults([]);
                    }}
                    title="Find or create IB"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                The investor who referred this account
              </p>
            </div>

            {/* IB Percentage */}
            <div className="space-y-2">
              <Label htmlFor="ib-percentage">IB Commission (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="ib-percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={ibPercentage}
                  onChange={(e) => setIbPercentage(parseFloat(e.target.value) || 0)}
                  disabled={isReadOnly || !ibParentId}
                  className="font-mono"
                />
                <Percent className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Percentage of net income allocated to IB parent
              </p>
            </div>
          </div>

          {!isReadOnly && (
            <Button
              onClick={handleSave}
              disabled={updateIBConfigMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateIBConfigMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save IB Settings
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Referrals List */}
      {referrals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Referrals (This Investor is IB Parent)</CardTitle>
            <CardDescription>Investors who have this account as their IB parent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {ref.firstName || ref.lastName
                        ? `${ref.firstName || ""} ${ref.lastName || ""}`.trim()
                        : ref.emailMasked || "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">{ref.emailMasked || "—"}</p>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {ref.ibPercentage}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* IB Commission Schedule */}
      <IBScheduleSection investorId={investorId} />

      {/* Create/Find IB Dialog */}
      <Dialog open={showCreateIBDialog} onOpenChange={setShowCreateIBDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Find or Assign IB</DialogTitle>
            <DialogDescription>
              Search for an existing user to assign as IB parent. If they don't have the IB role,
              you can grant it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchUsers()}
              />
              <Button onClick={handleSearchUsers} disabled={searching} variant="outline">
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {user.first_name || user.last_name
                          ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                          : user.email}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {user.hasIBRole ? (
                        <>
                          <Badge variant="secondary" className="text-xs">
                            IB
                          </Badge>
                          <Button size="sm" onClick={() => handleSelectExistingIB(user)}>
                            Select
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssignIBRole(user)}
                          disabled={assignIBRoleMutation.isPending}
                        >
                          {assignIBRoleMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <UserPlus className="h-3 w-3 mr-1" />
                          )}
                          Assign IB Role
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchEmail && !searching && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found matching "{searchEmail}"
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateIBDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote to IB Confirmation Dialog */}
      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Promote to Introducing Broker
            </DialogTitle>
            <DialogDescription>
              This will grant the investor IB permissions, allowing them to:
            </DialogDescription>
          </DialogHeader>

          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li>Earn referral commissions from referred investors</li>
            <li>Access the IB portal and dashboard</li>
            <li>View their referral network and earnings</li>
          </ul>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The investor will retain their existing investor role. This action adds the IB role.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPromoteDialog(false)}
              disabled={promoteToIBMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handlePromoteToIB} disabled={promoteToIBMutation.isPending}>
              {promoteToIBMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Crown className="h-4 w-4 mr-2" />
              )}
              Confirm Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove IB Role Confirmation Dialog */}
      <Dialog open={showRemoveIBDialog} onOpenChange={setShowRemoveIBDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Remove IB Role
            </DialogTitle>
            <DialogDescription>This will revoke the investor's IB permissions.</DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The investor will no longer be able to access the IB portal or receive referral
              commissions.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveIBDialog(false)}
              disabled={removeIBRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveIBRole}
              disabled={removeIBRoleMutation.isPending}
            >
              {removeIBRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove IB Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
