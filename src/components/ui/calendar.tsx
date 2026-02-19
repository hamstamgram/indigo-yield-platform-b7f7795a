import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown-buttons",
  fromYear = 2024,
  toYear,
  ...props
}: CalendarProps) {
  const resolvedToYear = toYear ?? new Date().getFullYear() + 1;

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      fromYear={fromYear}
      toYear={resolvedToYear}
      fixedWeeks
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-[300px] min-h-[320px]",
        caption: "flex justify-center pt-1 relative items-center h-10",
        caption_label: "text-sm font-medium text-white min-w-[160px] text-center",
        caption_dropdowns: "flex items-center gap-2 justify-center",
        dropdown:
          "appearance-none bg-white/5 text-white border border-white/10 rounded-lg px-2 py-1 text-sm cursor-pointer hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-0 transition-all duration-200 [color-scheme:dark]",
        dropdown_month: "mr-1",
        dropdown_year: "",
        dropdown_icon: "hidden",
        vhidden: "hidden",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-white/10"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex justify-between",
        head_cell: "text-white/50 rounded-lg w-9 font-normal text-[0.8rem] text-center",
        row: "flex w-full mt-2 justify-between",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-white/5 [&:has([aria-selected])]:bg-white/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-white aria-selected:opacity-100 hover:bg-white/10 hover:text-white"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-indigo-500 text-white hover:bg-indigo-400 hover:text-white focus:bg-indigo-500 focus:text-white",
        day_today: "bg-white/10 text-white font-semibold",
        day_outside:
          "day-outside text-white/30 opacity-50 aria-selected:bg-white/5 aria-selected:text-white/50 aria-selected:opacity-30",
        day_disabled: "text-white/20 opacity-50",
        day_range_middle: "aria-selected:bg-white/10 aria-selected:text-white",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
