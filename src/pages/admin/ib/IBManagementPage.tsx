/**
 * IB Management Page
 * Admin page to manage Introducing Brokers (IBs)
 * 
 * NOTE: IB earnings are displayed per-asset (token-denominated) to avoid USD aggregation
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { formatCrypto } from "@/utils/financial";
import {
  useIBProfiles,
  useCreateIB,
  type EarningsByAsset,
} from "@/hooks/data/admin/useIBManagementPage";

export default function IBManagementPage() {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newIBEmail, setNewIBEmail] = useState("");
  const [newIBFirstName, setNewIBFirstName] = useState("");
  const [newIBLastName, setNewIBLastName] = useState("");

  // Use extracted hooks
  const { data: ibs, isLoading } = useIBProfiles();

  const createIBMutation = useCreateIB({
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      setNewIBEmail("");
      setNewIBFirstName("");
      setNewIBLastName("");
    },
  });

  const handleCreateIB = () => {
    if (!newIBEmail) {
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
