import { AlertTriangle, History, Database, Shield, RefreshCw } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Alert, AlertDescription, AlertTitle,
  Button, Badge,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui";
import { PositionResetDialog } from "@/components/admin/maintenance/PositionResetDialog";
import { useResetHistory } from "@/hooks/data/useSystemAdmin";
import { format } from "date-fns";
import { formatAUM } from "@/utils/formatters";

export default function MaintenancePage() {
  const { data: history = [], isLoading: loading, refetch } = useResetHistory();

  const formatAumValue = (value: number | undefined) => {
    if (value === undefined) return "N/A";
    return formatAUM(value, "USDT");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "in_progress":
        return <Badge variant="secondary">In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Maintenance</h1>
          <p className="text-muted-foreground">
            Perform administrative maintenance operations
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Warning Banner */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Destructive Operations</AlertTitle>
        <AlertDescription>
          Operations on this page can permanently affect data. All actions are logged and auditable.
          Ensure you have proper authorization before proceeding.
        </AlertDescription>
      </Alert>

      {/* Maintenance Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Position Reset Card */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-destructive" />
              Position Reset
            </CardTitle>
            <CardDescription>
              Archive all current positions and reset balances to zero for clean data re-entry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>This operation will:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Archive all investor positions</li>
                <li>Reset all balances to zero</li>
                <li>Archive transaction history</li>
                <li>Clear performance caches</li>
              </ul>
            </div>
            <PositionResetDialog />
          </CardContent>
        </Card>

        {/* Data Protection Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Data Protection
            </CardTitle>
            <CardDescription>
              Understanding how your data is protected during maintenance operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Safety measures:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>All data is archived before deletion</li>
                <li>Operations run in database transactions</li>
                <li>Every action is logged with admin ID</li>
                <li>Archive tables enable data restoration</li>
              </ul>
            </div>
            <div className="text-xs text-muted-foreground">
              Contact database administrators for data restoration from archives.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Reset History
          </CardTitle>
          <CardDescription>
            Log of all position reset operations performed on this system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reset operations have been performed yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Positions</TableHead>
                  <TableHead className="text-right">AUM Before</TableHead>
                  <TableHead>Batch ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {format(new Date(entry.initiated_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      {entry.profiles?.email || entry.admin_user_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-right">
                      {entry.affected_counts?.positions_reset ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAumValue(entry.affected_counts?.total_aum_before)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.reset_batch_id.slice(0, 8)}...
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
