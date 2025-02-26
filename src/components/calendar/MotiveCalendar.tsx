"use client";

import { useState, useEffect, useMemo } from "react";
import { Components, EventProps } from "react-big-calendar";
import BaseCalendar, { BaseCalendarEvent } from "./BaseCalendar";
import { Event, EventStatus } from "@/types/event";
import { Deliverable } from "@/types/deliverable";
import EventTooltip from "../events/EventTooltip";
import DeliverableTooltip from "../deliverables/DeliverableTooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Filter,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// Define EventInteractionArgs interface
interface EventInteractionArgs<TEvent> {
  event: TEvent;
  start: Date;
  end: Date;
  isAllDay?: boolean;
}

// Type for deliverable with event type
type DeliverableWithEventType = Deliverable & {
  eventType: "deadline" | "release";
};

// Calendar event interface
export interface MotiveCalendarEvent extends BaseCalendarEvent {
  type: "event" | "deliverable";
  resource: Event | DeliverableWithEventType;
}

// Props for the MotiveCalendar component
export interface MotiveCalendarProps {
  carId: string;
  events: Event[];
  deliverables: Deliverable[];
  onEventDrop?: (args: any) => void;
  onEventResize?: (args: any) => void;
  onSelectEvent?: (event: any) => void;
  className?: string;
  style?: React.CSSProperties;
  showFilterControls?: boolean;
  showVisibilityControls?: boolean;
}

