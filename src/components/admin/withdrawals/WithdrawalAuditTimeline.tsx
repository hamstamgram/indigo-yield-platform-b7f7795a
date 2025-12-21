import { useQuery } from "@tanstack/react-query";
import { withdrawalService } from "@/services/investor/withdrawalService";
import { WithdrawalAuditLog } from "@/types/withdrawal";
import { format } from "date-fns";
import { Loader2, CheckCircle, XCircle, Play, CheckCircle2, PlusCircle, Ban } from "lucide-react";

interface WithdrawalAuditTimelineProps {
  withdrawalId: string;
}

const actionConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  created: { icon: PlusCircle, color: "text-blue-500", label: "Request Created" },
  approved: { icon: CheckCircle, color: "text-green-500", label: "Approved" },
  rejected: { icon: XCircle, color: "text-red-500", label: "Rejected" },
  processing_started: { icon: Play, color: "text-amber-500", label: "Processing Started" },
  completed: { icon: CheckCircle2, color: "text-emerald-600", label: "Completed" },
  cancelled: { icon: Ban, color: "text-gray-500", label: "Cancelled" },
};

export function WithdrawalAuditTimeline({ withdrawalId }: WithdrawalAuditTimelineProps) {
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["withdrawal-audit-logs", withdrawalId],
    queryFn: () => withdrawalService.getWithdrawalAuditLogs(withdrawalId),
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load audit history
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No audit history available
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />

      <div className="space-y-4">
        {logs.map((log, index) => {
          const config = actionConfig[log.action] || {
            icon: PlusCircle,
            color: "text-muted-foreground",
            label: log.action,
          };
          const Icon = config.icon;

          return (
            <div key={log.id} className="relative flex gap-4 pl-0">
              {/* Timeline dot */}
              <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 ${config.color.replace("text-", "border-")}`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{config.label}</p>
                  <time className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </time>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  by {log.actor_name}
                </p>
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">
                    {log.details.notes && (
                      <p><span className="font-medium">Notes:</span> {String(log.details.notes)}</p>
                    )}
                    {log.details.reason && (
                      <p><span className="font-medium">Reason:</span> {String(log.details.reason)}</p>
                    )}
                    {log.details.amount && (
                      <p><span className="font-medium">Amount:</span> {String(log.details.amount)}</p>
                    )}
                    {log.details.tx_hash && (
                      <p><span className="font-medium">TX Hash:</span> <code className="text-xs">{String(log.details.tx_hash)}</code></p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
