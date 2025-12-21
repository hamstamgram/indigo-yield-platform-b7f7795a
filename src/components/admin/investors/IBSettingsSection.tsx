/**
 * IB (Introducing Broker) Settings Section
 * Allows Super Admins to configure IB parent and percentage for investors
 * Includes ability to assign IB role to existing users
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Percent, Save, AlertCircle, UserPlus, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/components/admin/SuperAdminGuard";
import {
  getInvestorIBConfig,
  updateInvestorIBConfig,
  getIBReferrals,
  getAvailableIBParents,
} from "@/services/shared/ibService";

interface IBSettingsSectionProps {
  investorId: string;
  onUpdate?: () => void;
}

interface IBParentOption {
  id: string;
  email: string;
  name: string;
}

interface Referral {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  ibPercentage: number;
}

interface UserSearchResult {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  hasIBRole: boolean;
}

export function IBSettingsSection({ investorId, onUpdate }: IBSettingsSectionProps) {
  const { toast } = useToast();
  const { isSuperAdmin, loading: roleLoading } = useSuperAdmin();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ibParentId, setIbParentId] = useState<string | null>(null);
  const [ibPercentage, setIbPercentage] = useState<number>(0);
  const [availableParents, setAvailableParents] = useState<IBParentOption[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Create IB dialog state
  const [showCreateIBDialog, setShowCreateIBDialog] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigningIBRole, setAssigningIBRole] = useState(false);

  useEffect(() => {
    loadData();
  }, [investorId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load IB config, available parents, and referrals in parallel
      const [config, parents, refs] = await Promise.all([
        getInvestorIBConfig(investorId),
        getAvailableIBParents(investorId),
        getIBReferrals(investorId),
      ]);

      if (config) {
        setIbParentId(config.ibParentId);
        setIbPercentage(config.ibPercentage);
      } else {
        setIbParentId(null);
        setIbPercentage(0);
      }

      setAvailableParents(parents);
      setReferrals(refs);
    } catch (err) {
      console.error("Failed to load IB settings:", err);
      setError("Failed to load IB settings");
    } finally {
      setLoading(false);
    }
  };

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

    setSaving(true);
    try {
      const result = await updateInvestorIBConfig(investorId, ibParentId, ibPercentage);
      
      if (result.success) {
        toast({
          title: "IB Settings Saved",
          description: ibParentId 
            ? `Assigned IB parent with ${ibPercentage}% commission`
            : "IB parent removed successfully",
        });
        // Refresh data to show updated values
        await loadData();
        onUpdate?.();
      } else {
        throw new Error(result.error || "Failed to update IB settings");
      }
    } catch (err) {
      console.error("Failed to save IB settings:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save IB settings";
      // Check for specific DB constraint error
      if (errorMessage.includes("IB parent does not have the IB role")) {
        toast({
          title: "IB Role Required",
          description: "The selected user does not have the IB role. Use 'Assign IB Role' to grant them IB permissions first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchEmail.trim()) return;
    
    setSearching(true);
    try {
      // Search for users by email
      const { data: users, error: searchError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .ilike("email", `%${searchEmail.trim()}%`)
        .neq("id", investorId) // Exclude current investor
        .limit(10);

      if (searchError) throw searchError;

      // Check which users already have IB role
      const userIds = users?.map(u => u.id) || [];
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("user_id", userIds)
        .eq("role", "ib");

      const ibUserIds = new Set(roles?.map(r => r.user_id) || []);

      setSearchResults(
        (users || []).map(u => ({
          ...u,
          hasIBRole: ibUserIds.has(u.id),
        }))
      );
    } catch (err) {
      console.error("Search failed:", err);
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
    setAssigningIBRole(true);
    try {
      // Insert IB role for the user
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: "ib",
        });

      if (roleError) {
        // Check if it's a duplicate
        if (roleError.code === "23505") {
          toast({
            title: "Already an IB",
            description: `${user.email} already has the IB role`,
          });
        } else {
          throw roleError;
        }
      } else {
        toast({
          title: "IB Role Assigned",
          description: `${user.email} now has IB permissions`,
        });
      }

      // Refresh available parents and update search results
      const parents = await getAvailableIBParents(investorId);
      setAvailableParents(parents);
      
      // Update search result to show they now have IB role
      setSearchResults(prev => 
        prev.map(u => u.id === user.id ? { ...u, hasIBRole: true } : u)
      );

      // Auto-select this user as the IB parent
      setIbParentId(user.id);
      setShowCreateIBDialog(false);
      
      toast({
        title: "IB Selected",
        description: `${user.email} has been selected as the IB parent. Don't forget to set the commission percentage and save.`,
      });
    } catch (err) {
      console.error("Failed to assign IB role:", err);
      toast({
        title: "Error",
        description: "Failed to assign IB role",
        variant: "destructive",
      });
    } finally {
      setAssigningIBRole(false);
    }
  };

  const handleSelectExistingIB = (user: UserSearchResult) => {
    setIbParentId(user.id);
    setShowCreateIBDialog(false);
    toast({
      title: "IB Selected",
      description: `${user.email} has been selected as the IB parent. Don't forget to save.`,
    });
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

  // Show read-only view for non-super admins
  const isReadOnly = !isSuperAdmin;

  return (
    <div className="space-y-4">
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
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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
                        {parent.name || parent.email}
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
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
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
            <CardDescription>
              Investors who have this account as their IB parent
            </CardDescription>
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
                        : ref.email}
                    </p>
                    <p className="text-sm text-muted-foreground">{ref.email}</p>
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

      {/* Create/Find IB Dialog */}
      <Dialog open={showCreateIBDialog} onOpenChange={setShowCreateIBDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Find or Assign IB</DialogTitle>
            <DialogDescription>
              Search for an existing user to assign as IB parent. If they don't have the IB role, you can grant it.
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
                          <Badge variant="secondary" className="text-xs">IB</Badge>
                          <Button
                            size="sm"
                            onClick={() => handleSelectExistingIB(user)}
                          >
                            Select
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssignIBRole(user)}
                          disabled={assigningIBRole}
                        >
                          {assigningIBRole ? (
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
    </div>
  );
}
