/**
 * IB Payouts Page
 * Admin page to manage IB commission payouts
 * Issue B: Commission payout status tracking
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { PageLoadingSpinner } from "@/components/ui/loading-spinner";
import { formatAssetAmount } from "@/utils/assets";
import { format, subMonths } from "date-fns";
import { toast } from "sonner";
import { Coins, CheckCircle, Loader2, DollarSign } from "lucide-react";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateAfterIBOperation } from "@/utils/cacheInvalidation";

interface PendingCommission {
  id: string;
  ibInvestorId: string;
  ibName: string;
  ibEmail: string;
  sourceInvestorName: string;
  fundName: string;
  asset: string;
  ibFeeAmount: number;
  effectiveDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  payoutStatus: 'pending' | 'paid';
}

export default function IBPayoutsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.adminIbPayouts(statusFilter),
    queryFn: async () => {
      let query = supabase
        .from("ib_allocations")
        .select(`
          id,
          ib_investor_id,
          source_investor_id,
          ib_fee_amount,
          effective_date,
          period_start,
          period_end,
          payout_status,
          funds!inner(name, asset),
          ib_profile:profiles!ib_allocations_ib_investor_id_fkey(
            first_name,
            last_name,
            email
          ),
          source_profile:profiles!ib_allocations_source_investor_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .order("effective_date", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("payout_status", statusFilter);
      }

      const { data: allocations, error } = await query;

      if (error) {
        console.error("Error fetching IB allocations:", error);
        return [];
      }

      return (allocations || []).map((alloc): PendingCommission => {
        const fund = alloc.funds as any;
        const ibProfile = alloc.ib_profile as any;
        const sourceProfile = alloc.source_profile as any;

        const ibName = ibProfile
          ? `${ibProfile.first_name || ""} ${ibProfile.last_name || ""}`.trim() || ibProfile.email
          : "Unknown IB";
        const sourceName = sourceProfile
          ? `${sourceProfile.first_name || ""} ${sourceProfile.last_name || ""}`.trim() || sourceProfile.email
          : "Unknown";

        return {
          id: alloc.id,
          ibInvestorId: alloc.ib_investor_id,
          ibName,
          ibEmail: ibProfile?.email || "",
          sourceInvestorName: sourceName,
          fundName: fund?.name || "Unknown",
          asset: fund?.asset || "UNKNOWN",
          ibFeeAmount: Number(alloc.ib_fee_amount),
          effectiveDate: alloc.effective_date,
          periodStart: alloc.period_start,
          periodEnd: alloc.period_end,
          payoutStatus: ((alloc as any).payout_status || 'pending') as 'pending' | 'paid',
        };
      });
    },
  });

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user?.id) throw new Error("Not authenticated");

      const batchId = crypto.randomUUID();
      
      const { error } = await supabase
        .from("ib_allocations")
        .update({
          payout_status: "paid",
          paid_at: new Date().toISOString(),
          paid_by: user.id,
          payout_batch_id: batchId,
        })
        .in("id", ids);

      if (error) throw error;
      return { count: ids.length, batchId };
    },
    onSuccess: (result) => {
      toast.success(`Marked ${result.count} commission(s) as paid`, {
        description: `Batch ID: ${result.batchId.slice(0, 8)}...`,
      });
      setSelectedIds(new Set());
      invalidateAfterIBOperation(queryClient);
    },
    onError: (error) => {
      toast.error("Failed to mark commissions as paid", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      const pendingIds = data.filter(c => c.payoutStatus === 'pending').map(c => c.id);
      setSelectedIds(new Set(pendingIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleMarkAsPaid = () => {
    if (selectedIds.size === 0) return;
    setConfirmDialogOpen(true);
  };

  const confirmMarkAsPaid = () => {
    markAsPaidMutation.mutate(Array.from(selectedIds));
    setConfirmDialogOpen(false);
  };

  // Calculate totals by asset for selected items
  const selectedTotals = data
    ?.filter(c => selectedIds.has(c.id))
    .reduce((acc, c) => {
      acc[c.asset] = (acc[c.asset] || 0) + c.ibFeeAmount;
      return acc;
    }, {} as Record<string, number>) || {};

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  const pendingCount = data?.filter(c => c.payoutStatus === 'pending').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IB Commission Payouts</h1>
          <p className="text-muted-foreground">
            Manage and track IB commission payouts
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting payout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected for Payout</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedIds.size}</div>
            {Object.keys(selectedTotals).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(selectedTotals).map(([asset, amount]) => (
                  <Badge key={asset} variant="secondary" className="text-xs">
                    {formatAssetAmount(amount, asset)}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      {selectedIds.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {selectedIds.size} commission(s) selected
              </p>
              <Button onClick={handleMarkAsPaid} disabled={markAsPaidMutation.isPending}>
                {markAsPaidMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <DollarSign className="h-4 w-4 mr-2" />
                Mark as Paid
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Records</CardTitle>
          <CardDescription>
            Select commissions and mark them as paid when processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size > 0 && selectedIds.size === pendingCount}
                      onCheckedChange={handleSelectAll}
                      disabled={pendingCount === 0}
                    />
                  </TableHead>
                  <TableHead>IB</TableHead>
                  <TableHead>Source Investor</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((comm) => (
                  <TableRow key={comm.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(comm.id)}
                        onCheckedChange={(checked) => handleSelectOne(comm.id, !!checked)}
                        disabled={comm.payoutStatus === 'paid'}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{comm.ibName}</p>
                        <p className="text-xs text-muted-foreground">{comm.ibEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>{comm.sourceInvestorName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{comm.asset}</Badge>
                        <span className="text-sm">{comm.fundName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {comm.periodStart && comm.periodEnd
                        ? `${format(new Date(comm.periodStart), "MMM d")} - ${format(new Date(comm.periodEnd), "MMM d, yyyy")}`
                        : format(new Date(comm.effectiveDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatAssetAmount(comm.ibFeeAmount, comm.asset)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={comm.payoutStatus === 'paid' ? 'default' : 'outline'}>
                        {comm.payoutStatus === 'paid' ? 'Paid' : 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-12">
              No commissions found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payout</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to mark {selectedIds.size} commission(s) as paid. This action will be logged in the audit trail.
              {Object.keys(selectedTotals).length > 0 && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="font-medium mb-2">Total amounts:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedTotals).map(([asset, amount]) => (
                      <Badge key={asset} variant="secondary">
                        {formatAssetAmount(amount, asset)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkAsPaid}>
              Confirm Payout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
