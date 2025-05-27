"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import "./datetime-picker.css";

interface DateTimePickerProps {
  value: string; // ISO string or datetime-local format
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  isAllDay?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time",
  className,
  required = false,
  isAllDay = false,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = React.useState(false);

  // Parse the current value
  const currentDate = value ? new Date(value) : undefined;
  const currentTime =
    currentDate && !isAllDay ? format(currentDate, "HH:mm") : "09:00";

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onChange("");
      return;
    }

    if (isAllDay) {
      // For all-day events, set to start of day
      const newDate = new Date(selectedDate);
      newDate.setHours(0, 0, 0, 0);
      onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
    } else {
      // Preserve the current time or use default
      const [hours, minutes] = currentTime.split(":").map(Number);
      const newDate = new Date(selectedDate);
      newDate.setHours(hours, minutes, 0, 0);
      onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
    }

    if (isAllDay) {
      setIsOpen(false);
    }
  };

  const handleTimeChange = (timeValue: string) => {
    if (!currentDate) return;

    const [hours, minutes] = timeValue.split(":").map(Number);
    const newDate = new Date(currentDate);
    newDate.setHours(hours, minutes, 0, 0);
    onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleTimeSelect = (hours: number, minutes: number) => {
    if (!currentDate) {
      // If no date is selected, use today
      const newDate = new Date();
      newDate.setHours(hours, minutes, 0, 0);
      onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
    } else {
      const newDate = new Date(currentDate);
      newDate.setHours(hours, minutes, 0, 0);
      onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
    }
  };

  const [currentHour, currentMinute] = currentTime.split(":").map(Number);

  // Convert 24-hour to 12-hour format
  const current12Hour =
    currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
  const currentPeriod = currentHour >= 12 ? "PM" : "AM";

  const handleHourChange = (hour12: number) => {
    const hour24 =
      currentPeriod === "AM"
        ? hour12 === 12
          ? 0
          : hour12
        : hour12 === 12
          ? 12
          : hour12 + 12;
    handleTimeSelect(hour24, currentMinute);
  };

  const handlePeriodChange = (period: string) => {
    const hour24 =
      period === "AM"
        ? current12Hour === 12
          ? 0
          : current12Hour
        : current12Hour === 12
          ? 12
          : current12Hour + 12;
    handleTimeSelect(hour24, currentMinute);
  };

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal text-sm hover:bg-transparent hover:border-white",
              !currentDate && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {currentDate ? (
              <span>
                {format(currentDate, "MMM d, yyyy")}
                {!isAllDay && (
                  <span className="text-muted-foreground ml-2">
                    {format(currentDate, "h:mm a")}
                  </span>
                )}
              </span>
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 space-y-3">
            <div className="datetime-picker-calendar">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={handleDateSelect}
                defaultMonth={currentDate}
                initialFocus
                className="w-full p-0"
                classNames={{
                  caption:
                    "flex justify-center pt-1 relative items-center w-full mb-4",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex w-full",
                  head_cell:
                    "text-muted-foreground font-normal text-[0.8rem] text-center h-9 flex items-center justify-center",
                  row: "flex w-full mt-2",
                  cell: "h-9 text-center text-sm p-0 relative flex items-center justify-center [&:has([aria-selected])]:bg-primary/20 [&:has([aria-selected].day-outside)]:bg-primary/10",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground",
                }}
              />
            </div>

            {!isAllDay && (
              <div className="border-t pt-3">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Time
                </Label>
                <Popover
                  open={isTimePickerOpen}
                  onOpenChange={setIsTimePickerOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal text-sm hover:bg-transparent hover:border-white"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {currentDate
                        ? format(currentDate, "h:mm a")
                        : "Select time"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-6">
                      <div className="flex items-center justify-center space-x-2">
                        {/* Hour input */}
                        <Input
                          type="text"
                          value={current12Hour.toString().padStart(2, "0")}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (value >= 1 && value <= 12) {
                              handleHourChange(value);
                            }
                          }}
                          className="w-12 h-10 text-center px-2"
                          maxLength={2}
                        />

                        <div className="text-lg font-bold text-muted-foreground">
                          :
                        </div>

                        {/* Minute input */}
                        <Input
                          type="text"
                          value={currentMinute.toString().padStart(2, "0")}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (value >= 0 && value <= 59) {
                              handleTimeSelect(currentHour, value);
                            }
                          }}
                          className="w-12 h-10 text-center px-2"
                          maxLength={2}
                        />

                        {/* AM/PM selector */}
                        <Select
                          value={currentPeriod}
                          onValueChange={(value) => handlePeriodChange(value)}
                        >
                          <SelectTrigger className="w-16 h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[10000]">
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Done button */}
                        <Button
                          size="sm"
                          onClick={() => setIsTimePickerOpen(false)}
                          variant="outline"
                          className="h-10"
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                variant="outline"
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
