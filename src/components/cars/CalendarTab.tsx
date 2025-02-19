"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  View,
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
import DeliverableTooltip from "./DeliverableTooltip";
import "./calendar.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
  const [view, setView] = useState<View>("month");
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

  // Update the toolbar component with new eye icons
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
    toolbar: (toolbarProps: any) => (
      <div className="rbc-toolbar mb-4">
        <span className="rbc-btn-group">
          <button
            type="button"
            onClick={() => toolbarProps.onNavigate("PREV")}
            className="flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => toolbarProps.onNavigate("TODAY")}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => toolbarProps.onNavigate("NEXT")}
            className="flex items-center justify-center"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </span>
        <span className="rbc-toolbar-label">{toolbarProps.label}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 inline-flex items-center justify-center"
            onClick={() => setShowEvents(!showEvents)}
            title={showEvents ? "Hide Events" : "Show Events"}
          >
            {showEvents ? (
              <Eye className="h-4 w-4 text-blue-500" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 inline-flex items-center justify-center"
            onClick={() => setShowDeliverables(!showDeliverables)}
            title={showDeliverables ? "Hide Deliverables" : "Show Deliverables"}
          >
            {showDeliverables ? (
              <Eye className="h-4 w-4 text-amber-500" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 inline-flex items-center justify-center relative"
              >
                <Filter className="h-4 w-4" />
                {(eventTypeFilters.length > 0 ||
                  deliverableEventFilters.length > 0 ||
                  deliverablePlatformFilters.length > 0 ||
                  deliverableTypeFilters.length > 0) && (
                  <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-blue-500 text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {eventTypeFilters.length +
                      deliverableEventFilters.length +
                      deliverablePlatformFilters.length +
                      deliverableTypeFilters.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <div className="px-2 py-1.5 text-sm font-semibold flex justify-between items-center">
                Event Types
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allShown =
                      eventTypeFilters.length === uniqueEventTypes.length;
                    setEventTypeFilters(allShown ? [] : [...uniqueEventTypes]);
                  }}
                  className="h-6 w-6 p-0"
                  title={
                    eventTypeFilters.length === uniqueEventTypes.length
                      ? "Hide All"
                      : "Show All"
                  }
                >
                  {eventTypeFilters.length === uniqueEventTypes.length ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {uniqueEventTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="text-sm">
                    {type
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEventTypeFilters((prev) =>
                        prev.includes(type)
                          ? prev.filter((t) => t !== type)
                          : [...prev, type]
                      );
                    }}
                    className="h-6 w-6 p-0"
                    title={eventTypeFilters.includes(type) ? "Hide" : "Show"}
                  >
                    {eventTypeFilters.includes(type) ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}

              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-sm font-semibold flex justify-between items-center">
                Deliverable Types
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allShown =
                      deliverableTypeFilters.length ===
                      uniqueDeliverableTypes.length;
                    if (allShown) {
                      setDeliverableTypeFilters([]);
                      setDeliverablePlatformFilters([]);
                      setDeliverableEventFilters([]);
                    } else {
                      setDeliverableTypeFilters([...uniqueDeliverableTypes]);
                      setDeliverablePlatformFilters([
                        ...uniqueDeliverablePlatforms,
                      ]);
                      setDeliverableEventFilters([
                        ...deliverableEventCategories,
                      ]);
                    }
                  }}
                  className="h-6 w-6 p-0"
                  title={
                    deliverableTypeFilters.length ===
                    uniqueDeliverableTypes.length
                      ? "Hide All"
                      : "Show All"
                  }
                >
                  {deliverableTypeFilters.length ===
                  uniqueDeliverableTypes.length ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {uniqueDeliverableTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="text-sm">{type}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeliverableTypeFilters((prev) => {
                        const newFilters = prev.includes(type)
                          ? prev.filter((t) => t !== type)
                          : [...prev, type];
                        if (newFilters.length === 0) {
                          setDeliverablePlatformFilters([]);
                          setDeliverableEventFilters([]);
                        }
                        return newFilters;
                      });
                    }}
                    className="h-6 w-6 p-0"
                    title={
                      deliverableTypeFilters.includes(type) ? "Hide" : "Show"
                    }
                  >
                    {deliverableTypeFilters.includes(type) ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}

              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-sm font-semibold flex justify-between items-center">
                Deliverable Platforms
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allShown =
                      deliverablePlatformFilters.length ===
                      uniqueDeliverablePlatforms.length;
                    setDeliverablePlatformFilters(
                      allShown ? [] : [...uniqueDeliverablePlatforms]
                    );
                    if (allShown) {
                      setDeliverableTypeFilters([]);
                      setDeliverableEventFilters([]);
                    }
                  }}
                  className="h-6 w-6 p-0"
                  title={
                    deliverablePlatformFilters.length ===
                    uniqueDeliverablePlatforms.length
                      ? "Hide All"
                      : "Show All"
                  }
                >
                  {deliverablePlatformFilters.length ===
                  uniqueDeliverablePlatforms.length ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {uniqueDeliverablePlatforms.map((platform) => (
                <div
                  key={platform}
                  className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="text-sm">{platform}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeliverablePlatformFilters((prev) => {
                        const newFilters = prev.includes(platform)
                          ? prev.filter((p) => p !== platform)
                          : [...prev, platform];
                        if (newFilters.length === 0) {
                          setDeliverableTypeFilters([]);
                          setDeliverableEventFilters([]);
                        }
                        return newFilters;
                      });
                    }}
                    className="h-6 w-6 p-0"
                    title={
                      deliverablePlatformFilters.includes(platform)
                        ? "Hide"
                        : "Show"
                    }
                  >
                    {deliverablePlatformFilters.includes(platform) ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}

              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-sm font-semibold flex justify-between items-center">
                Event Categories
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allShown =
                      deliverableEventFilters.length ===
                      deliverableEventCategories.length;
                    setDeliverableEventFilters(
                      allShown ? [] : [...deliverableEventCategories]
                    );
                    if (allShown && deliverableTypeFilters.length > 0) {
                      setDeliverableTypeFilters([]);
                      setDeliverablePlatformFilters([]);
                    }
                  }}
                  className="h-6 w-6 p-0"
                  title={
                    deliverableEventFilters.length ===
                    deliverableEventCategories.length
                      ? "Hide All"
                      : "Show All"
                  }
                >
                  {deliverableEventFilters.length ===
                  deliverableEventCategories.length ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {deliverableEventCategories.map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="text-sm">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeliverableEventFilters((prev) => {
                        const newFilters = prev.includes(type)
                          ? prev.filter((t) => t !== type)
                          : [...prev, type];
                        if (
                          newFilters.length === 0 &&
                          deliverableTypeFilters.length > 0
                        ) {
                          setDeliverableTypeFilters([]);
                          setDeliverablePlatformFilters([]);
                        }
                        return newFilters;
                      });
                    }}
                    className="h-6 w-6 p-0"
                    title={
                      deliverableEventFilters.includes(type) ? "Hide" : "Show"
                    }
                  >
                    {deliverableEventFilters.includes(type) ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="rbc-btn-group">
            <button
              type="button"
              onClick={() => toolbarProps.onView("month")}
              className={cn(
                "flex items-center justify-center px-3 py-1",
                toolbarProps.view === "month" && "rbc-active"
              )}
              title="Month view"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => toolbarProps.onView("agenda")}
              className={cn(
                "flex items-center justify-center px-3 py-1",
                toolbarProps.view === "agenda" && "rbc-active"
              )}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="flex items-center justify-center px-3 py-1"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </span>
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
          month: true,
          agenda: true,
        }}
        view={view}
        date={date}
        onView={(newView: View) => setView(newView)}
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
        step={60}
        timeslots={1}
        length={30}
        defaultView="month"
        dayLayoutAlgorithm="no-overlap"
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
