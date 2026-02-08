/**
 * Pending Actions Panel
 * Shows items requiring immediate admin attention
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Skeleton } from "@/components/ui";
import { ArrowUpCircle, FileText, AlertTriangle, ChevronRight, CheckCircle2 } from "lucide-react";
import { usePendingItems, useRealtimeSubscription } from "@/hooks/data";
import type { PendingItem } from "@/types/domains";

export function PendingActionsPanel() {
  const navigate = useNavigate();

  const { data: items = [], isLoading: loading, refetch } = usePendingItems();

  // Subscribe to realtime changes for withdrawal_requests
  useRealtimeSubscription({
    channel: "pending-actions",
    table: "withdrawal_requests",
    onChange: () => refetch(),
  });

  const handleItemClick = (item: PendingItem) => {
    if (item.type === "withdrawal") {
      navigate("/admin/withdrawals");
    } else if (item.type === "report") {
      navigate("/admin/investor-reports");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-900/30 text-red-400";
      case "medium":
        return "bg-amber-900/30 text-amber-400";
      default:
        return "bg-blue-900/30 text-blue-400";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "withdrawal":
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      case "report":
        return <FileText className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Pending Actions
          </CardTitle>
          {items.length > 0 && (
            <Badge variant="destructive" className="font-mono">
              {items.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground">No pending actions</p>
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getIcon(item.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{item.title}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                  {item.amount && (
                    <p className="text-sm font-mono font-semibold mt-1 text-foreground">
                      {item.amount}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </button>
          ))
        )}

        {items.length > 0 && (
          <Button
            variant="ghost"
            className="w-full mt-2 text-xs"
            onClick={() => navigate("/admin/withdrawals")}
          >
            View All Pending Items
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
