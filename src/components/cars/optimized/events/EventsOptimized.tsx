"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useSession } from "@/hooks/useFirebaseAuth";
import { useAPI } from "@/hooks/useAPI";
import { Event, EventType } from "@/types/event";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, FileJson, Package, Copy, Plus } from "lucide-react";
import { EventsSkeleton } from "./EventsSkeleton";
import { BaseEvents } from "./BaseEvents";

// Lazy load heavy components
const EventsEditor = lazy(() => import("./EventsEditor"));
const CreateEventDialog = lazy(() => import("./CreateEventDialog"));

interface EventsOptimizedProps {
  carId: string;
}

export function EventsOptimized({ carId }: EventsOptimizedProps) {
  const { data: session, status } = useSession();
  const api = useAPI();

  console.log(
    "EventsOptimized: Rendering with status:",
    status,
    "carId:",
    carId
  );

  // Core state
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [isEditMode, setIsEditMode] = useState(false);
  const [showBatchManager, setShowBatchManager] = useState(false);
  const [showBatchTemplates, setShowBatchTemplates] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);

  // Performance tracking
  const [hasLoadedAdvanced, setHasLoadedAdvanced] = useState(false);
  const [hasLoadedAllEvents, setHasLoadedAllEvents] = useState(false);

  // Simple loading guard
  if (status === "loading" || !api) {
    console.log("EventsOptimized: Loading - status:", status, "api:", !!api);
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Authentication guard
  if (status !== "authenticated" || !session?.user) {
    console.log(
      "EventsOptimized: Not authenticated - status:",
      status,
      "user:",
      !!session?.user
    );
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">
          Please sign in to view events
        </div>
      </div>
    );
  }

  console.log("EventsOptimized: Authenticated, rendering content");

  return (
    <EventsOptimizedContent
      carId={carId}
      events={events}
      setEvents={setEvents}
      isLoading={isLoading}
      setIsLoading={setIsLoading}
      isEditMode={isEditMode}
      setIsEditMode={setIsEditMode}
      showBatchManager={showBatchManager}
      setShowBatchManager={setShowBatchManager}
      showBatchTemplates={showBatchTemplates}
      setShowBatchTemplates={setShowBatchTemplates}
      showCreateEvent={showCreateEvent}
      setShowCreateEvent={setShowCreateEvent}
      showJsonUpload={showJsonUpload}
      setShowJsonUpload={setShowJsonUpload}
      isSubmittingJson={isSubmittingJson}
      setIsSubmittingJson={setIsSubmittingJson}
      hasLoadedAdvanced={hasLoadedAdvanced}
      setHasLoadedAdvanced={setHasLoadedAdvanced}
      hasLoadedAllEvents={hasLoadedAllEvents}
      setHasLoadedAllEvents={setHasLoadedAllEvents}
    />
  );
}

interface EventsOptimizedContentProps {
  carId: string;
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  showBatchManager: boolean;
  setShowBatchManager: React.Dispatch<React.SetStateAction<boolean>>;
  showBatchTemplates: boolean;
  setShowBatchTemplates: React.Dispatch<React.SetStateAction<boolean>>;
  showCreateEvent: boolean;
  setShowCreateEvent: React.Dispatch<React.SetStateAction<boolean>>;
  showJsonUpload: boolean;
  setShowJsonUpload: React.Dispatch<React.SetStateAction<boolean>>;
  isSubmittingJson: boolean;
  setIsSubmittingJson: React.Dispatch<React.SetStateAction<boolean>>;
  hasLoadedAdvanced: boolean;
  setHasLoadedAdvanced: React.Dispatch<React.SetStateAction<boolean>>;
  hasLoadedAllEvents: boolean;
  setHasLoadedAllEvents: React.Dispatch<React.SetStateAction<boolean>>;
}

