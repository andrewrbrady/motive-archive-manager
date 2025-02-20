"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  View,
  Views,
  Components,
  EventProps,
  ToolbarProps,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
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
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./calendar.css";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Create DnD Calendar
const DragAndDropCalendar = withDragAndDrop(Calendar);

interface UserCalendarProps {
  userName: string;
}

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

interface EventWithCar extends Event {
  car?: Car;
}

interface DeliverableWithCar extends Deliverable {
  car?: Car;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "event" | "deliverable";
  resource: EventWithCar | DeliverableWithCar;
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

export default function UserCalendar({ userName }: UserCalendarProps) {
  const [events, setEvents] = useState<EventWithCar[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableWithCar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [view, setView] = useState<View>("month" as View);
  const [date, setDate] = useState(new Date());
  const [showEvents, setShowEvents] = useState(true);
  const [showDeliverables, setShowDeliverables] = useState(true);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [filterStatus, setFilterStatus] = useState<Set<string>>(
    new Set(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "DONE"])
  );
  const [filterCarMake, setFilterCarMake] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<Set<string>>(new Set());

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams({
        assignee: userName,
        sortField: "start",
        sortDirection: "asc",
      });
      const response = await fetch(`/api/events?${params}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();

      // Fetch car details for each event
      const eventsWithCars = await Promise.all(
        data.map(async (event: Event) => {
          try {
            const carResponse = await fetch(`/api/cars/${event.car_id}`);
            if (carResponse.ok) {
              const carData = await carResponse.json();
              return { ...event, car: carData };
            }
            return event;
          } catch (error) {
            console.error(`Error fetching car for event ${event.id}:`, error);
            return event;
          }
        })
      );

      setEvents(eventsWithCars);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events");
    }
  };

  const fetchDeliverables = async () => {
    try {
      const params = new URLSearchParams({
        editor: userName,
        sortField: "edit_deadline",
        sortDirection: "asc",
      });
      const response = await fetch(`/api/deliverables?${params}`);
      if (!response.ok) throw new Error("Failed to fetch deliverables");
      const data = await response.json();

      // Fetch car details for each deliverable
      const deliverablesWithCars = await Promise.all(
        data.deliverables.map(async (deliverable: Deliverable) => {
          try {
            const carResponse = await fetch(`/api/cars/${deliverable.car_id}`);
            if (carResponse.ok) {
              const carData = await carResponse.json();
              return { ...deliverable, car: carData };
            }
            return deliverable;
          } catch (error) {
            console.error(
              `Error fetching car for deliverable ${deliverable._id}:`,
              error
            );
            return deliverable;
          }
        })
      );

      setDeliverables(deliverablesWithCars);
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
      setDate(new Date());
    };
    fetchData();
  }, [userName]);

  // Get unique car makes
  const uniqueCarMakes = useMemo(() => {
    const makes = new Set<string>();
    events.forEach((event) => {
      if (event.car?.make) {
        makes.add(event.car.make);
      }
    });
    deliverables.forEach((deliverable) => {
      if (deliverable.car?.make) {
        makes.add(deliverable.car.make);
      }
    });
    return Array.from(makes).sort();
  }, [events, deliverables]);

  // Get unique event types
  const uniqueEventTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach((event) => {
      types.add(event.type);
    });
    return Array.from(types).sort();
  }, [events]);

  // Update useEffect to initialize car makes and event types
  useEffect(() => {
    setFilterCarMake(new Set(uniqueCarMakes));
    setFilterType(new Set(uniqueEventTypes));
  }, [uniqueCarMakes, uniqueEventTypes]);

  const toggleFilter = (
    set: Set<string>,
    setter: (value: Set<string>) => void,
    value: string
  ) => {
    const newSet = new Set(set);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setter(newSet);
  };

  const toggleAllInGroup = (
    set: Set<string>,
    setter: (value: Set<string>) => void,
    values: string[]
  ) => {
    const allIncluded = values.every((v) => set.has(v));
    const newSet = new Set(set);
    if (allIncluded) {
      values.forEach((v) => newSet.delete(v));
    } else {
      values.forEach((v) => newSet.add(v));
    }
    setter(newSet);
  };

  const calendarEvents = useMemo(() => {
    console.log("Events:", events);
    console.log("Show Events:", showEvents);
    console.log("Filter Status:", Array.from(filterStatus));
    console.log("Filter Car Make:", Array.from(filterCarMake));
    console.log("Filter Type:", Array.from(filterType));

    const eventItems: CalendarEvent[] = showEvents
      ? events
          .filter((event) => {
            console.log("Checking event:", event);
            console.log("Event status:", event.status);
            console.log("Event car make:", event.car?.make);
            console.log("Event type:", event.type);

            // Check status
            const statusOk = filterStatus.has(event.status);
            console.log("Status check:", statusOk);

            // Check car make
            const carMakeOk = event.car?.make
              ? filterCarMake.has(event.car.make)
              : true;
            console.log("Car make check:", carMakeOk);

            // Check event type
            const typeOk = filterType.size === 0 || filterType.has(event.type);
            console.log("Type check:", typeOk);

            return statusOk && carMakeOk && typeOk;
          })
          .map((event) => {
            const carInfo = event.car
              ? `${event.car.year} ${event.car.make} ${event.car.model}`
              : "No Vehicle";

            return {
              id: event.id,
              title: `${carInfo} - ${event.type
                .split("_")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")} - ${event.description}`,
              start: new Date(event.start),
              end: event.end ? new Date(event.end) : new Date(event.start),
              type: "event",
              resource: event,
              allDay: event.isAllDay || false,
            };
          })
      : [];

