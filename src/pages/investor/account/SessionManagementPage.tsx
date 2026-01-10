import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Badge,
} from "@/components/ui";
import { Monitor, Shield, Clock } from "lucide-react";
import { useToast } from "@/hooks";
import {
  useActiveSessions,
  useAccessLogs,
  useRevokeSession,
} from "@/hooks/data";

export default function SessionManagementPage() {
  const { toast } = useToast();
  
  const { data: sessions = [], isLoading: sessionsLoading } = useActiveSessions();
  const { data: accessLogs = [], isLoading: logsLoading } = useAccessLogs(20);
  const revokeMutation = useRevokeSession();

  const loading = sessionsLoading || logsLoading;

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeMutation.mutateAsync(sessionId);
      toast({
        title: "Session revoked",
        description: "The session has been successfully revoked.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke session",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading session management...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Session Management</h1>
          <p className="text-muted-foreground">Monitor and manage your active sessions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>Your current login sessions across devices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {session.device_label || "Unknown Device"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {session.user_agent?.substring(0, 50)}...
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created: {new Date(session.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last seen: {new Date(session.last_seen_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokeMutation.isPending}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>

            {sessions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No active sessions found</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Logs
            </CardTitle>
            <CardDescription>Recent login and security events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {accessLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={log.success ? "default" : "destructive"} className="text-xs">
                      {log.success ? "✓" : "✗"}
                    </Badge>
                    <span className="text-sm font-medium">{log.event}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {accessLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No access logs found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
