/**
 * Locked Period Banner
 * Super admin alert banner for locked periods with unlock buttons
 */

import { Button, Badge } from "@/components/ui";
import { Lock, Unlock } from "lucide-react";
import type { LockedPeriod } from "@/hooks";

interface LockedPeriodBannerProps {
  periods: LockedPeriod[];
  onUnlock: (period: LockedPeriod) => void;
}

export function LockedPeriodBanner({ periods, onUnlock }: LockedPeriodBannerProps) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {periods.length} Locked Period{periods.length !== 1 ? "s" : ""}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {periods.map(p => `${p.fund_name} (${p.period_name})`).join(", ")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {periods.slice(0, 3).map((period) => (
            <Button
              key={period.id}
              variant="outline"
              size="sm"
              onClick={() => onUnlock(period)}
              className="text-amber-600 border-amber-300 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/30"
            >
              <Unlock className="h-4 w-4 mr-1" />
              Unlock {period.fund_name}
            </Button>
          ))}
          {periods.length > 3 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              +{periods.length - 3} more
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
