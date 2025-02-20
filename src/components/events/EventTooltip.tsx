"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CalendarIcon, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { Event } from "@/types/event";
import { cn } from "@/lib/utils";

interface EventTooltipProps {
  children: React.ReactNode;
  event: Event;
}

export default function EventTooltip({ children, event }: EventTooltipProps) {
  const formatEventType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={2}
        className={cn(
          "z-50 w-80 rounded-lg border border-zinc-200 bg-white p-4 shadow-md",
          "dark:border-zinc-800 dark:bg-zinc-950"
        )}
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
              {formatEventType(event.type)}
            </h4>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {event.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                <User className="mr-2 h-4 w-4" />
                {event.assignees?.length > 0
                  ? event.assignees.join(", ")
                  : "Unassigned"}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(new Date(event.start), "MMM d, yyyy")}
              </div>
              <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                <Clock className="mr-2 h-4 w-4" />
                {event.end ? (
                  <>
                    {format(new Date(event.start), "h:mm a")} -{" "}
                    {format(new Date(event.end), "h:mm a")}
                  </>
                ) : (
                  format(new Date(event.start), "h:mm a")
                )}
              </div>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
