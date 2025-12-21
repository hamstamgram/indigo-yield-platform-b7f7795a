/**
 * IB Referral Detail Page
 * Read-only view of a referral's positions and commission history
 */

import { useParams, useNavigate } from "react-router-dom";
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
import { ArrowLeft, User, Wallet, History } from "lucide-react";

export default function IBReferralDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Verify this is actually a referral of this IB and get profile
  const { data: referral, isLoading: profileLoading } = useQuery({
    queryKey: ["ib-referral-detail", id, user?.id],
    queryFn: async () => {
      if (!user?.id || !id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, status, created_at, ib_parent_id")
        .eq("id", id)
        .eq("ib_parent_id", user.id)
        .maybeSingle();

      if (error || !data) {
        console.error("Error fetching referral:", error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id && !!id,
  });

  // Get positions summary
  const { data: positions, isLoading: positionsLoading } = useQuery({
    queryKey: ["ib-referral-positions", id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from("investor_positions")
        .select(`
          fund_id,
          shares,
          cost_basis,
          current_value,
          funds!inner(name, asset, code)
        `)
        .eq("investor_id", id);

      if (error) {
        console.error("Error fetching positions:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!id && !!referral,
  });

  // Get commission history for this referral
  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ["ib-referral-commissions", id, user?.id],
    queryFn: async () => {
      if (!user?.id || !id) return [];

      const { data, error } = await supabase
        .from("ib_allocations")
        .select(`
          id,
          ib_fee_amount,
          ib_percentage,
          source_net_income,
          effective_date,
          period_start,
          period_end,
          funds!inner(name, asset)
        `)
        .eq("ib_investor_id", user.id)
        .eq("source_investor_id", id)
        .order("effective_date", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching commissions:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id && !!id && !!referral,
  });

  if (profileLoading || positionsLoading || commissionsLoading) {
    return <PageLoadingSpinner />;
  }

  if (!referral) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground mb-4">Referral not found or access denied</p>
        <Button onClick={() => navigate("/ib/referrals")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Referrals
        </Button>
      </div>
    );
  }

  const fullName = `${referral.first_name || ""} ${referral.last_name || ""}`.trim() || referral.email;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ib/referrals")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
          <p className="text-muted-foreground">{referral.email}</p>
        </div>
        <Badge variant={referral.status === "active" ? "default" : "secondary"} className="ml-auto">
          {referral.status}
        </Badge>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">First Name</p>
              <p className="font-medium">{referral.first_name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Name</p>
              <p className="font-medium">{referral.last_name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{referral.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Joined</p>
              <p className="font-medium">{format(new Date(referral.created_at), "MMM d, yyyy")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positions Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Positions Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {positions && positions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Cost Basis</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos) => {
                  const fund = pos.funds as any;
                  const asset = fund?.asset || "USDT";
                  return (
                    <TableRow key={pos.fund_id}>
                      <TableCell className="font-medium">{fund?.name || pos.fund_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{asset}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(pos.shares).toLocaleString("en-US", { maximumFractionDigits: 8 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatAssetAmount(Number(pos.cost_basis), asset)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAssetAmount(Number(pos.current_value), asset)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No positions found</p>
          )}
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Commission History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commissions && commissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Source Income</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((comm) => {
                  const fund = comm.funds as any;
                  const asset = fund?.asset || "USDT";
                  return (
                    <TableRow key={comm.id}>
                      <TableCell>
                        {format(new Date(comm.effective_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {comm.period_start && comm.period_end
                          ? `${format(new Date(comm.period_start), "MMM d")} - ${format(new Date(comm.period_end), "MMM d, yyyy")}`
                          : "—"}
                      </TableCell>
                      <TableCell>{fund?.name || "—"}</TableCell>
                      <TableCell className="text-right">
                        {formatAssetAmount(Number(comm.source_net_income), asset)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(comm.ib_percentage).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatAssetAmount(Number(comm.ib_fee_amount), asset)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No commission history</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
