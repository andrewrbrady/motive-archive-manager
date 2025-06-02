"use client";

import { useState, memo, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { useAPI } from "@/hooks/useAPI";
import { Event, EventType } from "@/types/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EventsSkeleton } from "./EventsSkeleton";
import { CalendarDays, Clock, Pencil, Trash2, Loader2 } from "lucide-react";

interface BaseEventsProps {
  carId: string;
  events?: Event[];
  isLoading?: boolean;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  onLoadMore?: () => void;
  isEditMode?: boolean;
}

interface EventDisplayProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  isEditMode?: boolean;
}

export function BaseEvents({
  carId,
  events: providedEvents,
  isLoading: providedLoading,
  onEdit,
  onDelete,
  onLoadMore,
  isEditMode = false,
}: BaseEventsProps) {
  const api = useAPI();

  // Use optimized query hook - only when no events are provided from parent
  const {
    data: eventsData,
    isLoading: localLoading,
    error,
    refetch: refreshEvents,
  } = useAPIQuery<Event[]>(`cars/${carId}/events`, {
    staleTime: 3 * 60 * 1000, // 3 minutes cache
    retry: 2,
    retryDelay: 1000,
    // This ensures the query is enabled and won't block tab switching
    refetchOnWindowFocus: false,
    // Only fetch locally if no events are provided from parent
    enabled: !providedEvents && providedLoading === undefined,
  });

  // Use provided events if available, otherwise use fetched events
  const events = providedEvents || eventsData || [];
  const isLoading =
    providedLoading !== undefined ? providedLoading : localLoading;

  // Memoize sorted events for performance
  const sortedEvents = useMemo(() => {
    return events.sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
    );
  }, [events]);

  // Display only first 10 events
  const displayEvents = useMemo(() => {
    return sortedEvents.slice(0, 10);
  }, [sortedEvents]);

  /**
   * Optimized delete operation - delegates to parent component for proper cache handling
   */
  const handleDelete = useCallback(
    async (eventId: string) => {
      // Delegate to parent component which uses React Query mutations
      if (onDelete) {
        onDelete(eventId);
        return;
      }

      // Fallback for when no parent handler is provided (standalone usage)
      if (!api) return;

      try {
        await api.delete(`cars/${carId}/events/${eventId}`);

        // Only refresh if this component is managing its own data
        if (!providedEvents) {
          refreshEvents();
        }
        toast.success("Event deleted successfully");
      } catch (error) {
        console.error("Error deleting event:", error);
        toast.error("Failed to delete event");
      }
    },
    [api, carId, onDelete, refreshEvents, providedEvents]
  );

  // Handle error state without blocking UI
  if (error) {
    console.error("Error fetching events:", error);
  }

  // Non-blocking loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Loading events...
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            You can switch tabs while this loads
          </p>
        </div>
      </div>
    );
  }

  // Error display - non-blocking
  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/15 border border-destructive/20 rounded-md p-3">
          <p className="text-destructive text-sm">
            Failed to load events. Tab switching is still available.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshEvents()}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No events found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayEvents.map((event) => (
        <MemoizedEventDisplay
          key={event.id}
          event={event}
          onEdit={onEdit}
          onDelete={handleDelete}
          isEditMode={isEditMode}
        />
      ))}

      {displayEvents.length >= 10 && sortedEvents.length > 10 && (
        <div className="text-center pt-4">
          <Button variant="outline" onClick={onLoadMore} className="w-full">
            Load More Events
          </Button>
        </div>
      )}
    </div>
  );
}

// Memoized EventDisplay component for performance optimization
const EventDisplay = memo(
  function EventDisplay({
    event,
    onEdit,
    onDelete,
    isEditMode,
  }: EventDisplayProps) {
    const formatEventType = useCallback((type: string) => {
      return type
        .split("_")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    }, []);

    const formatDate = useCallback((dateString: string) => {
      try {
        return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
      } catch {
        return "Invalid date";
      }
    }, []);

    const getEventTypeColor = useCallback((type: EventType) => {
      switch (type) {
        case EventType.AUCTION_SUBMISSION:
          return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
        case EventType.AUCTION_LISTING:
          return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
        case EventType.AUCTION_END:
          return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
        case EventType.INSPECTION:
          return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
        case EventType.DETAIL:
          return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
        case EventType.PRODUCTION:
          return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300";
        case EventType.PICKUP:
        case EventType.DELIVERY:
          return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      }
    }, []);

    const handleEditClick = useCallback(() => {
      onEdit?.(event);
    }, [onEdit, event]);

    const handleDeleteClick = useCallback(() => {
      onDelete?.(event.id);
    }, [onDelete, event.id]);

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={getEventTypeColor(event.type)}>
                  {formatEventType(event.type)}
                </Badge>
                <h3 className="font-medium text-foreground">{event.title}</h3>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  <span>{formatDate(event.start)}</span>
                </div>
                {event.end && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Until {formatDate(event.end)}</span>
                  </div>
                )}
              </div>

              {event.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {event.description}
                </p>
              )}

              {event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View Details →
                </a>
              )}
            </div>

            {isEditMode && (
              <div className="flex items-center gap-1 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditClick}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteClick}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    // Simple reference equality check - avoid expensive deep comparisons
    return (
      prevProps.event.id === nextProps.event.id &&
      prevProps.isEditMode === nextProps.isEditMode &&
      prevProps.onEdit === nextProps.onEdit &&
      prevProps.onDelete === nextProps.onDelete
    );
  }
);

// Create a stable reference for the memoized component
const MemoizedEventDisplay = EventDisplay;

export default BaseEvents;
