import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Monitor, Shield, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/context";

interface SimpleSession {
  id: string;
  device_label: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
}

interface SimpleAccessLog {
  id: string;
  event: string;
  created_at: string;
  success: boolean;
}

export default function SessionManagementPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SimpleSession[]>([]);
  const [accessLogs, setAccessLogs] = useState<SimpleAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessionData();
  }, []);

  const fetchSessionData = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch sessions with basic data only
      const { data: sessionData } = await supabase
        .from("user_sessions")
        .select("id, device_label, user_agent, created_at, last_seen_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (sessionData) {
        setSessions(sessionData);
      }

      // Fetch access logs with basic data only
      const { data: logsData } = await supabase
        .from("access_logs")
        .select("id, event, created_at, success")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (logsData) {
        setAccessLogs(logsData);
      }
    } catch (error) {
      console.error("Error fetching session data:", error);
      toast({
        title: "Error",
        description: "Failed to load session data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
                  <Button variant="outline" size="sm">
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
