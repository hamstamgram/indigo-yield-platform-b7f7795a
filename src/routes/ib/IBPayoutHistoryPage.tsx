/**
 * IB Payout History Page
 * Shows withdrawal/payout history for the IB
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageLoadingSpinner } from "@/components/ui/loading-spinner";
import { formatAssetAmount } from "@/utils/assets";
import { format } from "date-fns";
import { Wallet, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

interface Payout {
  id: string;
  amount: number;
  asset: string;
  fundName: string;
  status: string;
  requestedAt: string;
  processedAt: string | null;
}

export default function IBPayoutHistoryPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["ib-payout-history", user?.id, page],
    queryFn: async () => {
      if (!user?.id) return { payouts: [], total: 0 };

      // Query withdrawal_requests for this IB
      const { data: withdrawals, error, count } = await supabase
        .from("withdrawal_requests")
        .select(`
          id,
          requested_amount,
          processed_amount,
          status,
          request_date,
          processed_at,
          funds!inner(name, asset)
        `, { count: "exact" })
        .eq("investor_id", user.id)
        .order("request_date", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error("Error fetching payout history:", error);
        return { payouts: [], total: 0 };
      }

      const payouts: Payout[] = (withdrawals || []).map((w) => {
        const fund = w.funds as any;
        return {
          id: w.id,
          amount: Number(w.processed_amount || w.requested_amount),
          asset: fund?.asset || "USD",
          fundName: fund?.name || "Unknown",
          status: w.status,
          requestedAt: w.request_date,
          processedAt: w.processed_at,
        };
      });

      return { payouts, total: count || 0 };
    },
    enabled: !!user?.id,
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payout History</h1>
        <p className="text-muted-foreground">Your commission withdrawals and payouts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Payout Records ({data?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.payouts && data.payouts.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Requested</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        {format(new Date(payout.requestedAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{payout.fundName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payout.asset}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAssetAmount(payout.amount, payout.asset)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(payout.status)}>
                          {payout.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payout.processedAt
                          ? format(new Date(payout.processedAt), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-center py-12">
              No payout history found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
