"use client";

import { useState, useEffect, useMemo } from "react";
import { Components, EventProps } from "react-big-calendar";
import BaseCalendar, { BaseCalendarEvent } from "./BaseCalendar";
import { Event } from "@/types/event";
import { Deliverable } from "@/types/deliverable";
import { ProjectMilestone } from "@/types/project";
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
  type: "event" | "deliverable" | "milestone";
  resource: Event | DeliverableWithEventType | ProjectMilestone;
}

// Props for the MotiveCalendar component
export interface MotiveCalendarProps {
  carId?: string;
  projectId?: string;
  events: Event[];
  deliverables: Deliverable[];
  milestones?: ProjectMilestone[];
  onEventDrop?: (args: any) => void;
  onEventResize?: (args: any) => void;
  onSelectEvent?: (event: any) => void;
  className?: string;
  style?: React.CSSProperties;
  showFilterControls?: boolean;
  showVisibilityControls?: boolean;
  isFullscreen?: boolean;
  calendarRef?: React.RefObject<HTMLDivElement>;
}

export function MotiveCalendar({
  carId,
  projectId,
  events,
  deliverables,
  milestones = [],
  onEventDrop,
  onEventResize,
  onSelectEvent,
  className,
  style,
  showFilterControls = true,
  showVisibilityControls = true,
  isFullscreen = false,
  calendarRef,
}: MotiveCalendarProps) {
  const [showEvents, setShowEvents] = useState(true);
  const [showDeliverables, setShowDeliverables] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);
  const [eventTypeFilters, setEventTypeFilters] = useState<string[]>([]);
  const [deliverableEventFilters, setDeliverableEventFilters] = useState<
    string[]
  >([]);
  const [deliverablePlatformFilters, setDeliverablePlatformFilters] = useState<
    string[]
  >([]);
  const [deliverableTypeFilters, setDeliverableTypeFilters] = useState<
    string[]
  >([]);
  const [milestoneStatusFilters, setMilestoneStatusFilters] = useState<
    string[]
  >([]);
  const [eventsWithCars, setEventsWithCars] = useState<
    (Event & { car?: { make: string; model: string; year: number } })[]
  >([]);

  // Fetch car information for events when in project context
  useEffect(() => {
    if (projectId && events.length > 0) {
      const fetchCarsForEvents = async () => {
        const eventsWithCarData = await Promise.all(
          events.map(async (event) => {
            if (event.car_id) {
              try {
                const carResponse = await fetch(`/api/cars/${event.car_id}`);
                if (carResponse.ok) {
                  const car = await carResponse.json();
                  return {
                    ...event,
                    car: { make: car.make, model: car.model, year: car.year },
                  };
                }
              } catch (error) {
                console.error("Error fetching car:", error);
              }
            }
            return event;
          })
        );
        setEventsWithCars(eventsWithCarData);
      };
      fetchCarsForEvents();
    } else {
      setEventsWithCars(events);
    }
  }, [events, projectId]);

  // Helper function to format event title for project calendar
  const formatEventTitle = (
    event: Event & { car?: { make: string; model: string; year: number } }
  ) => {
    const eventType = event.type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());

    // Check if title is just a formatted version of the event type
    const normalizedTitle = event.title
      ?.trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    const normalizedEventType = eventType.toLowerCase().replace(/\s+/g, " ");
    const titleMatchesEventType = normalizedTitle === normalizedEventType;

    if (projectId && event.car) {
      const carInfo = `${event.car.year} ${event.car.make} ${event.car.model}`;

      if (titleMatchesEventType || !event.title?.trim()) {
        // If title matches event type or is empty, show: "SOLD | CAR"
        return `${eventType} | ${carInfo}`;
      } else {
        // If title is different from event type, show: "SOLD | TITLE | CAR"
        return `${eventType} | ${event.title.trim()} | ${carInfo}`;
      }
    }

    // For non-project calendars, return title if it's different from event type, otherwise just event type
    if (titleMatchesEventType || !event.title?.trim()) {
      return eventType;
    }

    return event.title.trim();
  };

  // Get unique event types
  const uniqueEventTypes = useMemo(() => {
    return [...new Set(events.map((event) => event.type))];
  }, [events]);

  // Get unique deliverable event categories (deadline and release)
  const deliverableEventCategories = ["deadline", "release"];

  // Get unique milestone status categories
  const milestoneStatusCategories = ["completed", "pending"];

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
    setMilestoneStatusFilters([...milestoneStatusCategories]);
  }, [uniqueEventTypes, uniqueDeliverableTypes, uniqueDeliverablePlatforms]);

  const calendarEvents = useMemo(() => {
    const eventItems: MotiveCalendarEvent[] = showEvents
      ? eventsWithCars
          .filter(
            (event) =>
              eventTypeFilters.length === 0 ||
              eventTypeFilters.includes(event.type)
          )
          .map((event): MotiveCalendarEvent => {
            return {
              id: event.id,
              title: formatEventTitle(event),
              start: new Date(event.start),
              end: event.end ? new Date(event.end) : new Date(event.start),
              type: "event",
              resource: event,
              allDay: event.isAllDay || false,
            };
          })
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

    const milestoneItems: MotiveCalendarEvent[] = showMilestones
      ? milestones
          .filter((milestone) => {
            const status = milestone.completed ? "completed" : "pending";
            return (
              milestoneStatusFilters.length === 0 ||
              milestoneStatusFilters.includes(status)
            );
          })
          .map((milestone): MotiveCalendarEvent => {
            const statusText = milestone.completed ? "✓" : "○";
            const title = `${statusText} ${milestone.title} (Milestone)`;

            return {
              id: milestone.id,
              title,
              start: new Date(milestone.dueDate),
              end: new Date(milestone.dueDate),
              type: "milestone",
              resource: milestone,
              allDay: true,
            };
          })
      : [];

    return [...eventItems, ...deliverableItems, ...milestoneItems].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );
  }, [
    eventsWithCars,
    deliverables,
    milestones,
    eventTypeFilters,
    deliverableEventFilters,
    deliverablePlatformFilters,
    deliverableTypeFilters,
    milestoneStatusFilters,
    showEvents,
    showDeliverables,
    showMilestones,
  ]);

  // Event style getter
  const eventPropGetter = (event: MotiveCalendarEvent) => {
    if (event.type === "event") {
      const eventResource = event.resource as Event;
      // Use event type for primary color grouping
      const backgroundColor = `hsl(var(--event-${eventResource.type.toLowerCase()}))`;

      return {
        style: {
          backgroundColor,
          color: "white",
          border: `2px solid hsl(var(--border))`,
          borderRadius: "4px",
          padding: "2px 4px",
          opacity: 0.9,
          minHeight: "22px",
          fontSize: "0.8125rem",
          lineHeight: "1.2",
          fontWeight: 500,
        },
      };
    } else if (event.type === "deliverable") {
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
    } else if (event.type === "milestone") {
      // Milestone styling
      const milestoneResource = event.resource as ProjectMilestone;
      const backgroundColor = milestoneResource.completed
        ? "#10b981" // green-500
        : "#f59e0b"; // amber-500

      return {
        style: {
          backgroundColor,
          color: "white",
          border: "2px solid #374151", // gray-700
          borderRadius: "6px",
          padding: "2px 4px",
          opacity: 0.95,
          minHeight: "22px",
          fontSize: "0.8125rem",
          lineHeight: "1.2",
          fontWeight: 600,
          borderStyle: "dashed",
        },
      };
    }

    // Fallback styling
    return {
      style: {
        backgroundColor: "hsl(var(--muted))",
        color: "hsl(var(--muted-foreground))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "4px",
        padding: "2px 4px",
        opacity: 0.9,
        minHeight: "22px",
        fontSize: "0.8125rem",
        lineHeight: "1.2",
        fontWeight: 500,
      },
    };
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
      } else if (event.type === "deliverable") {
        return (
          <DeliverableTooltip deliverable={event.resource as Deliverable}>
            <div className="h-full w-full">
              <div className="truncate text-xs leading-none">{event.title}</div>
            </div>
          </DeliverableTooltip>
        );
      } else if (event.type === "milestone") {
        const milestone = event.resource as ProjectMilestone;
        return (
          <div
            className="h-full w-full"
            title={`Milestone: ${milestone.title}${milestone.description ? `\n${milestone.description}` : ""}\nDue: ${new Date(milestone.dueDate).toLocaleDateString()}\nStatus: ${milestone.completed ? "Completed" : "Pending"}`}
          >
            <div className="truncate text-xs leading-none">{event.title}</div>
          </div>
        );
      }

      return (
        <div className="h-full w-full">
          <div className="truncate text-xs leading-none">{event.title}</div>
        </div>
      );
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
              {milestones.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMilestones(!showMilestones)}
                  className={cn(
                    "flex items-center gap-2",
                    showMilestones &&
                      "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))]"
                  )}
                >
                  {showMilestones ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  Milestones
                </Button>
              )}
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

                {showMilestones && milestones.length > 0 && (
                  <>
                    {(showEvents && uniqueEventTypes.length > 0) ||
                    showDeliverables ? (
                      <DropdownMenuSeparator />
                    ) : null}
                    <DropdownMenuLabel>Milestone Status</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      {milestoneStatusCategories.map((status) => (
                        <DropdownMenuCheckboxItem
                          key={status}
                          checked={milestoneStatusFilters.includes(status)}
                          onCheckedChange={(checked) => {
                            setMilestoneStatusFilters(
                              checked
                                ? [...milestoneStatusFilters, status]
                                : milestoneStatusFilters.filter(
                                    (s) => s !== status
                                  )
                            );
                          }}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
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

        // Determine the correct API endpoint based on context
        const apiEndpoint = carId
          ? `/api/cars/${carId}/events/${event.id}`
          : `/api/projects/${projectId}/events/${event.id}`;

        const response = await fetch(apiEndpoint, {
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

        // Determine the correct API endpoint based on context
        const apiEndpoint = carId
          ? `/api/cars/${carId}/deliverables/${deliverableId}`
          : `/api/projects/${projectId}/deliverables/${deliverableId}`;

        const response = await fetch(apiEndpoint, {
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
        });

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
      } else if (event.type === "milestone") {
        // For now, milestones are read-only - we could add API support later
        toast.error("Milestone dates cannot be changed from the calendar");
        return;
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
        // Determine the correct API endpoint based on context
        const apiEndpoint = carId
          ? `/api/cars/${carId}/events/${event.id}`
          : `/api/projects/${projectId}/events/${event.id}`;

        const response = await fetch(apiEndpoint, {
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
      } else if (event.type === "milestone") {
        toast.error("Milestone dates cannot be resized");
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
        height: style?.height || "calc(100vh - 220px)",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
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
