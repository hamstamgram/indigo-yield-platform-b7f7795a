/**
 * Pending Actions Panel
 * Shows items requiring immediate admin attention
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpCircle,
  FileText,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface PendingItem {
  id: string;
  type: "withdrawal" | "report";
  title: string;
  subtitle: string;
  amount?: string;
  timestamp: Date;
  priority: "high" | "medium" | "low";
}

export function PendingActionsPanel() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingItems = async () => {
    setLoading(true);
    try {
      // Fetch pending withdrawals
      const { data: withdrawals } = await supabase
        .from("withdrawal_requests")
        .select(`
          id,
          requested_amount,
          created_at,
          profile:profiles!fk_withdrawal_requests_profile(first_name, last_name, email),
          fund:funds(asset, name)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      const pendingItems: PendingItem[] = [];

      // Add withdrawals
      withdrawals?.forEach((w: any) => {
        const investorName = w.profile
          ? `${w.profile.first_name || ""} ${w.profile.last_name || ""}`.trim() || w.profile.email
          : "Unknown";
        
        pendingItems.push({
          id: w.id,
          type: "withdrawal",
          title: `Withdrawal Request`,
          subtitle: `${investorName} - ${w.fund?.name || "Unknown Fund"}`,
          amount: `${w.requested_amount?.toFixed(4)} ${w.fund?.asset || ""}`,
          timestamp: new Date(w.created_at),
          priority: "high",
        });
      });

      // Check for eligible investors without reports this month
      const currentMonth = format(new Date(), "yyyy-MM");
      const [yearStr, monthStr] = currentMonth.split("-");

      // Get investors with active positions (eligible for reports)
      const { data: eligibleInvestors } = await supabase
        .from("investor_positions")
        .select("investor_id")
        .gt("current_value", 0);

      const eligibleCount = new Set(eligibleInvestors?.map(p => p.investor_id) || []).size;

      const { data: periods } = await supabase
        .from("statement_periods")
        .select("id")
        .eq("year", parseInt(yearStr))
        .eq("month", parseInt(monthStr))
        .maybeSingle();

      if (periods && eligibleCount > 0) {
        // Count unique investors with reports for this period
        const { data: reportData } = await supabase
          .from("investor_fund_performance")
          .select("investor_id")
          .eq("period_id", periods.id);

        const reportedInvestors = new Set(reportData?.map(r => r.investor_id) || []).size;
        const missingReports = eligibleCount - reportedInvestors;
        
        if (missingReports > 0) {
          pendingItems.push({
            id: "reports-needed",
            type: "report",
            title: `Reports Pending`,
            subtitle: `${missingReports} eligible investor${missingReports > 1 ? "s" : ""} need ${currentMonth} reports`,
            timestamp: new Date(),
            priority: "medium",
          });
        }
      }

      setItems(pendingItems);
    } catch (error) {
      console.error("Failed to fetch pending items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingItems();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("pending-actions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawal_requests" },
        () => fetchPendingItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
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
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.subtitle}
                  </p>
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
