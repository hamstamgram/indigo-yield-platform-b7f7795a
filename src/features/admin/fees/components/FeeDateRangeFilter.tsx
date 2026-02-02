/**
 * Fee Date Range Filter
 * Date inputs with preset buttons (Last Month, This Month)
 */

import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from "@/components/ui";
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
    <Card className="lg:w-80 shrink-0">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Date Range</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={setLastMonth}>
            Last Month
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={setThisMonth}>
            This Month
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
