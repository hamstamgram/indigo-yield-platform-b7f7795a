import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface LastUpdatedProps {
  timestamp: Date | number | undefined;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function LastUpdated({ timestamp, onRefresh, isRefreshing, className }: LastUpdatedProps) {
  if (!timestamp) return null;

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const label = formatDistanceToNow(date, { addSuffix: true });

  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <span>Updated {label}</span>
      {onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh data"
        >
          <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
        </Button>
      )}
    </div>
  );
}
