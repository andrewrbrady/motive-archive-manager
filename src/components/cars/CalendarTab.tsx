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
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import InfiniteMonthView from "./InfiniteMonthView";

// Create DnD Calendar
const DragAndDropCalendar = withDragAndDrop(Calendar);

interface CalendarTabProps {
  carId: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "event" | "deliverable";
  resource: Event | Deliverable;
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
              eventTypeFilters.length > 0 &&
              eventTypeFilters.includes(event.type)
          )
          .map((event) => ({
            id: event.id,
            title: event.type
              .replace(/_/g, " ")
              .toLowerCase()
              .replace(/\b\w/g, (l) => l.toUpperCase()),
            start: new Date(event.start),
            end: event.end ? new Date(event.end) : new Date(event.start),
            type: "event",
            resource: event,
            allDay: event.isAllDay || false,
          }))
      : [];

    const deliverableItems: CalendarEvent[] = showDeliverables
      ? deliverables
          .filter(
            (deliverable) =>
              deliverablePlatformFilters.length > 0 &&
              deliverablePlatformFilters.includes(deliverable.platform) &&
              deliverableTypeFilters.length > 0 &&
              deliverableTypeFilters.includes(deliverable.type)
          )
          .flatMap((deliverable) => {
            const items = [];

            if (
              deliverableEventFilters.length > 0 &&
              deliverableEventFilters.includes("deadline")
            ) {
              items.push({
                id: `${deliverable._id?.toString()}-deadline`,
                title: `${deliverable.title} (Edit Deadline)`,
                start: new Date(deliverable.edit_deadline),
                end: new Date(deliverable.edit_deadline),
                type: "deliverable",
                resource: { ...deliverable, eventType: "deadline" },
                allDay: false,
              });
            }

            if (
              deliverableEventFilters.length > 0 &&
              deliverableEventFilters.includes("release")
            ) {
              items.push({
                id: `${deliverable._id?.toString()}-release`,
                title: `${deliverable.title} (Release)`,
                start: new Date(deliverable.release_date),
                end: new Date(deliverable.release_date),
                type: "deliverable",
                resource: { ...deliverable, eventType: "release" },
                allDay: false,
              });
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

  const getEventStyle = (event: CalendarEvent) => {
    if (event.type === "event") {
      const eventResource = event.resource as Event;
      let backgroundColor = "#374151"; // Default gray (zinc-700)

      switch (eventResource.status) {
        case EventStatus.NOT_STARTED:
          backgroundColor = "#374151"; // zinc-700
          break;
        case EventStatus.IN_PROGRESS:
          backgroundColor = "#2563eb"; // blue-600
          break;
        case EventStatus.COMPLETED:
          backgroundColor = "#059669"; // emerald-600
          break;
      }

      return {
        style: {
          backgroundColor,
          color: "#ffffff",
          border: "none",
          borderRadius: "4px",
          padding: "2px 4px",
          opacity: 0.9,
        },
      };
    } else {
      // Deliverable styling
      const deliverableResource = event.resource as Deliverable & {
        eventType?: "deadline" | "release";
      };
      let backgroundColor = "#d97706"; // Default amber-600

      if (deliverableResource.eventType === "deadline") {
        backgroundColor = "#dc2626"; // red-600 for deadlines
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
          color: "#ffffff",
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
                event.type === "event" ? "bg-blue-500" : "bg-amber-500"
              )}
            />
            <span className="font-medium">{event.title}</span>
            <span className="text-zinc-500 dark:text-zinc-400 text-sm">
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
        const response = await fetch(`/api/cars/${carId}/events/${event.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start: start.toISOString(),
            end: end.toISOString(),
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
    <div
      ref={calendarRef}
      className={cn(
        "relative w-full",
        isFullscreen ? "h-screen" : "h-[900px]",
        "bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg p-4"
      )}
    >
      <DragAndDropCalendar
        localizer={localizer}
        events={filteredCalendarEvents}
        startAccessor={(event: CalendarEvent) => event.start}
        endAccessor={(event: CalendarEvent) => event.end}
        eventPropGetter={getEventStyle}
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
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        resizable
        selectable
        draggableAccessor={() => true}
        resizableAccessor={() => true}
        showMultiDayTimes
        popup
        length={30}
        defaultView={view}
        dayLayoutAlgorithm="no-overlap"
        scrollToTime={new Date(0, 0, 0, 8, 0, 0)}
        longPressThreshold={10}
        formats={{
          agendaDateFormat: "MMM d, yyyy",
          agendaTimeFormat: "h:mm a",
          agendaTimeRangeFormat: ({ start, end }) => {
            if (start.getDate() === end.getDate()) {
              return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
            }
            return `${format(start, "MMM d, h:mm a")} - ${format(
              end,
              "MMM d, h:mm a"
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
  );
}
