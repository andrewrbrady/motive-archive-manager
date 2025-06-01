"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useAPI } from "@/hooks/useAPI";
import { Event, EventType } from "@/types/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EventsSkeleton } from "./EventsSkeleton";
import { CalendarDays, Clock, Pencil, Trash2 } from "lucide-react";

interface BaseEventsProps {
  carId: string;
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
  onEdit,
  onDelete,
  onLoadMore,
  isEditMode = false,
}: BaseEventsProps) {
  const api = useAPI();
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentEvents();
  }, [carId, api]);

  const fetchRecentEvents = async () => {
    if (!api) {
      console.log("BaseEvents: API not available");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log("BaseEvents: Fetching events for car:", carId);

      // Use the same API pattern as original EventsTab
      const data = (await api.get(`cars/${carId}/events`)) as Event[];

      console.log("BaseEvents: Received data:", data);

      // Sort by start date (newest first) and take first 10 for initial display
      const sortedEvents = data.sort(
        (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
      );
      const recentEvents = sortedEvents.slice(0, 10);

      console.log("BaseEvents: Showing recent events:", recentEvents.length);
      setRecentEvents(recentEvents);
    } catch (error) {
      console.error("BaseEvents: Error fetching events:", error);
      setError("Failed to load events");
      toast.error("Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!api) return;

    try {
      // Optimistic update
      setRecentEvents((current) =>
        current.filter((event) => event.id !== eventId)
      );

      await api.delete(`cars/${carId}/events/${eventId}`);
      toast.success("Event deleted successfully");

      if (onDelete) {
        onDelete(eventId);
      }
    } catch (error) {
      // Revert optimistic update
      fetchRecentEvents();
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  if (isLoading) {
    return <EventsSkeleton variant="list" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive mb-2">{error}</p>
          <Button variant="outline" onClick={fetchRecentEvents}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (recentEvents.length === 0) {
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
      {recentEvents.map((event) => (
        <EventDisplay
          key={event.id}
          event={event}
          onEdit={onEdit}
          onDelete={handleDelete}
          isEditMode={isEditMode}
        />
      ))}

      {recentEvents.length >= 10 && (
        <div className="text-center pt-4">
          <Button variant="outline" onClick={onLoadMore} className="w-full">
            Load More Events
          </Button>
        </div>
      )}
    </div>
  );
}

function EventDisplay({
  event,
  onEdit,
  onDelete,
  isEditMode,
}: EventDisplayProps) {
  const formatEventType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const getEventTypeColor = (type: EventType) => {
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
  };

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
                onClick={() => onEdit?.(event)}
                className="h-8 w-8 p-0"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete?.(event.id)}
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
}

export default BaseEvents;
