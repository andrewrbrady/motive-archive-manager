"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Event } from "@/types/event";
import { Deliverable } from "@/types/deliverable";
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
import { Separator } from "@/components/ui/separator";
import { Filter, CheckSquare, Square, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

// Import styles
import "./fullcalendar.css";

// Dynamic import for the entire Calendar component
import dynamic from "next/dynamic";

// Type for deliverable with event type
type DeliverableWithEventType = Deliverable & {
  eventType: "deadline" | "release";
};

// Calendar event interface
export interface FullCalendarEvent {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  allDay: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  editable: boolean;
  startEditable: boolean;
  durationEditable: boolean;
  extendedProps: {
    type: "event" | "deliverable";
    resource: Event | DeliverableWithEventType;
  };
}

// Props for the FullCalendar component
export interface FullCalendarProps {
  carId: string;
  events: Event[];
  deliverables: Deliverable[];
  onEventDrop?: (info: any) => void;
  onEventResize?: (info: any) => void;
  onSelectEvent?: (info: any) => void;
  className?: string;
  style?: React.CSSProperties;
  showFilterControls?: boolean;
  showVisibilityControls?: boolean;
}

// Dynamic component that will load FullCalendar and plugins
const DynamicFullCalendar = dynamic(
  () => import("./DynamicCalendar").then((mod) => mod.default),
  { ssr: false }
);

export function FullCalendarComponent({
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
}: FullCalendarProps) {
  const [showEvents, setShowEvents] = useState(true);
  const [showDeliverables, setShowDeliverables] = useState(true);
  const [showOnlyScheduled, setShowOnlyScheduled] = useState(false);
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

  // Memoize these values to prevent recalculation on every render
  const uniqueEventTypes = useMemo(
    () => [...new Set(events.map((event) => event.type))],
    [events]
  );

  // Get unique deliverable event categories (deadline and release)
  const deliverableEventCategories = useMemo(() => ["deadline", "release"], []);

  // Get unique deliverable types
  const uniqueDeliverableTypes = useMemo(
    () => [...new Set(deliverables.map((deliverable) => deliverable.type))],
    [deliverables]
  );

  // Get unique deliverable platforms
  const uniqueDeliverablePlatforms = useMemo(
    () => [
      ...new Set(
        deliverables
          .map((deliverable) => {
            // Priority: platform_id > platform (legacy)
            if (deliverable.platform_id) {
              return deliverable.platform_id.toString();
            }
            return deliverable.platform;
          })
          .filter((platform): platform is string => platform !== undefined)
      ),
    ],
    [deliverables]
  );

  // Initialize all filters when component mounts or dependencies change
  useEffect(() => {
    // Only update filters if they haven't been initialized or if the source data has changed
    const hasEventTypeFilters = eventTypeFilters.length > 0;
    const hasDeliverableTypeFilters = deliverableTypeFilters.length > 0;
    const hasPlatformFilters = deliverablePlatformFilters.length > 0;
    const hasEventCategoryFilters = deliverableEventFilters.length > 0;

    if (!hasEventTypeFilters && uniqueEventTypes.length > 0) {
      setEventTypeFilters(uniqueEventTypes);
    }

    if (!hasDeliverableTypeFilters && uniqueDeliverableTypes.length > 0) {
      setDeliverableTypeFilters(uniqueDeliverableTypes);
    }

    if (!hasPlatformFilters && uniqueDeliverablePlatforms.length > 0) {
      setDeliverablePlatformFilters(uniqueDeliverablePlatforms);
    }

    if (!hasEventCategoryFilters && deliverableEventCategories.length > 0) {
      setDeliverableEventFilters(deliverableEventCategories);
    }
  }, [
    uniqueEventTypes,
    uniqueDeliverableTypes,
    uniqueDeliverablePlatforms,
    deliverableEventCategories,
    eventTypeFilters,
    deliverableTypeFilters,
    deliverablePlatformFilters,
    deliverableEventFilters,
  ]);

  // Convert events to FullCalendar format
  const calendarEvents: FullCalendarEvent[] = [
    // Add filtered event items
    ...(showEvents
      ? events
          .filter(
            (event) =>
              eventTypeFilters.length === 0 ||
              eventTypeFilters.includes(event.type)
          )
          .map(
            (event): FullCalendarEvent => ({
              id:
                event.id ||
                `event-fallback-${Math.random().toString(36).substring(2, 9)}`,
              title: event.type
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase()),
              start: new Date(event.start),
              end: event.end ? new Date(event.end) : new Date(event.start),
              allDay: event.isAllDay || !event.end,
              backgroundColor: `hsl(var(--event-${event.type.toLowerCase()}))`,
              borderColor: `hsl(var(--border))`,
              textColor: "white",
              editable: true,
              startEditable: true,
              durationEditable: true,
              extendedProps: {
                type: "event",
                resource: event,
              },
            })
          )
      : []),

    // Add filtered deliverable items
    ...(showDeliverables
      ? deliverables
          .filter((deliverable) => {
            // Platform filter logic - handle new platform_id and legacy platform
            const platformMatch =
              deliverablePlatformFilters.length === 0 ||
              (deliverable.platform_id &&
                deliverablePlatformFilters.includes(
                  deliverable.platform_id.toString()
                )) ||
              (deliverable.platform &&
                deliverablePlatformFilters.includes(deliverable.platform));

            const typeMatch =
              deliverableTypeFilters.length === 0 ||
              deliverableTypeFilters.includes(deliverable.type);

            const scheduledMatch =
              !showOnlyScheduled || deliverable.scheduled === true;

            return platformMatch && typeMatch && scheduledMatch;
          })
          .flatMap((deliverable): FullCalendarEvent[] => {
            const items: FullCalendarEvent[] = [];

            if (
              deliverableEventFilters.length === 0 ||
              deliverableEventFilters.includes("deadline")
            ) {
              const deadlineEvent: FullCalendarEvent = {
                id: `${deliverable._id?.toString()}-deadline`,
                title: `${deliverable.scheduled ? "🗓️ " : ""}${deliverable.title} (Edit Deadline)`,
                start: new Date(deliverable.edit_deadline),
                end: new Date(deliverable.edit_deadline),
                allDay: true,
                backgroundColor: deliverable.scheduled
                  ? `hsl(var(--deliverable-deadline-scheduled))`
                  : `hsl(var(--deliverable-deadline))`,
                borderColor: deliverable.scheduled
                  ? `hsl(var(--deliverable-deadline-scheduled))`
                  : `hsl(var(--deliverable-deadline))`,
                textColor: "white",
                editable: true,
                startEditable: true,
                durationEditable: false,
                extendedProps: {
                  type: "deliverable",
                  resource: {
                    ...deliverable,
                    eventType: "deadline",
                  } as DeliverableWithEventType,
                },
              };
              items.push(deadlineEvent);
            }

            if (
              deliverableEventFilters.length === 0 ||
              deliverableEventFilters.includes("release")
            ) {
              if (deliverable.release_date) {
                const releaseEvent: FullCalendarEvent = {
                  id: `${deliverable._id?.toString()}-release`,
                  title: `${deliverable.scheduled ? "🗓️ " : ""}${deliverable.title} (Release)`,
                  start: new Date(deliverable.release_date),
                  end: new Date(deliverable.release_date),
                  allDay: true,
                  backgroundColor: deliverable.scheduled
                    ? `hsl(var(--deliverable-release-scheduled))`
                    : `hsl(var(--deliverable-release))`,
                  borderColor: deliverable.scheduled
                    ? `hsl(var(--deliverable-release-scheduled))`
                    : `hsl(var(--deliverable-release))`,
                  textColor: "white",
                  editable: true,
                  startEditable: true,
                  durationEditable: false,
                  extendedProps: {
                    type: "deliverable",
                    resource: {
                      ...deliverable,
                      eventType: "release",
                    } as DeliverableWithEventType,
                  },
                };
                items.push(releaseEvent);
              }
            }

            return items;
          })
      : []),
  ];

  // Handle event drop (for drag-and-drop)
  const handleEventDrop = async (info: any) => {
    const { event } = info;
    const eventData = event.extendedProps;

    console.log("Event dropped:", {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      extendedProps: event.extendedProps,
    });

    // Handle the event drop based on the type
    if (eventData.type === "event") {
      try {
        // Format dates properly
        const start = new Date(event.start);
        const end = event.end ? new Date(event.end) : new Date(start);

        const updatedEvent = {
          ...eventData.resource,
          start: start.toISOString(),
          end: end.toISOString(),
          isAllDay: event.allDay,
        };

        // Update to use the correct API path structure with carId
        const apiUrl = `/api/cars/${carId}/events/${eventData.resource.id}`;
        // [REMOVED] // [REMOVED] console.log("Updating event with data:", updatedEvent);
        // [REMOVED] // [REMOVED] console.log("PUT request to:", apiUrl);

        const response = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedEvent),
        });

        // Log the response status
        // [REMOVED] // [REMOVED] console.log("API response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", errorText);
          throw new Error(
            `Failed to update event: ${response.status} ${errorText}`
          );
        }

        const result = await response.json();
        // [REMOVED] // [REMOVED] console.log("Updated event result:", result);

        toast.success("Event updated");

        // Call the onEventDrop callback if provided
        if (onEventDrop) {
          onEventDrop(info);
        }
      } catch (error) {
        console.error("Error updating event:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to update event: ${errorMessage}`);
        // Make sure to revert the change visually
        info.revert();
      }
    } else if (eventData.type === "deliverable") {
      try {
        const deliverable = eventData.resource;
        const field =
          deliverable.eventType === "deadline"
            ? "edit_deadline"
            : "release_date";

        // Format date properly
        const newDate = new Date(event.start).toISOString();

        console.log("Updating deliverable:", {
          id: deliverable._id,
          field: field,
          newDate: newDate,
        });

        const updatedDeliverable = {
          ...deliverable,
          [field]: newDate,
        };

        // Update to use the correct API path structure with carId
        const apiUrl = `/api/deliverables/${deliverable._id}`;
        // [REMOVED] // [REMOVED] console.log("PUT request to:", apiUrl);

        const response = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedDeliverable),
        });

        // Log the response status
        // [REMOVED] // [REMOVED] console.log("API response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", errorText);
          throw new Error(
            `Failed to update deliverable: ${response.status} ${errorText}`
          );
        }

        const result = await response.json();
        // [REMOVED] // [REMOVED] console.log("Updated deliverable result:", result);

        toast.success("Deliverable updated");

        // Call the onEventDrop callback if provided
        if (onEventDrop) {
          onEventDrop(info);
        }
      } catch (error) {
        console.error("Error updating deliverable:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to update deliverable: ${errorMessage}`);
        // Make sure to revert the change visually
        info.revert();
      }
    }
  };

  // Handle event resize
  const handleEventResize = async (info: any) => {
    const { event } = info;
    const eventData = event.extendedProps;

    // Only regular events can be resized (not all-day deliverable deadlines)
    if (eventData.type === "event") {
      try {
        // Format dates properly
        const start = new Date(event.start);
        const end = new Date(event.end);

        const updatedEvent = {
          ...eventData.resource,
          start: start.toISOString(),
          end: end.toISOString(),
          isAllDay: event.allDay,
        };

        // Update to use the correct API path structure with carId
        const apiUrl = `/api/cars/${carId}/events/${eventData.resource.id}`;
        // [REMOVED] // [REMOVED] console.log("Updating event with data:", updatedEvent);
        // [REMOVED] // [REMOVED] console.log("PUT request to:", apiUrl);

        const response = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedEvent),
        });

        // Log the response status
        // [REMOVED] // [REMOVED] console.log("API response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", errorText);
          throw new Error(
            `Failed to update event: ${response.status} ${errorText}`
          );
        }

        const result = await response.json();
        // [REMOVED] // [REMOVED] console.log("Updated event result:", result);

        toast.success("Event updated");

        // Call the onEventResize callback if provided
        if (onEventResize) {
          onEventResize(info);
        }
      } catch (error) {
        console.error("Error updating event:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to update event: ${errorMessage}`);
        // Make sure to revert the change visually
        info.revert();
      }
    }
  };

  // Handle event click
  const handleEventClick = (info: any) => {
    const eventData = info.event.extendedProps;

    // Call the onSelectEvent callback if provided
    if (onSelectEvent) {
      onSelectEvent({
        event: eventData.resource,
        type: eventData.type,
      });
    }
  };

  // Create filter controls as a separate component
  const filterControls =
    showFilterControls || showVisibilityControls ? (
      <>
        {showVisibilityControls && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Visibility
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Show/Hide</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuCheckboxItem
                    checked={showEvents}
                    onCheckedChange={setShowEvents}
                  >
                    {showEvents ? (
                      <CheckSquare className="mr-2 h-4 w-4" />
                    ) : (
                      <Square className="mr-2 h-4 w-4" />
                    )}
                    <span>Events</span>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={showDeliverables}
                    onCheckedChange={setShowDeliverables}
                  >
                    {showDeliverables ? (
                      <CheckSquare className="mr-2 h-4 w-4" />
                    ) : (
                      <Square className="mr-2 h-4 w-4" />
                    )}
                    <span>Deliverables</span>
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuCheckboxItem
                    checked={showOnlyScheduled}
                    onCheckedChange={setShowOnlyScheduled}
                    disabled={!showDeliverables}
                  >
                    {showOnlyScheduled ? (
                      <CheckSquare className="mr-2 h-4 w-4" />
                    ) : (
                      <Square className="mr-2 h-4 w-4" />
                    )}
                    <span>Show Only Scheduled</span>
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-8" />
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {uniqueEventTypes.length > 0 && (
              <>
                <DropdownMenuLabel>Event Types</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {uniqueEventTypes.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={eventTypeFilters.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEventTypeFilters([...eventTypeFilters, type]);
                        } else {
                          setEventTypeFilters(
                            eventTypeFilters.filter((t) => t !== type)
                          );
                        }
                      }}
                    >
                      {eventTypeFilters.includes(type) ? (
                        <CheckSquare className="mr-2 h-4 w-4" />
                      ) : (
                        <Square className="mr-2 h-4 w-4" />
                      )}
                      <span>
                        {type
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}

            {uniqueDeliverableTypes.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Deliverable Types</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {uniqueDeliverableTypes.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={deliverableTypeFilters.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setDeliverableTypeFilters([
                            ...deliverableTypeFilters,
                            type,
                          ]);
                        } else {
                          setDeliverableTypeFilters(
                            deliverableTypeFilters.filter((t) => t !== type)
                          );
                        }
                      }}
                    >
                      {deliverableTypeFilters.includes(type) ? (
                        <CheckSquare className="mr-2 h-4 w-4" />
                      ) : (
                        <Square className="mr-2 h-4 w-4" />
                      )}
                      <span>
                        {type
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}

            {deliverableEventCategories.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Deliverable Events</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {deliverableEventCategories.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={deliverableEventFilters.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setDeliverableEventFilters([
                            ...deliverableEventFilters,
                            type,
                          ]);
                        } else {
                          setDeliverableEventFilters(
                            deliverableEventFilters.filter((t) => t !== type)
                          );
                        }
                      }}
                    >
                      {deliverableEventFilters.includes(type) ? (
                        <CheckSquare className="mr-2 h-4 w-4" />
                      ) : (
                        <Square className="mr-2 h-4 w-4" />
                      )}
                      <span>
                        {type
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}

            {uniqueDeliverablePlatforms.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Deliverable Platforms</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {uniqueDeliverablePlatforms.map((platform) => (
                    <DropdownMenuCheckboxItem
                      key={platform}
                      checked={deliverablePlatformFilters.includes(platform)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setDeliverablePlatformFilters([
                            ...deliverablePlatformFilters,
                            platform,
                          ]);
                        } else {
                          setDeliverablePlatformFilters(
                            deliverablePlatformFilters.filter(
                              (p) => p !== platform
                            )
                          );
                        }
                      }}
                    >
                      {deliverablePlatformFilters.includes(platform) ? (
                        <CheckSquare className="mr-2 h-4 w-4" />
                      ) : (
                        <Square className="mr-2 h-4 w-4" />
                      )}
                      <span>
                        {platform
                          .replace(/_/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    ) : null;

  // Create filter options for the custom dropdowns
  const filterOptions = (
    <div className="space-y-4">
      {uniqueEventTypes.length > 0 && (
        <div>
          <div className="font-medium mb-2">Event Types</div>
          <div className="space-y-1">
            {uniqueEventTypes.map((type) => (
              <label
                key={type}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={eventTypeFilters.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEventTypeFilters([...eventTypeFilters, type]);
                    } else {
                      setEventTypeFilters(
                        eventTypeFilters.filter((t) => t !== type)
                      );
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">
                  {type
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {uniqueDeliverableTypes.length > 0 && (
        <div>
          <div className="font-medium mb-2">Deliverable Types</div>
          <div className="space-y-1">
            {uniqueDeliverableTypes.map((type) => (
              <label
                key={type}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={deliverableTypeFilters.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setDeliverableTypeFilters([
                        ...deliverableTypeFilters,
                        type,
                      ]);
                    } else {
                      setDeliverableTypeFilters(
                        deliverableTypeFilters.filter((t) => t !== type)
                      );
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">
                  {type
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {deliverableEventCategories.length > 0 && (
        <div>
          <div className="font-medium mb-2">Deliverable Events</div>
          <div className="space-y-1">
            {deliverableEventCategories.map((type) => (
              <label
                key={type}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={deliverableEventFilters.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setDeliverableEventFilters([
                        ...deliverableEventFilters,
                        type,
                      ]);
                    } else {
                      setDeliverableEventFilters(
                        deliverableEventFilters.filter((t) => t !== type)
                      );
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">
                  {type
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {uniqueDeliverablePlatforms.length > 0 && (
        <div>
          <div className="font-medium mb-2">Deliverable Platforms</div>
          <div className="space-y-1">
            {uniqueDeliverablePlatforms.map((platform) => (
              <label
                key={platform}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={deliverablePlatformFilters.includes(platform)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setDeliverablePlatformFilters([
                        ...deliverablePlatformFilters,
                        platform,
                      ]);
                    } else {
                      setDeliverablePlatformFilters(
                        deliverablePlatformFilters.filter((p) => p !== platform)
                      );
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">
                  {platform
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("motive-calendar", className)} style={style}>
      <div
        className="calendar-container"
        style={{ height: "calc(100vh - 220px)" }}
      >
        <DynamicFullCalendar
          events={calendarEvents}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          onEventClick={handleEventClick}
          filterControls={filterControls}
          onFiltersClick={() => {
            // Handle filters button click
            console.log("Filters button clicked");
          }}
          showEvents={showEvents}
          showDeliverables={showDeliverables}
          onToggleEvents={setShowEvents}
          onToggleDeliverables={setShowDeliverables}
          filterOptions={filterOptions}
        />
      </div>
    </div>
  );
}
