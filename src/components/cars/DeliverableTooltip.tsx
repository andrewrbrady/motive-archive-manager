"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CalendarIcon, Clock, User, Video } from "lucide-react";
import { format } from "date-fns";
import { Deliverable } from "@/types/deliverable";
import { cn } from "@/lib/utils";

interface DeliverableTooltipProps {
  children: React.ReactNode;
  deliverable: Deliverable;
}

export default function DeliverableTooltip({
  children,
  deliverable,
}: DeliverableTooltipProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">{deliverable.title}</h4>
            <p className="text-sm text-muted-foreground">
              {deliverable.description || "No description"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                <User className="mr-2 h-4 w-4" />
                {deliverable.editor || "Unassigned"}
              </div>
              <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                <Video className="mr-2 h-4 w-4" />
                {deliverable.platform}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(new Date(deliverable.edit_deadline), "MMM d, yyyy")}
              </div>
              <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                <Clock className="mr-2 h-4 w-4" />
                {deliverable.release_date &&
                  format(new Date(deliverable.release_date), "MMM d, yyyy")}
              </div>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
