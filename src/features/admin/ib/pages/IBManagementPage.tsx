/**
 * IB Management Page
 * Admin page to manage Introducing Brokers (IBs)
 *
 * NOTE: IB earnings are displayed per-asset (token-denominated) to avoid USD aggregation
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  SortableTableHead,
} from "@/components/ui";
import { Loader2, Plus, Users, TrendingUp, Coins } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { format } from "date-fns";
import { formatCrypto } from "@/utils/financial";
import { useIBProfiles, useCreateIB, useSortableColumns, type EarningsByAsset } from "@/hooks";
import { PageShell } from "@/components/layout/PageShell";

export default function IBManagementPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newIBEmail, setNewIBEmail] = useState("");
  const [newIBFirstName, setNewIBFirstName] = useState("");
  const [newIBLastName, setNewIBLastName] = useState("");

  // Use extracted hooks
  const { data: ibs, isLoading } = useIBProfiles();

  const { sortedData, sortConfig, requestSort } = useSortableColumns(ibs || [], {
    column: "createdAt",
    direction: "desc",
  });

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

  const inner = (
    <>
      <div className="flex items-center justify-between">
        {!embedded && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight">IB Management</h1>
            <p className="text-muted-foreground">
              Manage Introducing Brokers and track their referral performance
            </p>
          </div>
        )}
        {embedded && <div />}
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
                  <div
                    key={asset}
                    className="flex items-center gap-2 text-lg font-semibold font-mono"
                  >
                    <CryptoIcon symbol={asset} className="h-5 w-5" />
                    {formatCrypto(String(amount), 4, asset)}
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground mb-1">No Introducing Brokers yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first IB to start tracking referrals and commissions.
              </p>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add IB
              </Button>
            </div>
          ) : (
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    column="firstName"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="whitespace-nowrap"
                  >
                    Name
                  </SortableTableHead>
                  <SortableTableHead
                    column="email"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="whitespace-nowrap"
                  >
                    Email
                  </SortableTableHead>
                  <SortableTableHead
                    column="referralCount"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-center whitespace-nowrap"
                  >
                    Referrals
                  </SortableTableHead>
                  <SortableTableHead
                    column="activeAssets"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="text-center whitespace-nowrap"
                  >
                    Funds
                  </SortableTableHead>
                  <TableHead className="text-right whitespace-nowrap">Earnings</TableHead>
                  <SortableTableHead
                    column="createdAt"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="whitespace-nowrap"
                  >
                    Created
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((ib) => (
                  <TableRow
                    key={ib.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/investors/${ib.id}`)}
                  >
                    <TableCell className="font-medium py-1.5 truncate max-w-[140px]">
                      {ib.firstName || ib.lastName
                        ? `${ib.firstName || ""} ${ib.lastName || ""}`.trim()
                        : "—"}
                    </TableCell>
                    <TableCell className="py-1.5 truncate max-w-[160px]">{ib.email}</TableCell>
                    <TableCell className="text-center py-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {ib.referralCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center py-1.5">
                      <div className="flex items-center justify-center gap-1">
                        {ib.activeAssets.length > 0 ? (
                          ib.activeAssets.map((asset: string) => (
                            <CryptoIcon key={asset} symbol={asset} className="h-3.5 w-3.5" />
                          ))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-1.5">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {Object.entries(ib.earningsByAsset).length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          Object.entries(ib.earningsByAsset).map(([asset, amount]) => (
                            <div key={asset} className="flex items-center gap-1">
                              <CryptoIcon symbol={asset} className="h-3.5 w-3.5" />
                              <span className="font-mono tabular-nums">
                                {formatCrypto(String(amount), 4, asset)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap py-1.5">
                      {format(new Date(ib.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );

  if (embedded) return inner;
  return <PageShell>{inner}</PageShell>;
}
