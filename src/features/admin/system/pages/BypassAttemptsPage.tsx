/**
 * Bypass Attempts Page (P1)
 * Shows transaction_bypass_attempts - operations blocked by integrity gating
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { useBypassAttempts } from "@/hooks/data";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Ban,
  Clock,
  User,
  Database,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";

export default function BypassAttemptsPage() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Data hooks
  const { data: attempts, isLoading, refetch } = useBypassAttempts(100);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getOperationBadge = (operation: string) => {
    switch (operation) {
      case "INSERT":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "UPDATE":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "DELETE":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bypass Attempts</h1>
          <p className="text-muted-foreground">Operations blocked by integrity gating triggers</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={
              attempts && attempts.length > 0
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            }
          >
            {attempts && attempts.length > 0 ? (
              <AlertTriangle className="h-4 w-4 mr-1" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-1" />
            )}
            {attempts?.length || 0} blocked operations
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">
                What are Bypass Attempts?
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                These are operations that were blocked by our integrity gating system. The gating
                triggers prevent direct writes to critical tables (like transactions_v2) that should
                go through the canonical RPC functions. Each entry shows what operation was
                attempted, why it was blocked, and by whom.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attempts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Blocked Operations
          </CardTitle>
          <CardDescription>
            From transaction_bypass_attempts table - operations prevented by integrity triggers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attempts && attempts.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Blocked Reason</TableHead>
                    <TableHead>Actor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt) => (
                    <>
                      <TableRow
                        key={attempt.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(attempt.id)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(attempt.attempted_at), "MMM d, HH:mm")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(attempt.attempted_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getOperationBadge(attempt.attempted_type)}>
                            {attempt.attempted_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Database className="h-3 w-3 text-muted-foreground" />
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {attempt.attempted_source}
                            </code>
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-red-600 dark:text-red-400">
                            {attempt.error_message}
                          </span>
                        </TableCell>
                        <TableCell>
                          {attempt.user_id ? (
                            <span className="flex items-center gap-1 text-xs">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <code className="font-mono">{attempt.user_id.slice(0, 8)}...</code>
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">System</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(attempt.id) && attempt.client_info && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30">
                            <div className="p-2">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Client Info:
                              </p>
                              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                                {JSON.stringify(attempt.client_info, null, 2)}
                              </pre>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                No bypass attempts recorded
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                All operations are going through proper channels
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
