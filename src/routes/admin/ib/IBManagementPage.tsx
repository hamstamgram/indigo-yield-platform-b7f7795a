/**
 * IB Management Page
 * Admin page to manage Introducing Brokers (IBs)
 * 
 * NOTE: IB earnings are displayed per-asset (token-denominated) to avoid USD aggregation
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Users, TrendingUp, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatCrypto } from "@/utils/financial";

interface EarningsByAsset {
  [assetSymbol: string]: number;
}

interface IBProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  referralCount: number;
  earningsByAsset: EarningsByAsset;
  activeFunds: string[];
}

export default function IBManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newIBEmail, setNewIBEmail] = useState("");
  const [newIBFirstName, setNewIBFirstName] = useState("");
  const [newIBLastName, setNewIBLastName] = useState("");

  // Fetch all IBs with per-asset earnings
  const { data: ibs, isLoading } = useQuery({
    queryKey: ["ibs"],
    queryFn: async (): Promise<IBProfile[]> => {
      // Get all users with IB role
      const { data: ibRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "ib");

      if (rolesError) throw rolesError;

      if (!ibRoles || ibRoles.length === 0) {
        return [];
      }

      const ibUserIds = ibRoles.map((r) => r.user_id);

      // Get profile details for IBs
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, created_at")
        .in("id", ibUserIds);

      if (profilesError) throw profilesError;

      // Get referral counts
      const { data: referrals, error: refError } = await supabase
        .from("profiles")
        .select("ib_parent_id")
        .in("ib_parent_id", ibUserIds);

      // Get IB allocations with fund info to determine asset
      const { data: allocations, error: allocError } = await supabase
        .from("ib_allocations")
        .select("ib_investor_id, ib_fee_amount, fund_id")
        .in("ib_investor_id", ibUserIds);

      // Get funds to map fund_id -> asset
      const fundIds = [...new Set((allocations || []).map((a) => a.fund_id).filter(Boolean))];
      const { data: funds } = await supabase
        .from("funds")
        .select("id, asset")
        .in("id", fundIds);

      const fundToAsset = new Map<string, string>();
      funds?.forEach((f) => fundToAsset.set(f.id, f.asset));

      // Aggregate data per IB with per-asset earnings
      const ibProfiles: IBProfile[] = (profiles || []).map((p) => {
        const refs = (referrals || []).filter((r) => r.ib_parent_id === p.id);
        const allocs = (allocations || []).filter((a) => a.ib_investor_id === p.id);
        const activeFunds = [...new Set(allocs.map((a) => a.fund_id).filter(Boolean))] as string[];

        // Group earnings by asset
        const earningsByAsset: EarningsByAsset = {};
        allocs.forEach((a) => {
          if (a.fund_id) {
            const asset = fundToAsset.get(a.fund_id) || "UNKNOWN";
            earningsByAsset[asset] = (earningsByAsset[asset] || 0) + Number(a.ib_fee_amount || 0);
          }
        });

        return {
          id: p.id,
          email: p.email,
          firstName: p.first_name,
          lastName: p.last_name,
          createdAt: p.created_at,
          referralCount: refs.length,
          earningsByAsset,
          activeFunds,
        };
      });

      return ibProfiles;
    },
  });

  // Create new IB mutation
  const createIBMutation = useMutation({
    mutationFn: async (data: { email: string; firstName: string; lastName: string }) => {
      // First, check if user already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();

      if (!existingProfile) {
        throw new Error(
          "User profile does not exist. Please invite this user first through the investor invite flow, then assign IB role."
        );
      }

      const userId = existingProfile.id;

      // Check if already has IB role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "ib")
        .maybeSingle();

      if (existingRole) {
        throw new Error("This user is already an IB.");
      }

      // Add IB role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: "ib",
      });

      if (roleError) {
        throw roleError;
      }

      return { userId };
    },
    onSuccess: () => {
      toast.success("IB Created", {
        description: "The Introducing Broker has been set up.",
      });
      queryClient.invalidateQueries({ queryKey: ["ibs"] });
      setIsCreateDialogOpen(false);
      setNewIBEmail("");
      setNewIBFirstName("");
      setNewIBLastName("");
    },
    onError: (error) => {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to create IB",
      });
    },
  });

  const handleCreateIB = () => {
    if (!newIBEmail) {
      toast.error("Email is required");
      return;
    }
    createIBMutation.mutate({
      email: newIBEmail,
      firstName: newIBFirstName,
      lastName: newIBLastName,
    });
  };

  // Calculate totals
  const totalIBs = ibs?.length || 0;
  const totalReferrals = ibs?.reduce((sum, ib) => sum + ib.referralCount, 0) || 0;

  // Aggregate all earnings by asset across all IBs
  const allEarningsByAsset: EarningsByAsset = {};
  ibs?.forEach((ib) => {
    Object.entries(ib.earningsByAsset).forEach(([asset, amount]) => {
      allEarningsByAsset[asset] = (allEarningsByAsset[asset] || 0) + amount;
    });
  });

  // Format earnings display for a single IB
  const formatEarningsDisplay = (earnings: EarningsByAsset) => {
    const entries = Object.entries(earnings);
    if (entries.length === 0) return "—";
    return entries.map(([asset, amount]) => formatCrypto(amount, 4, asset)).join(", ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IB Management</h1>
          <p className="text-muted-foreground">
            Manage Introducing Brokers and track their referral performance
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add IB
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Introducing Broker</DialogTitle>
              <DialogDescription>
                Set up a new IB account. They will be able to refer investors and earn commissions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ib-email">Email *</Label>
                <Input
                  id="ib-email"
                  type="email"
                  value={newIBEmail}
                  onChange={(e) => setNewIBEmail(e.target.value)}
                  placeholder="ib@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ib-first-name">First Name</Label>
                  <Input
                    id="ib-first-name"
                    value={newIBFirstName}
                    onChange={(e) => setNewIBFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ib-last-name">Last Name</Label>
                  <Input
                    id="ib-last-name"
                    value={newIBLastName}
                    onChange={(e) => setNewIBLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateIB} disabled={createIBMutation.isPending}>
                {createIBMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create IB
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IBs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIBs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IB Earnings</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(allEarningsByAsset).length === 0 ? (
                <div className="text-2xl font-bold text-muted-foreground">—</div>
              ) : (
                Object.entries(allEarningsByAsset).map(([asset, amount]) => (
                  <div key={asset} className="text-lg font-semibold font-mono">
                    {formatCrypto(amount, 4, asset)}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* IB List */}
      <Card>
        <CardHeader>
          <CardTitle>Introducing Brokers</CardTitle>
          <CardDescription>All registered IBs and their performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !ibs || ibs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No Introducing Brokers found. Click "Add IB" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Referrals</TableHead>
                  <TableHead className="text-center">Active Funds</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ibs.map((ib) => (
                  <TableRow
                    key={ib.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/investors/${ib.id}`)}
                  >
                    <TableCell className="font-medium">
                      {ib.firstName || ib.lastName
                        ? `${ib.firstName || ""} ${ib.lastName || ""}`.trim()
                        : "—"}
                    </TableCell>
                    <TableCell>{ib.email}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{ib.referralCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{ib.activeFunds.length}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatEarningsDisplay(ib.earningsByAsset)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(ib.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}