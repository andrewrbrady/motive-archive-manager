"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
}

export function DatePicker({ date, setDate, className }: DatePickerProps) {
  // Keep a local state that reflects the selected date
  // This ensures the calendar UI stays in sync with the actual selection
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    date
  );

  // When the external date changes, update the local state
  React.useEffect(() => {
    setSelectedDate(date);
  }, [date]);

  // Handle date selection
  const handleSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate);
    setDate(newDate);
  };

  // Determine which month to show in the calendar
  // Use the selected date if available, otherwise use today
  const calendarDefaultMonth = selectedDate || new Date();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal border border-border",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, "MM/dd/yyyy")
          ) : (
            <span>Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-background border border-border shadow-md dark:bg-background-subtle dark:text-foreground"
        align="start"
        alignOffset={0}
        sideOffset={4}
        avoidCollisions={true}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={calendarDefaultMonth}
          initialFocus
          className="bg-background dark:bg-background-subtle"
        />
      </PopoverContent>
    </Popover>
  );
}
