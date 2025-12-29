/**
 * IB Referrals Page
 * Lists all investors referred by this IB
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Badge,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  PageLoadingSpinner, EmptyState,
} from "@/components/ui";
import { formatAssetAmount } from "@/utils/assets";
import { format } from "date-fns";
import { Search, Users, ChevronRight, ChevronLeft, UserPlus } from "lucide-react";
import { useIBReferrals } from "@/hooks/data/shared";

const PAGE_SIZE = 10;

export default function IBReferralsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useIBReferrals(page, PAGE_SIZE);

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
