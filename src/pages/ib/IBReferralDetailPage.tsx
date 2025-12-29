/**
 * IB Referral Detail Page
 * Read-only view of a referral's positions and commission history
 */

import { useParams, useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Badge,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  PageLoadingSpinner,
} from "@/components/ui";
import { formatAssetAmount } from "@/utils/assets";
import { format } from "date-fns";
import { ArrowLeft, User, Wallet, History } from "lucide-react";
import {
  useIBReferralDetail,
  useIBReferralPositions,
  useIBReferralCommissions,
} from "@/hooks/data/shared";

export default function IBReferralDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: referral, isLoading: profileLoading } = useIBReferralDetail(id);
  const { data: positions, isLoading: positionsLoading } = useIBReferralPositions(id, !!referral);
  const { data: commissions, isLoading: commissionsLoading } = useIBReferralCommissions(id, !!referral);

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
