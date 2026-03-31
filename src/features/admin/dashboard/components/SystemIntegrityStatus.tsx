import React from "react";
import { ShieldCheck, ShieldAlert, HeartPulse, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const SystemIntegrityStatus = () => {
  const { data: integrity, isLoading } = useQuery({
    queryKey: ["admin", "system-integrity-heartbeat"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_ledger_position_mismatches")
        .select("count", { count: "exact", head: true });
      
      if (error) throw error;
      return { mismatchCount: data?.length || 0 };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const isHealthy = !isLoading && integrity?.mismatchCount === 0;

  return (
    <Card className={cn(
      "border-none transition-all duration-500 overflow-hidden",
      isHealthy ? "bg-emerald-500/5 shadow-emerald-500/5" : "bg-rose-500/5 shadow-rose-500/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl transition-colors duration-500",
              isHealthy ? "bg-emerald-500/10" : "bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
            )}>
              {isHealthy ? (
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-rose-400 animate-pulse" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest">
                Ledger Integrity
              </h4>
              <p className={cn(
                "text-[10px] font-medium flex items-center gap-1.5",
                isHealthy ? "text-emerald-400/70" : "text-rose-400"
              )}>
                <HeartPulse className="h-3 w-3" />
                {isLoading ? "Verifying..." : isHealthy ? "System in Sync" : `${integrity?.mismatchCount} Discrepancies Found`}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <Activity className={cn(
              "h-4 w-4 mb-1",
              isHealthy ? "text-emerald-500/20" : "text-rose-500/20"
            )} />
            <span className="text-[9px] text-muted-foreground font-mono uppercase">
              18rd Decimal Seal
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
