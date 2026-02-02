/**
 * ApprovalHistoryTable - Shows history of approval decisions
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { ApprovalHistoryItem, ApprovalStatus } from "@/types/domains/approval";

interface ApprovalHistoryTableProps {
  history: ApprovalHistoryItem[];
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-800 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    case "expired":
      return (
        <Badge className="bg-gray-100 text-gray-800 gap-1">
          <Clock className="h-3 w-3" />
          Expired
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function ApprovalHistoryTable({ history }: ApprovalHistoryTableProps) {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No History Yet</h3>
          <p className="text-muted-foreground">Approval decisions will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Approval History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((item) => (
              <TableRow key={item.approval_id}>
                <TableCell>
                  <div className="font-medium">{item.action_type.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">{item.entity_type}</div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.approval_status} />
                </TableCell>
                <TableCell>
                  <div>{item.requester_name}</div>
                </TableCell>
                <TableCell>
                  <div>{item.approver_name}</div>
                </TableCell>
                <TableCell>
                  {item.actual_value ? (
                    <span className="font-mono">
                      $
                      {Number(item.actual_value).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {item.resolved_at
                      ? format(new Date(item.resolved_at), "MMM d, yyyy")
                      : format(new Date(item.requested_at), "MMM d, yyyy")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.resolved_at
                      ? formatDistanceToNow(new Date(item.resolved_at), {
                          addSuffix: true,
                        })
                      : formatDistanceToNow(new Date(item.requested_at), {
                          addSuffix: true,
                        })}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  {item.rejection_reason ? (
                    <div className="text-xs text-red-600 truncate" title={item.rejection_reason}>
                      {item.rejection_reason}
                    </div>
                  ) : item.reason ? (
                    <div className="text-xs text-muted-foreground truncate" title={item.reason}>
                      {item.reason}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
