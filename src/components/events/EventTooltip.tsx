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
import { formatEventDateShort } from "@/lib/dateUtils";

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
          "z-50 w-80 rounded-lg border border-[hsl(var(--border-subtle))] bg-[var(--background-primary)] p-4 shadow-md",
          "dark:border-[hsl(var(--border-subtle))] dark:bg-[hsl(var(--background))]"
        )}
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]">
              {formatEventType(event.type)}
            </h4>
            <p className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
              {event.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                <User className="mr-2 h-4 w-4" />
                {event.teamMemberIds?.length > 0
                  ? event.teamMemberIds.join(", ")
                  : "Unassigned"}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatEventDateShort(event.start)}
              </div>
              <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
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
