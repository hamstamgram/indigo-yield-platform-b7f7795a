/**
 * IB Referrals Page
 * Lists all investors referred by this IB
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { EmptyState } from "@/components/ui/empty-state";
import { formatAssetAmount } from "@/utils/assets";
import { format } from "date-fns";
import { Search, Users, ChevronRight, ChevronLeft, UserPlus } from "lucide-react";
import { QUERY_KEYS } from "@/constants/queryKeys";

interface Referral {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: string;
  joinedAt: string;
  activeFunds: number;
  holdings: Record<string, number>;
}

const PAGE_SIZE = 10;

export default function IBReferralsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.ibReferrals(user?.id, page),
    queryFn: async () => {
      if (!user?.id) return { referrals: [], total: 0 };

      // Get referrals with pagination
      const { data: profiles, error, count } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, status, created_at", { count: "exact" })
        .eq("ib_parent_id", user.id)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error("Error fetching referrals:", error);
        return { referrals: [], total: 0 };
      }

      // Get positions for each referral
      const referralIds = profiles?.map((p) => p.id) || [];
      
      let positionsData: any[] = [];
      if (referralIds.length > 0) {
        const { data: positions } = await supabase
          .from("investor_positions")
          .select("investor_id, fund_id, current_value, funds!inner(asset)")
          .in("investor_id", referralIds);
        positionsData = positions || [];
      }

      // Build referral objects with holdings
      // Issue C fix: Only count positions with current_value > 0 as active
      const referrals: Referral[] = (profiles || []).map((profile) => {
        const investorPositions = positionsData.filter((p) => p.investor_id === profile.id);
        
        // Group holdings by asset - only include non-zero positions
        const holdings: Record<string, number> = {};
        const activeFundIds = new Set<string>();
        
        for (const pos of investorPositions) {
          const asset = (pos.funds as any)?.asset;
          const currentValue = Number(pos.current_value);
          if (!asset) continue; // Skip positions with missing fund data
          // Only count as active if current_value > 0
          if (currentValue > 0) {
            activeFundIds.add(pos.fund_id);
            if (!holdings[asset]) holdings[asset] = 0;
            holdings[asset] += currentValue;
          }
        }

        return {
          id: profile.id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: profile.email,
          status: profile.status || "active",
          joinedAt: profile.created_at,
          activeFunds: activeFundIds.size, // Now only counts non-zero positions
          holdings,
        };
      });

      return { referrals, total: count || 0 };
    },
    enabled: !!user?.id,
  });

  const filteredReferrals = data?.referrals.filter((r) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const fullName = `${r.firstName || ""} ${r.lastName || ""}`.toLowerCase();
    return fullName.includes(searchLower) || r.email.toLowerCase().includes(searchLower);
  }) || [];

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Referrals</h1>
        <p className="text-muted-foreground">Investors you've referred to the platform</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Referrals ({data?.total || 0})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search referrals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReferrals.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Active Funds</TableHead>
                    <TableHead>Holdings Summary</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((referral) => (
                    <TableRow
                      key={referral.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/ib/referrals/${referral.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {referral.firstName || referral.lastName
                              ? `${referral.firstName || ""} ${referral.lastName || ""}`.trim()
                              : "—"}
                          </p>
                          <p className="text-sm text-muted-foreground">{referral.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={referral.status === "active" ? "default" : "secondary"}>
                          {referral.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(referral.joinedAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{referral.activeFunds}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(referral.holdings).length > 0 ? (
                            Object.entries(referral.holdings).map(([asset, amount]) => (
                              <span key={asset} className="text-xs bg-muted px-2 py-0.5 rounded">
                                {formatAssetAmount(amount, asset)}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, data?.total || 0)} of {data?.total || 0}
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
          ) : search ? (
            <p className="text-muted-foreground text-center py-12">
              No referrals match your search
            </p>
          ) : (
            <EmptyState
              icon={UserPlus}
              title="No referrals yet"
              description="When you refer investors to the platform, they will appear here. Share your referral link to start earning commissions."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