export function MotiveCalendar({
  carId,
  events,
  deliverables,
  onEventDrop,
  onEventResize,
  onSelectEvent,
  className,
  style,
  showFilterControls = true,
  showVisibilityControls = true,
}: MotiveCalendarProps) {
  const [showEvents, setShowEvents] = useState(true);
  const [showDeliverables, setShowDeliverables] = useState(true);
  const [eventTypeFilters, setEventTypeFilters] = useState<string[]>([]);
  const [deliverableTypeFilters, setDeliverableTypeFilters] = useState<
    string[]
  >([]);
  const [deliverablePlatformFilters, setDeliverablePlatformFilters] = useState<
    string[]
  >([]);
  const [deliverableEventFilters, setDeliverableEventFilters] = useState<
    string[]
  >([]);

  // Get unique event types
  const uniqueEventTypes = useMemo(() => {
    return [...new Set(events.map((event) => event.type))];
  }, [events]);

  // Get unique deliverable event categories (deadline and release)
  const deliverableEventCategories = ["deadline", "release"];

  // Get unique deliverable types
  const uniqueDeliverableTypes = useMemo(() => {
    return [...new Set(deliverables.map((deliverable) => deliverable.type))];
  }, [deliverables]);

  // Get unique deliverable platforms
  const uniqueDeliverablePlatforms = useMemo(() => {
    return [
      ...new Set(deliverables.map((deliverable) => deliverable.platform)),
    ];
  }, [deliverables]);

  // Initialize all filters when data is loaded
  useEffect(() => {
    setEventTypeFilters([...uniqueEventTypes]);
    setDeliverableTypeFilters([...uniqueDeliverableTypes]);
    setDeliverablePlatformFilters([...uniqueDeliverablePlatforms]);
    setDeliverableEventFilters([...deliverableEventCategories]);
  }, [uniqueEventTypes, uniqueDeliverableTypes, uniqueDeliverablePlatforms]);

  const calendarEvents = useMemo(() => {
    const eventItems: MotiveCalendarEvent[] = showEvents
      ? events
          .filter(
            (event) =>
              eventTypeFilters.length === 0 ||
              eventTypeFilters.includes(event.type)
          )
          .map(
            (event): MotiveCalendarEvent => ({
              id: event.id,
              title: event.type
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase()),
              start: new Date(event.start),
              end: event.end ? new Date(event.end) : new Date(event.start),
              type: "event",
              resource: event,
              allDay: event.isAllDay || !event.end,
            })
          )
      : [];

    const deliverableItems: MotiveCalendarEvent[] = showDeliverables
      ? deliverables
          .filter(
            (deliverable) =>
              (deliverablePlatformFilters.length === 0 ||
                deliverablePlatformFilters.includes(deliverable.platform)) &&
              (deliverableTypeFilters.length === 0 ||
                deliverableTypeFilters.includes(deliverable.type))
          )
          .flatMap((deliverable): MotiveCalendarEvent[] => {
            const items: MotiveCalendarEvent[] = [];

            if (
              deliverableEventFilters.length === 0 ||
              deliverableEventFilters.includes("deadline")
            ) {
              const deadlineEvent: MotiveCalendarEvent = {
                id: `${deliverable._id?.toString()}-deadline`,
                title: `${deliverable.title} (Edit Deadline)`,
                start: new Date(deliverable.edit_deadline),
                end: new Date(deliverable.edit_deadline),
                type: "deliverable",
                resource: {
                  ...deliverable,
                  eventType: "deadline",
                } as DeliverableWithEventType,
                allDay: true,
              };
              items.push(deadlineEvent);
            }

            if (
              deliverableEventFilters.length === 0 ||
              deliverableEventFilters.includes("release")
            ) {
              if (deliverable.release_date) {
                const releaseEvent: MotiveCalendarEvent = {
                  id: `${deliverable._id?.toString()}-release`,
                  title: `${deliverable.title} (Release)`,
                  start: new Date(deliverable.release_date),
                  end: new Date(deliverable.release_date),
                  type: "deliverable",
                  resource: {
                    ...deliverable,
                    eventType: "release",
                  } as DeliverableWithEventType,
                  allDay: true,
                };
                items.push(releaseEvent);
              }
            }

            return items;
          })
      : [];

    return [...eventItems, ...deliverableItems].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );
  }, [
    events,
    deliverables,
    eventTypeFilters,
    deliverableEventFilters,
    deliverablePlatformFilters,
    deliverableTypeFilters,
    showEvents,
    showDeliverables,
  ]);

  // Event style getter
  const eventPropGetter = (event: MotiveCalendarEvent) => {
    if (event.type === "event") {
      const eventResource = event.resource as Event;
      // Use event type for primary color grouping
      const backgroundColor = `hsl(var(--event-${eventResource.type.toLowerCase()}))`;

      // Add a border color based on status for secondary visual cue
      const borderColor = `hsl(var(--status-${eventResource.status.toLowerCase()}))`;

      return {
        style: {
          backgroundColor,
          color: "white",
          border: `2px solid ${borderColor}`,
          borderRadius: "4px",
          padding: "2px 4px",
          opacity: 0.9,
          minHeight: "22px",
          fontSize: "0.8125rem",
          lineHeight: "1.2",
          fontWeight: 500,
        },
      };
    } else {
      // Deliverable styling
      const deliverableResource = event.resource as DeliverableWithEventType;
      let backgroundColor = `hsl(var(--deliverable-${deliverableResource.type
        .toLowerCase()
        .replace(/\s+/g, "-")}))`;

      // Use event type (deadline/release) as a secondary indicator
      if (deliverableResource.eventType === "deadline") {
        backgroundColor = `hsl(var(--deliverable-deadline))`;
      } else if (deliverableResource.eventType === "release") {
        backgroundColor = `hsl(var(--deliverable-release))`;
      }

      return {
        style: {
          backgroundColor,
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "2px 4px",
          opacity: 0.9,
          minHeight: "22px",
          fontSize: "0.8125rem",
          lineHeight: "1.2",
          fontWeight: 500,
        },
      };
    }
  };

  // Custom components for the calendar
  const components: Components<MotiveCalendarEvent, object> = {
    event: ({ event }: EventProps<MotiveCalendarEvent>) => {
      if (event.type === "event") {
        return (
          <EventTooltip event={event.resource as Event}>
            <div className="h-full w-full">
              <div className="truncate text-xs leading-none">{event.title}</div>
            </div>
          </EventTooltip>
        );
      } else {
        return (
          <DeliverableTooltip deliverable={event.resource as Deliverable}>
            <div className="h-full w-full">
              <div className="truncate text-xs leading-none">{event.title}</div>
            </div>
          </DeliverableTooltip>
        );
      }
    },
  };

  // Custom toolbar with filter controls
  const customToolbar = (toolbarProps: any) => (
    <div className="rbc-toolbar">
      <div className="rbc-btn-group">
        <button
          type="button"
          onClick={() => toolbarProps.onNavigate("PREV")}
          className="flex items-center justify-center px-3 py-1"
          title="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => toolbarProps.onNavigate("TODAY")}
          className="flex items-center justify-center px-3 py-1"
          title="Today"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => toolbarProps.onNavigate("NEXT")}
          className="flex items-center justify-center px-3 py-1"
          title="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="rbc-toolbar-label">{toolbarProps.label}</div>
      <div className="flex items-center gap-2">
        <div className="rbc-btn-group">
          <button
            type="button"
            onClick={() => toolbarProps.onView("month")}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-1",
              toolbarProps.view === "month" && "rbc-active"
            )}
            title="Month view"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Month</span>
          </button>
          <button
            type="button"
            onClick={() => toolbarProps.onView("week")}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-1",
              toolbarProps.view === "week" && "rbc-active"
            )}
            title="Week view"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Week</span>
          </button>
          <button
            type="button"
            onClick={() => toolbarProps.onView("work_week")}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-1",
              toolbarProps.view === "work_week" && "rbc-active"
            )}
            title="Work Week view"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Work Week</span>
          </button>
          <button
            type="button"
            onClick={() => toolbarProps.onView("agenda")}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-1",
              toolbarProps.view === "agenda" && "rbc-active"
            )}
            title="List view"
          >
            <List className="h-4 w-4" />
            <span>Agenda</span>
          </button>
        </div>

        {showVisibilityControls && (
          <>
            <Separator orientation="vertical" className="h-6" />

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEvents(!showEvents)}
                className={cn(
                  "flex items-center gap-2",
                  showEvents &&
                    "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))]"
                )}
              >
                {showEvents ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Events
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeliverables(!showDeliverables)}
                className={cn(
                  "flex items-center gap-2",
                  showDeliverables &&
                    "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))]"
                )}
              >
                {showDeliverables ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Deliverables
              </Button>
            </div>
          </>
        )}

        {showFilterControls && (
          <>
            <Separator orientation="vertical" className="h-6" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {showEvents && uniqueEventTypes.length > 0 && (
                  <>
                    <DropdownMenuLabel>Event Types</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      {uniqueEventTypes.map((type) => (
                        <DropdownMenuCheckboxItem
                          key={type}
                          checked={eventTypeFilters.includes(type)}
                          onCheckedChange={(checked) => {
                            setEventTypeFilters(
                              checked
                                ? [...eventTypeFilters, type]
                                : eventTypeFilters.filter((t) => t !== type)
                            );
                          }}
                        >
                          {type.replace(/_/g, " ")}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                  </>
                )}

                {showDeliverables && (
                  <>
                    {showEvents && uniqueEventTypes.length > 0 && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuLabel>Deliverable Types</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      {uniqueDeliverableTypes.map((type) => (
                        <DropdownMenuCheckboxItem
                          key={type}
                          checked={deliverableTypeFilters.includes(type)}
                          onCheckedChange={(checked) => {
                            setDeliverableTypeFilters(
                              checked
                                ? [...deliverableTypeFilters, type]
                                : deliverableTypeFilters.filter(
                                    (t) => t !== type
                                  )
                            );
                          }}
                        >
                          {type}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Platforms</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      {uniqueDeliverablePlatforms.map((platform) => (
                        <DropdownMenuCheckboxItem
                          key={platform}
                          checked={deliverablePlatformFilters.includes(
                            platform
                          )}
                          onCheckedChange={(checked) => {
                            setDeliverablePlatformFilters(
                              checked
                                ? [...deliverablePlatformFilters, platform]
                                : deliverablePlatformFilters.filter(
                                    (p) => p !== platform
                                  )
                            );
                          }}
                        >
                          {platform}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Event Categories</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      {deliverableEventCategories.map((category) => (
                        <DropdownMenuCheckboxItem
                          key={category}
                          checked={deliverableEventFilters.includes(category)}
                          onCheckedChange={(checked) => {
                            setDeliverableEventFilters(
                              checked
                                ? [...deliverableEventFilters, category]
                                : deliverableEventFilters.filter(
                                    (c) => c !== category
                                  )
                            );
                          }}
                        >
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );

  const handleEventDropInternal = async (args: any) => {
    try {
      const { event, start, end, isAllDay } = args;

      if (!event.id) {
        throw new Error("Event ID is missing");
      }

      if (event.type === "event") {
        let adjustedEnd;

        // For all-day events, ensure they stay within their day
        if (isAllDay || event.allDay) {
          // Set start to beginning of day
          start.setHours(0, 0, 0, 0);
          // Set end to same day as start
          adjustedEnd = new Date(start);
          adjustedEnd.setHours(23, 59, 59, 999);
        } else {
          // For non-all-day events, maintain original duration
          const originalEvent = event.resource as Event;
          const originalStart = new Date(originalEvent.start);
          const originalEnd = originalEvent.end
            ? new Date(originalEvent.end)
            : new Date(originalEvent.start);
          const originalDuration =
            originalEnd.getTime() - originalStart.getTime();
          adjustedEnd = new Date(start.getTime() + originalDuration);
        }

        const response = await fetch(`/api/cars/${carId}/events/${event.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start: start.toISOString(),
            end: adjustedEnd.toISOString(),
            isAllDay: isAllDay,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Failed to update event";
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // If response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        toast.success("Event updated successfully");
      } else if (event.type === "deliverable") {
        const deliverableId = event.id.split("-")[0];
        const isDeadline = event.id.endsWith("-deadline");

        if (!deliverableId) {
          throw new Error("Deliverable ID is missing");
        }

        const response = await fetch(
          `/api/cars/${carId}/deliverables/${deliverableId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              isDeadline
                ? {
                    edit_deadline: start.toISOString(),
                  }
                : {
                    release_date: start.toISOString(),
                  }
            ),
          }
        );

        if (!response.ok) {
          let errorMessage = "Failed to update deliverable";
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // If response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        toast.success(
          `${
            isDeadline ? "Edit deadline" : "Release date"
          } updated successfully`
        );
      }

      // Call the parent handler if provided
      if (onEventDrop) {
        onEventDrop(args);
      }
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update event"
      );
    }
  };

  const handleEventResizeInternal = async (args: any) => {
    try {
      const { event, start, end } = args;

      if (!event.id) {
        throw new Error("Event ID is missing");
      }

      if (event.type === "event") {
        const response = await fetch(`/api/cars/${carId}/events/${event.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start: start.toISOString(),
            end: end.toISOString(),
          }),
        });

        if (!response.ok) {
          let errorMessage = "Failed to update event";
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // If response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        toast.success("Event updated successfully");
      } else if (event.type === "deliverable") {
        toast.error("Deliverable dates cannot be resized");
        return;
      }

      // Call the parent handler if provided
      if (onEventResize) {
        onEventResize(args);
      }
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update event"
      );
    }
  };

  const handleSelectEventInternal = (event: any) => {
    // Call the parent handler if provided
    if (onSelectEvent) {
      onSelectEvent(event);
    }
  };

  return (
    <BaseCalendar
      events={calendarEvents}
      onEventDrop={handleEventDropInternal}
      onEventResize={handleEventResizeInternal}
      onSelectEvent={handleSelectEventInternal}
      className={cn("events-calendar", className)}
      style={{
        ...style,
        minHeight: "700px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
      }}
      eventPropGetter={eventPropGetter}
      components={components}
      showFilterControls={showFilterControls}
      showVisibilityControls={showVisibilityControls}
      filterOptions={{
        eventTypes: uniqueEventTypes,
        deliverableTypes: uniqueDeliverableTypes,
        deliverablePlatforms: uniqueDeliverablePlatforms,
        showEvents,
        showDeliverables,
        setShowEvents,
        setShowDeliverables,
        eventTypeFilters,
        deliverableTypeFilters,
        deliverablePlatformFilters,
        setEventTypeFilters,
        setDeliverableTypeFilters,
        setDeliverablePlatformFilters,
      }}
      customToolbar={customToolbar}
    />
  );
}
