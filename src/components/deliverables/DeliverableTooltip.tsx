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
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {deliverable.title}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                <MonitorPlay className="mr-2 h-4 w-4" />
                {deliverable.platform}
              </div>
              <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                <User className="mr-2 h-4 w-4" />
                {deliverable.editor}
              </div>
            </div>

            <div className="space-y-1">
              {!deliverable.hideDates && (
                <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliverable.isDeadline ? (
                    <>
                      <span className="font-medium text-red-500 dark:text-red-400">
                        Deadline:
                      </span>{" "}
                      {format(
                        new Date(deliverable.edit_deadline),
                        "MMM d, yyyy"
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-green-500 dark:text-green-400">
                        Release:
                      </span>{" "}
                      {format(
                        new Date(deliverable.release_date),
                        "MMM d, yyyy"
                      )}
                    </>
                  )}
                </div>
              )}
              {deliverable.type !== "Photo Gallery" && (
                <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
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
                  ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  : deliverable.status === "in_progress"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
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
