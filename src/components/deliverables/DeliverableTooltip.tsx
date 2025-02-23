"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CalendarIcon, Clock, MonitorPlay, User } from "lucide-react";
import { format } from "date-fns";
import { Deliverable } from "@/types/deliverable";

interface DeliverableTooltipProps {
  children: React.ReactNode;
  deliverable: Deliverable & {
    car?: { year: number; make: string; model: string };
    isDeadline?: boolean;
    hideTitle?: boolean;
    hideDates?: boolean;
  };
}

export default function DeliverableTooltip({
  children,
  deliverable,
}: DeliverableTooltipProps) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Helper function to safely format dates
  const safeFormat = (date: any): string => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "N/A";
      return format(d, "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80 p-4">
        <div className="space-y-4">
          {!deliverable.hideTitle && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">
                {deliverable.car
                  ? `${deliverable.car.year} ${deliverable.car.make} ${deliverable.car.model}`
                  : "Unknown Car"}
              </h4>
              <p className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                {deliverable.title}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                <MonitorPlay className="mr-2 h-4 w-4" />
                {deliverable.platform}
              </div>
              <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                <User className="mr-2 h-4 w-4" />
                {deliverable.editor}
              </div>
            </div>

            <div className="space-y-1">
              {!deliverable.hideDates && (
                <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliverable.isDeadline ? (
                    <>
                      <span className="font-medium text-destructive-500 dark:text-destructive-400">
                        Deadline:
                      </span>{" "}
                      {safeFormat(deliverable.edit_deadline)}
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-success-500 dark:text-success-400">
                        Release:
                      </span>{" "}
                      {safeFormat(deliverable.release_date)}
                    </>
                  )}
                </div>
              )}
              {deliverable.type !== "Photo Gallery" && (
                <div className="flex items-center text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                  <Clock className="mr-2 h-4 w-4" />
                  {formatDuration(deliverable.duration)} min
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <div
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                deliverable.status === "not_started"
                  ? "bg-destructive-100 text-destructive-700 dark:bg-destructive-900 dark:text-destructive-300"
                  : deliverable.status === "in_progress"
                  ? "bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300"
                  : "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300"
              }`}
            >
              {deliverable.status.replace("_", " ").toUpperCase()}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