    const deliverableItems: CalendarEvent[] = showDeliverables
      ? deliverables
          .filter((deliverable) => {
            // Map lowercase deliverable status to uppercase for comparison
            const statusMap: { [key: string]: string } = {
              not_started: "NOT_STARTED",
              in_progress: "IN_PROGRESS",
              done: "DONE",
            };
            const mappedStatus =
              statusMap[deliverable.status] || deliverable.status;

            if (!filterStatus.has(mappedStatus)) return false;
            if (!filterCarMake.has(deliverable.car?.make || "")) return false;
            return true;
          })
          .flatMap((deliverable) => {
            const items = [];
            const carInfo = deliverable.car
              ? `${deliverable.car.year} ${deliverable.car.make} ${deliverable.car.model}`
              : "No Vehicle";

            // Add deadline event
            items.push({
              id: `${deliverable._id?.toString()}-deadline`,
              title: `${carInfo} - ${deliverable.title} (Edit Deadline)`,
              start: new Date(deliverable.edit_deadline),
              end: new Date(deliverable.edit_deadline),
              type: "deliverable",
              resource: { ...deliverable, eventType: "deadline" },
              allDay: false,
            });

            // Add release event
            items.push({
              id: `${deliverable._id?.toString()}-release`,
              title: `${carInfo} - ${deliverable.title} (Release)`,
              start: new Date(deliverable.release_date),
              end: new Date(deliverable.release_date),
              type: "deliverable",
              resource: { ...deliverable, eventType: "release" },
              allDay: false,
            });

            return items;
          })
      : [];

