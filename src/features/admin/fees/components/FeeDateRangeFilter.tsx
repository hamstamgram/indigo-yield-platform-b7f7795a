/**
 * Fee Date Range Filter
 * Date inputs with preset buttons (Last Month, This Month)
 */

import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent, Button, Input, Label } from "@/components/ui";
import { Calendar } from "lucide-react";

interface FeeDateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

export function FeeDateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: FeeDateRangeFilterProps) {
  const setLastMonth = () => {
    onDateFromChange(format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
    onDateToChange(format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  };

  const setThisMonth = () => {
    onDateFromChange(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    onDateToChange(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  };

  return (
    <Card className="w-full">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Date Range</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={setLastMonth}>
              Last Month
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={setThisMonth}>
              This Month
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
