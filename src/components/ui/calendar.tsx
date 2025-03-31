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
        selected:
          "text-primary-foreground bg-primary dark:bg-primary outline outline-2 outline-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background font-bold",
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
          "text-muted-foreground flex-1 font-normal text-[0.8rem] text-center w-9 m-auto",
        row: "flex w-full mt-2",
        cell: "flex-1 h-9 text-center text-sm p-0 relative flex items-center justify-center [&:has([aria-selected])]:bg-primary/20 [&:has([aria-selected].day-outside)]:bg-primary/10",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground ring-2 ring-primary-foreground ring-offset-2 ring-offset-background font-bold outline outline-2 outline-primary-foreground",
        day_today:
          "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-primary/50 aria-selected:text-primary-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-primary/20 aria-selected:text-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
