"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  View,
  Views,
  Components,
  EventProps,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, addMinutes } from "date-fns";
import { enUS } from "date-fns/locale";
import { Event, EventStatus } from "@/types/event";
import { Deliverable } from "@/types/deliverable";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Maximize2,
  Minimize2,
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
} from "lucide-react";
import EventTooltip from "../events/EventTooltip";
import DeliverableTooltip from "../deliverables/DeliverableTooltip";
import "./calendar.css";
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
import InfiniteMonthView from "./InfiniteMonthView";
import { Separator } from "@/components/ui/separator";

// Create DnD Calendar with proper typing
const DragAndDropCalendar = withDragAndDrop<CalendarEvent, object>(
  Calendar as any
);

interface CalendarTabProps {
  carId: string;
}

type DeliverableWithEventType = Deliverable & {
  eventType: "deadline" | "release";
};

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "event" | "deliverable";
  resource: Event | DeliverableWithEventType;
  allDay: boolean;
}

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Replace hex colors with theme variables
const statusColors = {
  NOT_STARTED: "var(--destructive)",
  IN_PROGRESS: "var(--warning)",
  COMPLETED: "var(--success)",
  default: "var(--zinc-500)",
  purple: "var(--purple-500)",
  blue: "var(--info)",
};

export default function CalendarTab({ carId }: CalendarTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [view, setView] = useState<View>("month" as View);
  const [date, setDate] = useState(new Date());
  const [showEvents, setShowEvents] = useState(true);
  const [showDeliverables, setShowDeliverables] = useState(true);
  const calendarRef = useRef<HTMLDivElement>(null);
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

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/cars/${carId}/events`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events");
    }
  };

  const fetchDeliverables = async () => {
    try {
      const response = await fetch(`/api/cars/${carId}/deliverables`);
      if (!response.ok) throw new Error("Failed to fetch deliverables");
      const data = await response.json();
      setDeliverables(data);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      toast.error("Failed to fetch deliverables");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([fetchEvents(), fetchDeliverables()]);
      setIsLoading(false);
      // Ensure we navigate to today's date after loading data
      setDate(new Date());
    };
    fetchData();
  }, [carId]);

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

  const filteredCalendarEvents = useMemo(() => {
    const eventItems: CalendarEvent[] = showEvents
      ? events
          .filter(
            (event) =>
              eventTypeFilters.length === 0 ||
              eventTypeFilters.includes(event.type)
          )
          .map(
            (event): CalendarEvent => ({
              id: event.id,
              title: event.type
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase()),
              start: new Date(event.start),
              end: event.end ? new Date(event.end) : new Date(event.start),
              type: "event",
              resource: event,
              allDay: event.isAllDay || !event.end || view === "month",
            })
          )
      : [];

    const deliverableItems: CalendarEvent[] = showDeliverables
      ? deliverables
          .filter(
            (deliverable) =>
              (deliverablePlatformFilters.length === 0 ||
                deliverablePlatformFilters.includes(deliverable.platform)) &&
              (deliverableTypeFilters.length === 0 ||
                deliverableTypeFilters.includes(deliverable.type))
          )
          .flatMap((deliverable): CalendarEvent[] => {
            const items: CalendarEvent[] = [];

            if (
              deliverableEventFilters.length === 0 ||
              deliverableEventFilters.includes("deadline")
            ) {
              const deadlineEvent: CalendarEvent = {
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
                const releaseEvent: CalendarEvent = {
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
    view,
  ]);

  const getEventStyle = (event: CalendarEvent) => {
    if (event.type === "event") {
      const eventResource = event.resource as Event;
      let backgroundColor = "#374151"; // Default gray (zinc-700)

      switch (eventResource.status) {
        case EventStatus.NOT_STARTED:
          backgroundColor = "#374151"; // zinc-700
          break;
        case EventStatus.IN_PROGRESS:
          backgroundColor = "var(--accent-hover)"; // blue-600
          break;
        case EventStatus.COMPLETED:
          backgroundColor = "#059669"; // emerald-600
          break;
      }

      return {
        style: {
          backgroundColor,
          color: "var(--background-primary)",
          border: "none",
          borderRadius: "4px",
          padding: "2px 4px",
          opacity: 0.9,
        },
      };
    } else {
      // Deliverable styling
      const deliverableResource = event.resource as DeliverableWithEventType;
      let backgroundColor = "#d97706"; // Default amber-600

      if (deliverableResource.eventType === "deadline") {
        backgroundColor = "var(--error-secondary)"; // red-600 for deadlines
      } else if (deliverableResource.eventType === "release") {
        backgroundColor = "#7c3aed"; // violet-600 for releases
      }

      // Modify colors based on status
      switch (deliverableResource.status) {
        case "not_started":
          // Keep default colors based on eventType but slightly muted
          backgroundColor = backgroundColor + "e6"; // 90% opacity
          break;
        case "in_progress":
          // Slightly darken the colors
          backgroundColor =
            deliverableResource.eventType === "deadline"
              ? "#b91c1c" // red-700
              : "#6d28d9"; // violet-700
          break;
        case "done":
          backgroundColor = "#059669"; // emerald-600
          break;
      }

      return {
        style: {
          backgroundColor,
          color: "var(--background-primary)",
          border: "none",
          borderRadius: "4px",
          padding: "2px 4px",
          opacity: 0.9,
        },
      };
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      calendarRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Initialize all filters when data is loaded
  useEffect(() => {
    setEventTypeFilters([...uniqueEventTypes]);
    setDeliverableTypeFilters([...uniqueDeliverableTypes]);
    setDeliverablePlatformFilters([...uniqueDeliverablePlatforms]);
    setDeliverableEventFilters([...deliverableEventCategories]);
  }, [uniqueEventTypes, uniqueDeliverableTypes, uniqueDeliverablePlatforms]);

  // Add type for valid views
  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  type ViewType = "month" | "week" | "work_week" | "agenda";

  interface ToolbarProps {
    view: View;
    label: string;
    onView: (view: View) => void;
    onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
  }

  const components: Components<CalendarEvent, object> = {
    event: ({ event }: EventProps<CalendarEvent>) => {
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
    toolbar: (toolbarProps: ToolbarProps) => (
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
              onClick={() => toolbarProps.onView("month" as View)}
              className={cn(
                "flex items-center justify-center px-3 py-1",
                (toolbarProps.view as string) === "month" && "rbc-active"
              )}
              title="Month view"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => toolbarProps.onView("week" as View)}
              className={cn(
                "flex items-center justify-center px-3 py-1",
                (toolbarProps.view as string) === "week" && "rbc-active"
              )}
              title="Week view"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => toolbarProps.onView("work_week" as View)}
              className={cn(
                "flex items-center justify-center px-3 py-1",
                (toolbarProps.view as string) === "work_week" && "rbc-active"
              )}
              title="Work Week view"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => toolbarProps.onView("agenda" as View)}
              className={cn(
                "flex items-center justify-center px-3 py-1",
                (toolbarProps.view as string) === "agenda" && "rbc-active"
              )}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEvents(!showEvents)}
              className={cn(
                "flex items-center gap-2",
                showEvents && "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))]"
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
                showDeliverables && "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))]"
              )}
            >
              {showDeliverables ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              Deliverables
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
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
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    ),
    agenda: {
      event: ({ event }: EventProps<CalendarEvent>) => {
        const isSameDay =
          event.start.toDateString() === event.end?.toDateString();
        const dateTimeDisplay = isSameDay
          ? `${format(event.start, "MMM d")} ${format(event.start, "h:mm a")}${
              event.end ? ` - ${format(event.end, "h:mm a")}` : ""
            }`
          : `${format(event.start, "MMM d h:mm a")} - ${format(
              event.end,
              "MMM d h:mm a"
            )}`;

        return (
          <div className="flex items-center gap-2 py-1">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                event.type === "event" ? "bg-info-500" : "bg-warning-500"
              )}
            />
            <span className="font-medium">{event.title}</span>
            <span className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] text-sm">
              {dateTimeDisplay}
            </span>
          </div>
        );
      },
    },
  };

  interface DragDropEventArgs {
    event: CalendarEvent;
    start: Date;
    end: Date;
    isAllDay: boolean;
  }

  interface ResizeEventArgs {
    event: CalendarEvent;
    start: Date;
    end: Date;
  }

  const handleEventDrop = async ({
    event,
    start,
    end,
    isAllDay,
  }: DragDropEventArgs) => {
    try {
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

        await fetchEvents();
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

        await fetchDeliverables();
        toast.success(
          `${
            isDeadline ? "Edit deadline" : "Release date"
          } updated successfully`
        );
      }
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update event"
      );
    }
  };

  const handleEventResize = async ({ event, start, end }: ResizeEventArgs) => {
    try {
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

        await fetchEvents();
        toast.success("Event updated successfully");
      } else if (event.type === "deliverable") {
        toast.error("Deliverable dates cannot be resized");
        return;
      }
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update event"
      );
    }
  };

  if (isLoading) {
    return <div>Loading calendar...</div>;
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      <div
        ref={calendarRef}
        className={cn(
          "flex-1 overflow-hidden rounded-lg border bg-background shadow-sm",
          isFullscreen && "h-screen w-screen"
        )}
      >
        <DragAndDropCalendar
          localizer={localizer}
          events={filteredCalendarEvents}
          startAccessor="start"
          endAccessor="end"
          eventPropGetter={(event) => {
            const eventResource = event.resource as Event;
            const status = eventResource.status;
            return {
              style: {
                backgroundColor: statusColors[status] || statusColors.default,
                color: "var(--background-primary)",
                border: "none",
                borderRadius: "4px",
                padding: "2px 4px",
                opacity: 0.9,
              },
            };
          }}
          views={{
            [Views.MONTH]: true,
            [Views.WEEK]: true,
            [Views.WORK_WEEK]: true,
            [Views.AGENDA]: true,
          }}
          view={view}
          date={date}
          onView={handleViewChange}
          onNavigate={(newDate: Date) => setDate(newDate)}
          min={new Date(0, 0, 0, 8, 0, 0)}
          max={new Date(0, 0, 0, 20, 0, 0)}
          components={components}
          className={cn(
            "events-calendar h-full",
            isFullscreen && "fullscreen-calendar"
          )}
          onEventDrop={(args) => handleEventDrop(args as DragDropEventArgs)}
          onEventResize={(args) => handleEventResize(args as ResizeEventArgs)}
          resizable
          selectable
          draggableAccessor={() => true}
          resizableAccessor={(event) => !(event as CalendarEvent).allDay}
          showMultiDayTimes
          popup
          timeslots={2}
          step={30}
          defaultView={view}
          dayLayoutAlgorithm="no-overlap"
          scrollToTime={new Date(0, 0, 0, 8, 0, 0)}
          longPressThreshold={10}
          formats={{
            timeGutterFormat: (date: Date) => {
              return format(date, "h aa").toLowerCase();
            },
            agendaDateFormat: "MMM d, yyyy",
            agendaTimeFormat: "h:mm a",
            agendaTimeRangeFormat: ({ start, end }) => {
              if (start.getDate() === end.getDate()) {
                return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
              }
              return `${format(start, "MMM d h:mm a")} - ${format(
                end,
                "MMM d h:mm a"
              )}`;
            },
          }}
          messages={{
            allDay: "All Day",
            date: "Date",
            time: "Time",
            event: "Event",
            noEventsInRange: "No events in this range.",
            showMore: (total) => `+${total} more`,
            tomorrow: "Tomorrow",
            today: "Today",
            agenda: "List",
          }}
        />
      </div>
    </div>
  );
}