function EventsOptimizedContent({
  carId,
  events,
  setEvents,
  isLoading,
  setIsLoading,
  isEditMode,
  setIsEditMode,
  showBatchManager,
  setShowBatchManager,
  showBatchTemplates,
  setShowBatchTemplates,
  showCreateEvent,
  setShowCreateEvent,
  showJsonUpload,
  setShowJsonUpload,
  isSubmittingJson,
  setIsSubmittingJson,
  hasLoadedAdvanced,
  setHasLoadedAdvanced,
  hasLoadedAllEvents,
  setHasLoadedAllEvents,
}: EventsOptimizedContentProps) {
  const api = useAPI();

  useEffect(() => {
    // Background load all events after initial render
    if (!hasLoadedAllEvents) {
      loadAllEvents();
    }
  }, [carId, hasLoadedAllEvents]);

  const loadAllEvents = async () => {
    if (!api || hasLoadedAllEvents) return;

    try {
      const data = (await api.get(`cars/${carId}/events`)) as Event[];
      setEvents(data);
      setHasLoadedAllEvents(true);
    } catch (error) {
      console.error("Error loading all events:", error);
      // Don't show error toast for background loading
    }
  };

  const fetchEvents = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const data = (await api.get(`cars/${carId}/events`)) as Event[];
      setEvents(data);
      setHasLoadedAllEvents(true);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEvent = async (
    eventId: string,
    updates: Partial<Event>
  ) => {
    if (!api) return;

    try {
      // Optimistic update
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === eventId ? { ...event, ...updates } : event
        )
      );

      await api.put(`cars/${carId}/events/${eventId}`, updates);
      toast.success("Event updated successfully");
    } catch (error) {
      // Revert optimistic update
      fetchEvents();
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!api) return;

    try {
      // Optimistic update
      setEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== eventId)
      );

      await api.delete(`cars/${carId}/events/${eventId}`);
      toast.success("Event deleted successfully");
    } catch (error) {
      // Revert optimistic update
      fetchEvents();
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
      throw error;
    }
  };

  const handleCreateEvent = async (eventData: Partial<Event>) => {
    if (!api) return;

    try {
      await api.post(`cars/${carId}/events`, eventData);
      toast.success("Event created successfully");
      setShowCreateEvent(false);
      fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create event"
      );
      throw error;
    }
  };

  const handleJsonSubmit = async (jsonData: any[]) => {
    if (!api) return;

    try {
      setIsSubmittingJson(true);
      const result = (await api.post(`cars/${carId}/events/batch`, {
        events: jsonData,
      })) as { count: number };

      toast.success(`Successfully created ${result.count} events`);
      fetchEvents();
    } catch (error) {
      console.error("Error creating events from JSON:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create events"
      );
      throw error;
    } finally {
      setIsSubmittingJson(false);
    }
  };

  const handleLoadMore = () => {
    // This will trigger the advanced editor to load
    setHasLoadedAdvanced(true);
    if (!hasLoadedAllEvents) {
      loadAllEvents();
    }
  };

  const handleEditModeToggle = () => {
    setIsEditMode(!isEditMode);
    if (!hasLoadedAdvanced) {
      setHasLoadedAdvanced(true);
    }
  };

  const needsAdvancedEditor =
    hasLoadedAdvanced ||
    isEditMode ||
    showBatchManager ||
    showBatchTemplates ||
    showJsonUpload;

  console.log("EventsOptimizedContent: Rendering decision", {
    needsAdvancedEditor,
    hasLoadedAdvanced,
    isEditMode,
    showBatchManager,
    showBatchTemplates,
    showJsonUpload,
    carId,
  });

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        {/* Action Buttons */}
        <div className="flex justify-end items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="icon"
                onClick={handleEditModeToggle}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit All</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setShowJsonUpload(true);
                  setHasLoadedAdvanced(true);
                }}
              >
                <FileJson className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Batch Create from JSON</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setShowBatchManager(true);
                  setHasLoadedAdvanced(true);
                }}
              >
                <Package className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Batch Manager</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setShowBatchTemplates(true);
                  setHasLoadedAdvanced(true);
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create from Template</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowCreateEvent(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Event</TooltipContent>
          </Tooltip>
        </div>

        {/* Event Display */}
        {needsAdvancedEditor ? (
          <Suspense fallback={<EventsSkeleton />}>
            <EventsEditor
              carId={carId}
              events={events}
              isEditMode={isEditMode}
              showBatchManager={showBatchManager}
              showBatchTemplates={showBatchTemplates}
              showJsonUpload={showJsonUpload}
              isSubmittingJson={isSubmittingJson}
              onUpdateEvent={handleUpdateEvent}
              onDeleteEvent={handleDeleteEvent}
              onEventUpdated={fetchEvents}
              onCloseBatchManager={() => setShowBatchManager(false)}
              onCloseBatchTemplates={() => setShowBatchTemplates(false)}
              onCloseJsonUpload={() => setShowJsonUpload(false)}
              onJsonSubmit={handleJsonSubmit}
            />
          </Suspense>
        ) : (
          <BaseEvents
            carId={carId}
            onEdit={(event) => {
              setHasLoadedAdvanced(true);
              setIsEditMode(true);
            }}
            onDelete={handleDeleteEvent}
            onLoadMore={handleLoadMore}
            isEditMode={isEditMode}
          />
        )}

        {/* Create Event Dialog */}
        {showCreateEvent && (
          <Suspense fallback={<div>Loading...</div>}>
            <CreateEventDialog
              open={showCreateEvent}
              onOpenChange={setShowCreateEvent}
              onCreate={handleCreateEvent}
              carId={carId}
            />
          </Suspense>
        )}
      </div>
    </TooltipProvider>
  );
}

export default EventsOptimized;
