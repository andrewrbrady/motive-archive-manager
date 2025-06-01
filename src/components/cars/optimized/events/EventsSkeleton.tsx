"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface EventsSkeletonProps {
  variant?: "list" | "actions" | "full";
}

export function EventsSkeleton({ variant = "full" }: EventsSkeletonProps) {
  if (variant === "actions") {
    return <ActionsSkeleton />;
  }

  if (variant === "list") {
    return <EventListSkeleton />;
  }

  return (
    <div className="space-y-4">
      <ActionsSkeleton />
      <EventListSkeleton />
    </div>
  );
}

function ActionsSkeleton() {
  return (
    <div className="flex justify-end items-center gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-9" />
      ))}
    </div>
  );
}

function EventListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <EventItemSkeleton key={i} />
      ))}
    </div>
  );
}

function EventItemSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20" /> {/* Event type badge */}
              <Skeleton className="h-5 w-32" /> {/* Event title */}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Skeleton className="h-4 w-24" /> {/* Start date */}
              <Skeleton className="h-4 w-16" /> {/* Duration */}
            </div>
            <Skeleton className="h-4 w-64" /> {/* Description */}
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8" /> {/* Edit button */}
            <Skeleton className="h-8 w-8" /> {/* Delete button */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EventsSkeleton;
