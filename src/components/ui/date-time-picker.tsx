/**
 * DateTimePicker Component
 * Combines Shadcn Calendar with time input for full datetime selection
 */

import * as React from "react";
import { format, parse, setHours, setMinutes } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface DateTimePickerProps {
  /** ISO datetime string or undefined */
  value?: string;
  /** Callback with ISO datetime string */
  onChange: (value: string | undefined) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Label for the picker */
  label?: string;
  /** Whether to show the time input */
  showTime?: boolean;
  /** Default time when only date is selected (for "from" use "00:00", for "to" use "23:59") */
  defaultTime?: string;
  /** Additional class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  label,
  showTime = true,
  defaultTime = "00:00",
  className,
  disabled = false,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse value into date and time components
  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    try {
      return new Date(value);
    } catch {
      return undefined;
    }
  }, [value]);

  const timeValue = React.useMemo(() => {
    if (!parsedDate || isNaN(parsedDate.getTime())) return defaultTime;
    return format(parsedDate, "HH:mm");
  }, [parsedDate, defaultTime]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined);
      return;
    }

    // Preserve existing time or use default
    const [hours, minutes] = (timeValue || defaultTime).split(":").map(Number);
    const newDate = setMinutes(setHours(date, hours), minutes);
    onChange(newDate.toISOString());
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    if (!newTime || !parsedDate) return;

    const [hours, minutes] = newTime.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;

    const newDate = setMinutes(setHours(parsedDate, hours), minutes);
    onChange(newDate.toISOString());
  };

  const handleClear = () => {
    onChange(undefined);
    setOpen(false);
  };

  const displayValue = React.useMemo(() => {
    if (!parsedDate || isNaN(parsedDate.getTime())) return null;
    if (showTime) {
      return format(parsedDate, "MMM d, yyyy HH:mm");
    }
    return format(parsedDate, "MMM d, yyyy");
  }, [parsedDate, showTime]);

  return (
    <div className={cn("space-y-1", className)}>
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-9",
              !displayValue && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue || <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 min-h-[380px] min-w-[280px]" align="start">
          <div className="p-3 space-y-3">
            <Calendar
              mode="single"
              selected={parsedDate}
              onSelect={handleDateSelect}
              initialFocus
              className="p-0 pointer-events-auto"
            />
            {showTime && parsedDate && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={timeValue}
                  onChange={handleTimeChange}
                  className="flex-1 h-8"
                />
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Clear
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
