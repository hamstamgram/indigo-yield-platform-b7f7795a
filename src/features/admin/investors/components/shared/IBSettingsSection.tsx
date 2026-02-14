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
  Switch,
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
  Info,
  Link2,
  Link2Off,
} from "lucide-react";
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
  useCreateIB,
  type UserSearchResult,
} from "@/hooks/data";

import { IBScheduleSection } from "./IBScheduleSection";

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
  const createIBMutation = useCreateIB();

  // Local state for form
  const [ibParentId, setIbParentId] = useState<string | null>(null);
  const [ibPercentage, setIbPercentage] = useState<number>(0);
  const [ibCommissionSource, setIbCommissionSource] = useState<"manual" | "investor_fee">("manual");
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showRemoveIBDialog, setShowRemoveIBDialog] = useState(false);

  // Create IB dialog state
  const [showCreateIBDialog, setShowCreateIBDialog] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newIBForm, setNewIBForm] = useState({ firstName: "", lastName: "" });

  // Sync local state with fetched data
  useState(() => {
    if (ibSettings) {
      setIbParentId(ibSettings.ibParentId);
      setIbPercentage(ibSettings.ibPercentage);
      setIbCommissionSource(ibSettings.ibCommissionSource);
    }
  });

  // Update local state when data changes
  if (ibSettings && ibParentId === null && ibSettings.ibParentId !== null) {
    setIbParentId(ibSettings.ibParentId);
    setIbPercentage(ibSettings.ibPercentage);
    setIbCommissionSource(ibSettings.ibCommissionSource);
  }

  const handleSave = async () => {
    // Validation: IB parent choice handles its own assignment logic,
    // but the schedule now handles all commission percentages.

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
      ibCommissionSource,
    });
    onUpdate?.();
  };

  const handleSearchUsers = async () => {
    if (!searchEmail.trim()) return;

    setSearching(true);
    setIsCreatingNew(false);
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

  const handleCreateNewIB = async () => {
    if (!searchEmail || !newIBForm.firstName || !newIBForm.lastName) {
      toast({
        title: "Required Fields",
        description: "Email, first name, and last name are required to create a new IB.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createIBMutation.mutateAsync({
        email: searchEmail,
        firstName: newIBForm.firstName,
        lastName: newIBForm.lastName,
      });

      if (result.userId) {
        setIbParentId(result.userId);
        setShowCreateIBDialog(false);
        setIsCreatingNew(false);
        setNewIBForm({ firstName: "", lastName: "" });

        toast({
          title: "IB Created & Assigned",
          description: `New IB account created for ${searchEmail} and assigned as parent.`,
        });

        // Refetch to get the new parent in the list
        refetch();
      }
    } catch (err) {
      logError("IBSettingsSection.handleCreateNewIB", err);
      // Toast is handled by the mutation hook
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
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            IB (Introducing Broker) Settings
          </CardTitle>
          <CardDescription>
            Configure referral relationships and commission percentages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Read-only Alert */}
          {isReadOnly && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only Super Admins can modify IB settings. You have read-only access.
              </AlertDescription>
            </Alert>
          )}

          {/* IB Parent and Global Percentage Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* IB Parent Selection */}
            <div className="space-y-2">
              <Label htmlFor="ib-parent" className="text-sm font-medium">
                IB Parent (Referrer)
              </Label>
              <div className="flex gap-2">
                <Select
                  value={ibParentId || "none"}
                  onValueChange={(value) => setIbParentId(value === "none" ? null : value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="ib-parent" className="w-full">
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
                      setIsCreatingNew(false);
                    }}
                    title="Find or create IB"
                    className="shrink-0"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                The investor who referred this account
              </p>
            </div>

            {/* Global IB Commission */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ib-percentage" className="text-sm font-medium">
                    Global IB Commission (%)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="link-fees" className="text-xs text-muted-foreground">
                      Link to Investor Fee
                    </Label>
                    <Switch
                      id="link-fees"
                      checked={ibCommissionSource === "investor_fee"}
                      onCheckedChange={(checked) =>
                        setIbCommissionSource(checked ? "investor_fee" : "manual")
                      }
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="relative">
                  <Input
                    id="ib-percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={ibPercentage}
                    onChange={(e) => setIbPercentage(parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly || ibCommissionSource === "investor_fee"}
                    className="pr-8 font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {ibCommissionSource === "investor_fee"
                    ? "Automatically synced with investor's performance fee"
                    : "Default commission percentage for all funds"}
                </p>
              </div>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex justify-start">
              <Button onClick={handleSave} disabled={updateIBConfigMutation.isPending} size="sm">
                {updateIBConfigMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Update IB Parent
              </Button>
            </div>
          )}

          {/* Overrides Header removed for direct integration */}
          <IBScheduleSection investorId={investorId} />
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

      {/* Referrals List moved naturally above */}

      {/* Create/Find IB Dialog */}
      <Dialog open={showCreateIBDialog} onOpenChange={setShowCreateIBDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Find or Assign IB</DialogTitle>
            <DialogDescription>
              Search for an existing user to assign as IB parent or create a new one.
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

            {searchResults.length === 0 && searchEmail && !searching && !isCreatingNew && (
              <div className="text-center py-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  No users found matching "{searchEmail}"
                </p>
                <Button variant="outline" onClick={() => setIsCreatingNew(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create New IB with this Email
                </Button>
              </div>
            )}

            {isCreatingNew && (
              <div className="space-y-4 border p-4 rounded-lg bg-muted/30">
                <p className="text-sm font-medium">Create New IB Account</p>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input value={searchEmail} readOnly className="bg-muted" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="new-ib-first" className="text-xs">
                        First Name
                      </Label>
                      <Input
                        id="new-ib-first"
                        placeholder="John"
                        value={newIBForm.firstName}
                        onChange={(e) =>
                          setNewIBForm((prev) => ({ ...prev, firstName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-ib-last" className="text-xs">
                        Last Name
                      </Label>
                      <Input
                        id="new-ib-last"
                        placeholder="Doe"
                        value={newIBForm.lastName}
                        onChange={(e) =>
                          setNewIBForm((prev) => ({ ...prev, lastName: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsCreatingNew(false)}>
                    Back to Search
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateNewIB}
                    disabled={createIBMutation.isPending}
                  >
                    {createIBMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Save className="h-3 w-3 mr-1" />
                    )}
                    Create & Assign
                  </Button>
                </div>
              </div>
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
