"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-3 bg-background dark:bg-background-subtle text-foreground dark:text-foreground",
        className
      )}
      modifiersClassNames={{
        selected: "text-zinc-50 bg-zinc-800 dark:bg-zinc-700",
        today: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-50",
      }}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium",
        nav: "space-x-0 flex items-center justify-between w-full absolute top-1 left-1 right-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-0"
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full",
        head_cell:
          "text-muted-foreground flex-1 font-normal text-[0.8rem] text-center",
        row: "flex w-full mt-2",
        cell: "flex-1 h-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-zinc-800 [&:has([aria-selected].day-outside)]:bg-zinc-700/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md m-auto"
        ),
        day_selected:
          "bg-zinc-800 text-zinc-50 hover:bg-zinc-700 hover:text-zinc-50 focus:bg-zinc-700 focus:text-zinc-50 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600",
        day_today:
          "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-zinc-700/50 aria-selected:text-zinc-50 aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-zinc-800 aria-selected:text-zinc-50 dark:aria-selected:bg-zinc-700 dark:aria-selected:text-zinc-50",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