    return [...eventItems, ...deliverableItems].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );
  }, [
    events,
    deliverables,
    showEvents,
    showDeliverables,
    filterStatus,
    filterCarMake,
    filterType,
  ]);

  const getEventStyle = (event: CalendarEvent) => {
    if (event.type === "event") {
      const eventResource = event.resource as EventWithCar;
      let backgroundColor = "#6b7280"; // Default gray-500

      switch (eventResource.status) {
        case EventStatus.NOT_STARTED:
          backgroundColor = "#ef4444"; // red-500
          break;
        case EventStatus.IN_PROGRESS:
          backgroundColor = "#f59e0b"; // amber-500
          break;
        case EventStatus.COMPLETED:
          backgroundColor = "#22c55e"; // green-500
          break;
      }

      return {
        style: {
          backgroundColor,
          color: "#ffffff",
          border: "none",
          borderRadius: "4px",
          padding: "2px 4px",
        },
      };
    } else {
      const deliverableResource = event.resource as DeliverableWithCar & {
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
          backgroundColor = backgroundColor + "e6"; // 90% opacity
          break;
        case "in_progress":
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

  const components: Components<CalendarEvent, object> = {
    event: ({ event }: EventProps<CalendarEvent>) => {
      if (event.type === "event") {
        return (
          <EventTooltip event={event.resource as EventWithCar}>
            <div className="h-full w-full">
              <div className="truncate text-xs leading-none">{event.title}</div>
            </div>
          </EventTooltip>
        );
      } else {
        return (
          <DeliverableTooltip
            deliverable={event.resource as DeliverableWithCar}
          >
            <div className="h-full w-full">
              <div className="truncate text-xs leading-none">{event.title}</div>
            </div>
          </DeliverableTooltip>
        );
      }
    },
    toolbar: (props: ToolbarProps<CalendarEvent, object>) => (
      <div className="rbc-toolbar">
        <div className="rbc-btn-group">
          <button
            type="button"
            onClick={() => props.onNavigate("PREV")}
            className="flex items-center justify-center px-3 py-1"
            title="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => props.onNavigate("TODAY")}
            className="flex items-center justify-center px-3 py-1"
            title="Today"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => props.onNavigate("NEXT")}
            className="flex items-center justify-center px-3 py-1"
            title="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="rbc-toolbar-label">{props.label}</div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEvents(!showEvents)}
            >
              {showEvents ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              <span className="ml-2">Events</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeliverables(!showDeliverables)}
            >
              {showDeliverables ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              <span className="ml-2">Deliverables</span>
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-6">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Status</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleAllInGroup(filterStatus, setFilterStatus, [
                            "NOT_STARTED",
                            "IN_PROGRESS",
                            "COMPLETED",
                            "DONE",
                          ])
                        }
                      >
                        {filterStatus.size === 4 ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {[
                        { value: "NOT_STARTED", label: "Not Started" },
                        { value: "IN_PROGRESS", label: "In Progress" },
                        { value: "COMPLETED", label: "Completed" },
                        { value: "DONE", label: "Done" },
                      ].map((status) => (
                        <div
                          key={status.value}
                          className="flex items-center justify-between px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                        >
                          <span className="text-sm">{status.label}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleFilter(
                                filterStatus,
                                setFilterStatus,
                                status.value
                              )
                            }
                          >
                            {filterStatus.has(status.value) ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Car Make Filter */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Car Make</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleAllInGroup(
                            filterCarMake,
                            setFilterCarMake,
                            uniqueCarMakes
                          )
                        }
                      >
                        {filterCarMake.size === uniqueCarMakes.length ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {uniqueCarMakes.map((make) => (
                        <div
                          key={make}
                          className="flex items-center justify-between px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                        >
                          <span className="text-sm">{make}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleFilter(
                                filterCarMake,
                                setFilterCarMake,
                                make
                              )
                            }
                          >
                            {filterCarMake.has(make) ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Event Type Filter */}
                  {showEvents && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Event Type</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleAllInGroup(
                              filterType,
                              setFilterType,
                              uniqueEventTypes
                            )
                          }
                        >
                          {filterType.size === uniqueEventTypes.length ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {uniqueEventTypes.map((type) => (
                          <div
                            key={type}
                            className="flex items-center justify-between px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                          >
                            <span className="text-sm">
                              {type
                                .split("_")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                )
                                .join(" ")}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleFilter(filterType, setFilterType, type)
                              }
                            >
                              {filterType.has(type) ? (
                                <Eye className="h-3.5 w-3.5" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rbc-btn-group">
            {Object.entries(props.views).map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => props.onView(key as View)}
                className={cn(props.view === key && "rbc-active")}
              >
                {key}
              </button>
            ))}
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="flex items-center justify-center px-3 py-1"
          >
            {isFullscreen ? (
              <Minimize2 className="h-[14px] w-[14px]" />
            ) : (
              <Maximize2 className="h-[14px] w-[14px]" />
            )}
          </button>
        </div>
      </div>
    ),
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

  if (isLoading) {
    return <div>Loading calendar...</div>;
  }

  return (
    <div
      ref={calendarRef}
      className={cn(
        "relative calendar-container flex flex-col",
        isFullscreen ? "h-screen" : "h-[calc(100vh-16rem)]",
        "bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800"
      )}
    >
      <DragAndDropCalendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor={(event: CalendarEvent) => event.start}
        endAccessor={(event: CalendarEvent) => event.end}
        eventPropGetter={getEventStyle}
        views={["month", "week", "day"]}
        view={view}
        date={date}
        onView={(newView: View) => setView(newView)}
        onNavigate={(newDate: Date) => setDate(newDate)}
        min={new Date(0, 0, 0, 8, 0, 0)}
        max={new Date(0, 0, 0, 20, 0, 0)}
        components={components}
        className={cn(
          "events-calendar flex-1",
          isFullscreen && "fullscreen-calendar",
          "dark:dark"
        )}
        draggableAccessor={() => false}
        popup={true}
        selectable={true}
      />
    </div>
  );
}
