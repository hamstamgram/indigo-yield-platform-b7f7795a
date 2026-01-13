/**
 * Internal Routing Tab
 * Complete routing tab content with summary, audit trail, and explanation
 */

import { format } from "date-fns";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge,
} from "@/components/ui";
import { ArrowRightLeft } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatFeeAmount } from "./utils/feeUtils";
import type { RoutingSummary, RoutingAuditEntry } from "@/hooks/data";

interface InternalRoutingTabProps {
  summary: RoutingSummary;
  entries: RoutingAuditEntry[];
}

export function InternalRoutingTab({ summary, entries }: InternalRoutingTabProps) {
  return (
    <div className="space-y-6">
      {/* Routing Summary by Asset */}
      {Object.keys(summary.byAsset).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Routing by Asset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(summary.byAsset).map(([asset, data]) => (
                <div key={asset} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted">
                  <CryptoIcon symbol={asset} className="h-6 w-6" />
                  <div>
                    <p className="font-mono font-semibold">
                      {formatFeeAmount(data.amount, asset)} {asset}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data.count} routing{data.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Routing Audit Trail Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="h-6 w-6 text-orange-500" />
            <div>
              <CardTitle>Internal Routing Audit Trail</CardTitle>
              <CardDescription>
                Tracks all withdrawals routed to INDIGO Fees account instead of external payout
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">No internal routing events recorded</p>
              <p className="text-sm max-w-md mx-auto">
                When withdrawals are routed to INDIGO FEES instead of external payout, 
                they will appear here for audit purposes.
              </p>
            </div>
          ) : (
            <div className="rounded-md border max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Source Investor</TableHead>
                    <TableHead>Withdrawal ID</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const meta = (entry.meta || {}) as Record<string, unknown>;
                    const newValues = (entry.new_values || {}) as Record<string, unknown>;
                    const oldValues = (entry.old_values || {}) as Record<string, unknown>;
                    
                    const amount = Number(meta.amount || newValues.amount || 0);
                    const asset = (meta.asset_code as string) || (newValues.asset_code as string) || "USD";
                    const sourceInvestorName = (meta.source_investor_name as string) || 
                      (meta.investor_name as string) || 
                      (oldValues.investor_name as string) || "";
                    const sourceInvestorEmail = (meta.source_investor_email as string) || 
                      (meta.investor_email as string) || 
                      (oldValues.investor_email as string) || "";
                    const withdrawalId = entry.entity_id || (meta.withdrawal_id as string) || "-";

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          {entry.actor_profile ? (
                            <div>
                              <p className="text-sm font-medium">
                                {`${entry.actor_profile.first_name || ""} ${entry.actor_profile.last_name || ""}`.trim() || entry.actor_profile.email}
                              </p>
                              {entry.actor_profile.email && entry.actor_profile.first_name && (
                                <p className="text-xs text-muted-foreground">{entry.actor_profile.email}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">System</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{sourceInvestorName || "Unknown"}</p>
                            {sourceInvestorEmail && (
                              <p className="text-xs text-muted-foreground">{sourceInvestorEmail}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[100px] inline-block" title={withdrawalId}>
                            {withdrawalId.slice(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CryptoIcon symbol={asset} className="h-4 w-4" />
                            <Badge variant="outline">{asset}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatFeeAmount(amount, asset)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How Internal Routing Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Internal Routing Works</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Withdrawal Request:</strong> An investor requests a withdrawal from their fund position.
            </li>
            <li>
              <strong className="text-foreground">Admin Routes to INDIGO:</strong> Instead of processing as external payout, admin routes the withdrawal to INDIGO Fees account.
            </li>
            <li>
              <strong className="text-foreground">Internal Transfer:</strong> An INTERNAL_WITHDRAWAL is created for the source investor, and an INTERNAL_CREDIT is created for INDIGO FEES.
            </li>
            <li>
              <strong className="text-foreground">Audit Trail:</strong> The routing action is recorded in the audit log for compliance and reconciliation.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
