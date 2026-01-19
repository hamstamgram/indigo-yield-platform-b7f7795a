/**
 * Data Integrity Panel
 * Admin-only component showing reconciliation status, orphans, duplicates
 * Issue G: Data Integrity automation
 * Enhanced with position vs transaction reconciliation checks
 * 
 * REAL-TIME ARCHITECTURE:
 * - Subscribes to admin_alerts table for live integrity alerts
 * - Auto-updates when new alerts are created by database triggers
 * - No polling needed - uses Supabase Realtime
 */

import {
  Card, CardContent, CardHeader, CardTitle,
  Badge, Skeleton, Button,
} from "@/components/ui";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Link2Off,
  Copy,
  TrendingUp,
  Mail,
  RefreshCw,
  Ban,
  Scale,
  Bell,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { useDataIntegrityStatus } from "@/hooks/data";
import { useRealtimeAlerts } from "@/hooks/data/admin/useRealtimeAlerts";
import { supabase } from "@/integrations/supabase/client";

export function DataIntegrityPanel() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const { data, isLoading, refetch } = useDataIntegrityStatus();
  
  // Subscribe to real-time alerts
  useRealtimeAlerts();
  
  // Track realtime connection status
  useEffect(() => {
    const channel = supabase
      .channel('integrity-panel-status')
      .on('presence', { event: 'sync' }, () => {
        setRealtimeConnected(true);
      })
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: "ok" | "warning" | "error") => {
    switch (status) {
      case "ok":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getCheckIcon = (icon?: string) => {
    switch (icon) {
      case "orphan":
        return <Link2Off className="h-4 w-4 text-muted-foreground" />;
      case "duplicate":
        return <Copy className="h-4 w-4 text-muted-foreground" />;
      case "voided":
        return <Ban className="h-4 w-4 text-muted-foreground" />;
      case "reconciliation":
        return <Scale className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Database className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: "ok" | "warning" | "error") => {
    const colors = {
      ok: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status];
  };

  const overallStatus = data?.checks.every((c) => c.status === "ok")
    ? "ok"
    : data?.checks.some((c) => c.status === "error")
    ? "error"
    : "warning";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Integrity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Integrity
            {/* Real-time indicator */}
            <span 
              className={`inline-flex items-center gap-1 text-xs font-normal px-2 py-0.5 rounded-full ${
                realtimeConnected 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}
              title={realtimeConnected ? "Connected to real-time updates" : "Connecting..."}
            >
              <Zap className="h-3 w-3" />
              Live
            </span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Badge className={getStatusBadge(overallStatus)}>
              {getStatusIcon(overallStatus)}
              <span className="ml-1 capitalize">{overallStatus === "ok" ? "All Clear" : overallStatus}</span>
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Integrity Checks */}
        <div className="space-y-2">
          {data?.checks.map((check) => (
            <div
              key={check.name}
              className={`flex items-center justify-between p-3 border rounded-lg ${
                check.status === "error" ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10" :
                check.status === "warning" ? "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900/50 dark:bg-yellow-900/10" :
                ""
              }`}
            >
              <div className="flex items-center gap-3">
                {getCheckIcon(check.icon)}
                <div>
                  <p className="font-medium text-sm">{check.name}</p>
                  <p className="text-xs text-muted-foreground">{check.details}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-mono ${
                  check.status === "error" ? "text-red-600 dark:text-red-400" :
                  check.status === "warning" ? "text-yellow-600 dark:text-yellow-400" :
                  ""
                }`}>
                  {check.count}
                </span>
                {getStatusIcon(check.status)}
              </div>
            </div>
          ))}
        </div>

        {/* Last Activity */}
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium mb-3">Last Activity</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-2 bg-muted/50 rounded">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Yield Run</p>
              <p className="text-xs font-medium">
                {data?.lastYieldRun
                  ? formatDistanceToNow(new Date(data.lastYieldRun), { addSuffix: true })
                  : "Never"}
              </p>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <Database className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Report Gen</p>
              <p className="text-xs font-medium">
                {data?.lastReportRun
                  ? formatDistanceToNow(new Date(data.lastReportRun), { addSuffix: true })
                  : "Never"}
              </p>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <Mail className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Email Event</p>
              <p className="text-xs font-medium">
                {data?.lastEmailEvent
                  ? formatDistanceToNow(new Date(data.lastEmailEvent), { addSuffix: true })
                  : "Never"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
