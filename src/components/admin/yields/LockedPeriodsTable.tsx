/**
 * Locked Periods Table
 * Super admin table showing locked periods with unlock actions
 */

import { format } from "date-fns";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, Button,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { FinancialValue } from "@/components/common/FinancialValue";
import type { LockedPeriod } from "@/hooks";

interface LockedPeriodsTableProps {
  periods: LockedPeriod[];
  isLoading: boolean;
  onUnlock: (period: LockedPeriod) => void;
}

export function LockedPeriodsTable({ periods, isLoading, onUnlock }: LockedPeriodsTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              Locked Periods
            </CardTitle>
            <CardDescription>
              {periods.length} locked period{periods.length !== 1 ? "s" : ""} — Super admins can unlock for corrections
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">AUM at Snapshot</TableHead>
                  <TableHead>Investors</TableHead>
                  <TableHead>Locked At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={period.fund_asset} className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{period.fund_name}</p>
                          <p className="text-xs text-muted-foreground">{period.fund_asset}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Lock className="h-3 w-3 mr-1" />
                          {period.period_name}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <FinancialValue 
                        value={period.total_aum} 
                        asset={period.fund_asset}
                      />
                    </TableCell>
                    <TableCell>
                      {period.investor_count}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {period.locked_at ? format(new Date(period.locked_at), "MMM d, yyyy HH:mm") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onUnlock(period)}
                              className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20"
                            >
                              <Unlock className="h-4 w-4 mr-1" />
                              Unlock
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Unlock period for yield modifications</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
