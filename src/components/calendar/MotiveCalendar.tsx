"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Components, EventProps, View, NavigateAction } from "react-big-calendar";
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
import { useAPI } from "@/hooks/useAPI";
import { LoadingSpinner } from "@/components/ui/loading";
import { usePlatforms } from "@/contexts/PlatformContext";

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
  onDeliverableUpdate?: () => void; // New callback for deliverable updates
  className?: string;
  style?: React.CSSProperties;
  showFilterControls?: boolean;
  showVisibilityControls?: boolean;
  isFullscreen?: boolean;
  calendarRef?: React.RefObject<HTMLDivElement>;
  allowEventEditing?: boolean;
  eventsApiBasePath?: string;
  currentDate?: Date;
  currentView?: View;
  onNavigate?: (date: Date, view: View, action: NavigateAction) => void;
  onViewChange?: (view: View) => void;
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
  onDeliverableUpdate,
  className,
  style,
  showFilterControls = true,
  showVisibilityControls = true,
  isFullscreen = false,
  calendarRef,
  allowEventEditing = true,
  eventsApiBasePath,
  currentDate,
  currentView,
  onNavigate,
  onViewChange,
}: MotiveCalendarProps) {
  const api = useAPI();
  const { platforms: availablePlatforms } = usePlatforms();
  const isEventEditingEnabled = allowEventEditing ?? true;

  const getEventsApiBasePath = useCallback(
    (eventResource?: Event) => {
      if (eventsApiBasePath && eventsApiBasePath.trim().length > 0) {
        return eventsApiBasePath;
      }

      if (carId) {
        return `/api/cars/${carId}/events`;
      }

      if (projectId) {
        return `/api/projects/${projectId}/events`;
      }

      const resource = eventResource;
      if (resource?.car_id) {
        return `/api/cars/${resource.car_id}/events`;
      }

      if (resource?.project_id) {
        return `/api/projects/${resource.project_id}/events`;
      }

      return null;
    },
    [carId, eventsApiBasePath, projectId]
  );

  // Create a unique storage key for this calendar context
  const storageKey = `motive-calendar-filters-${projectId || carId || "default"}`;

  // Load filter states from localStorage with fallback defaults
  const loadFiltersFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // For backward compatibility, ensure we have the new structure
        return {
          showEvents: data.showEvents !== undefined ? data.showEvents : true,
          showDeliverables:
            data.showDeliverables !== undefined ? data.showDeliverables : true,
          showMilestones:
            data.showMilestones !== undefined ? data.showMilestones : true,
          showOnlyScheduled:
            data.showOnlyScheduled !== undefined
              ? data.showOnlyScheduled
              : false,
          // For filters, use empty arrays as default - we'll populate with all available options
          eventTypeFilters: data.eventTypeFilters || [],
          deliverableEventFilters: data.deliverableEventFilters || [],
          deliverablePlatformFilters: data.deliverablePlatformFilters || [],
          deliverableTypeFilters: data.deliverableTypeFilters || [],
          milestoneStatusFilters: data.milestoneStatusFilters || [],
        };
      }
    } catch (error) {
      console.warn("Failed to load calendar filters from localStorage:", error);
    }
    return {
      showEvents: true,
      showDeliverables: true,
      showMilestones: true,
      showOnlyScheduled: false,
      eventTypeFilters: [],
      deliverableEventFilters: [],
      deliverablePlatformFilters: [],
      deliverableTypeFilters: [],
      milestoneStatusFilters: [],
    };
  }, [storageKey]);

  // Save filter states to localStorage
  const saveFiltersToStorage = useCallback(
    (filters: any) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(filters));
      } catch (error) {
        console.warn("Failed to save calendar filters to localStorage:", error);
      }
    },
    [storageKey]
  );

  // Initialize filter states from localStorage
  const initialFilters = loadFiltersFromStorage();
  const [showEvents, setShowEventsState] = useState(initialFilters.showEvents);
  const [showDeliverables, setShowDeliverablesState] = useState(
    initialFilters.showDeliverables
  );
  const [showMilestones, setShowMilestonesState] = useState(
    initialFilters.showMilestones
  );
  const [showOnlyScheduled, setShowOnlyScheduledState] = useState(
    initialFilters.showOnlyScheduled
  );
  const [eventTypeFilters, setEventTypeFiltersState] = useState<string[]>(
    initialFilters.eventTypeFilters
  );
  const [deliverableEventFilters, setDeliverableEventFiltersState] = useState<
    string[]
  >(initialFilters.deliverableEventFilters);
  const [deliverablePlatformFilters, setDeliverablePlatformFiltersState] =
    useState<string[]>(initialFilters.deliverablePlatformFilters);
  const [deliverableTypeFilters, setDeliverableTypeFiltersState] = useState<
    string[]
  >(initialFilters.deliverableTypeFilters);
  const [milestoneStatusFilters, setMilestoneStatusFiltersState] = useState<
    string[]
  >(initialFilters.milestoneStatusFilters);

  // Enhanced setters that automatically save to localStorage
  const setShowEvents = useCallback((value: boolean) => {
    setShowEventsState(value);
  }, []);

  const setShowDeliverables = useCallback((value: boolean) => {
    setShowDeliverablesState(value);
  }, []);

  const setShowMilestones = useCallback((value: boolean) => {
    setShowMilestonesState(value);
  }, []);

  const setEventTypeFilters = useCallback((value: string[]) => {
    setEventTypeFiltersState(value);
  }, []);

  const setDeliverableEventFilters = useCallback((value: string[]) => {
    setDeliverableEventFiltersState(value);
  }, []);

  const setDeliverablePlatformFilters = useCallback((value: string[]) => {
    setDeliverablePlatformFiltersState(value);
  }, []);

  const setDeliverableTypeFilters = useCallback((value: string[]) => {
    setDeliverableTypeFiltersState(value);
  }, []);

  const setMilestoneStatusFilters = useCallback((value: string[]) => {
    setMilestoneStatusFiltersState(value);
  }, []);

  const setShowOnlyScheduled = useCallback((value: boolean) => {
    setShowOnlyScheduledState(value);
  }, []);
  const [eventsWithCars, setEventsWithCars] = useState<
    (Event & { car?: { make: string; model: string; year: number } })[]
  >([]);

  // Use caching strategy for car data to reduce blocking fetches
  const [carCache, setCarCache] = useState<
    Map<string, { make: string; model: string; year: number }>
  >(new Map());

  // Create a map to store deliverable car data
  const [deliverableCarCache, setDeliverableCarCache] = useState<
    Map<string, { make: string; model: string; year: number }>
  >(new Map());

  // Non-blocking car data fetching
  const fetchCarData = useCallback(
    async (carId: string) => {
      if (!api || !carId) return undefined;

      // Check cache first
      if (carCache.has(carId)) {
        return carCache.get(carId);
      }

      try {
        const car = (await api.get(`cars/${carId}`)) as {
          make: string;
          model: string;
          year: number;
        };

        // Cache the result
        setCarCache((prev) => new Map(prev).set(carId, car));
        return { make: car.make, model: car.model, year: car.year };
      } catch (error) {
        console.error("Error fetching car:", error);
        return undefined;
      }
    },
    [api, carCache]
  );

  // Fetch car data for deliverables
  const fetchDeliverableCarData = useCallback(
    async (carId: string) => {
      if (!api || !carId) return undefined;

      // Check cache first
      if (deliverableCarCache.has(carId)) {
        return deliverableCarCache.get(carId);
      }

      try {
        const car = (await api.get(`cars/${carId}`)) as {
          make: string;
          model: string;
          year: number;
        };

        // Cache the result
        setDeliverableCarCache((prev) => new Map(prev).set(carId, car));
        return { make: car.make, model: car.model, year: car.year };
      } catch (error) {
        console.error("Error fetching deliverable car:", error);
        return undefined;
      }
    },
    [api, deliverableCarCache]
  );

  // Update eventsWithCars when events change, with optimized car fetching
  useEffect(() => {
    // Ensure events is an array to prevent map errors
    const eventsArray = Array.isArray(events) ? events : [];

    if (!api) {
      setEventsWithCars(eventsArray);
      return;
    }

    if (projectId && eventsArray.length > 0) {
      // Phase 3A: Optimized non-blocking car data fetching
      const updateEventsWithCarData = async () => {
        const eventsWithCarData = await Promise.all(
          eventsArray.map(async (event) => {
            if (event.car_id) {
              const car = await fetchCarData(event.car_id);
              return car ? { ...event, car } : event;
            }
            return event;
          })
        );
        setEventsWithCars(eventsWithCarData);
      };

      // Run asynchronously to avoid blocking the UI
      updateEventsWithCarData();
    } else {
      setEventsWithCars(eventsArray);
    }
  }, [events, projectId, api, fetchCarData]); // Include fetchCarData in dependencies

  // Fetch car data for deliverables when deliverables change (non-blocking)
  useEffect(() => {
    if (!api || !projectId || !deliverables.length) return;

    const fetchDeliverableCars = async () => {
      const uniqueCarIds = [
        ...new Set(
          deliverables.filter((d) => d.car_id).map((d) => d.car_id!.toString())
        ),
      ];

      // Fetch car data in background without blocking render
      uniqueCarIds.forEach((carId) => {
        if (!deliverableCarCache.has(carId)) {
          fetchDeliverableCarData(carId).catch(console.error);
        }
      });
    };

    // Defer car data fetching to not block initial render
    const timeoutId = setTimeout(fetchDeliverableCars, 500);
    return () => clearTimeout(timeoutId);
  }, [
    deliverables,
    projectId,
    api,
    fetchDeliverableCarData,
    deliverableCarCache,
  ]);

  // Get unique event types
  const uniqueEventTypes = useMemo(() => {
    // Ensure events is an array to prevent map errors
    const eventsArray = Array.isArray(events) ? events : [];
    return [...new Set(eventsArray.map((event) => event.type))];
  }, [events]);

  // Get unique deliverable event categories (deadline and release)
  const deliverableEventCategories = ["deadline", "release"];

  // Get unique milestone status categories
  const milestoneStatusCategories = ["completed", "pending"];

  // Get unique deliverable types
  const uniqueDeliverableTypes = useMemo(() => {
    return [...new Set(deliverables.map((deliverable) => deliverable.type))];
  }, [deliverables]);

  // Get unique deliverable platforms (handle both legacy platform field and new platforms array)
  const uniqueDeliverablePlatforms = useMemo(() => {
    const platformSet = new Set<string>();

    deliverables.forEach((deliverable) => {
      // Handle legacy platform field
      if (deliverable.platform) {
        platformSet.add(deliverable.platform);
      }

      // Handle new platforms array field
      if (deliverable.platforms && deliverable.platforms.length > 0) {
        deliverable.platforms.forEach((platformId) => {
          // Look up platform name from available platforms
          const platform = availablePlatforms.find((p) => p._id === platformId);
          if (platform) {
            platformSet.add(platform.name);
          } else {
            // If we don't have the platform name, use the ID for now
            platformSet.add(platformId);
          }
        });
      }
    });

    return Array.from(platformSet).filter(Boolean);
  }, [deliverables, availablePlatforms]);

  // Function to reset all filters to defaults
  const resetFilters = useCallback(() => {
    setShowEvents(true);
    setShowDeliverables(true);
    setShowMilestones(true);
    setEventTypeFilters([...uniqueEventTypes]);
    setDeliverableTypeFilters([...uniqueDeliverableTypes]);
    setDeliverablePlatformFilters([...uniqueDeliverablePlatforms]);
    setDeliverableEventFilters([...deliverableEventCategories]);
    setMilestoneStatusFilters([...milestoneStatusCategories]);
  }, [
    uniqueEventTypes,
    uniqueDeliverableTypes,
    uniqueDeliverablePlatforms,
    setShowEvents,
    setShowDeliverables,
    setShowMilestones,
    setEventTypeFilters,
    setDeliverableTypeFilters,
    setDeliverablePlatformFilters,
    setDeliverableEventFilters,
    setMilestoneStatusFilters,
  ]);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    const currentFilters = {
      showEvents,
      showDeliverables,
      showMilestones,
      showOnlyScheduled,
      eventTypeFilters,
      deliverableEventFilters,
      deliverablePlatformFilters,
      deliverableTypeFilters,
      milestoneStatusFilters,
    };
    saveFiltersToStorage(currentFilters);
  }, [
    showEvents,
    showDeliverables,
    showMilestones,
    showOnlyScheduled,
    eventTypeFilters,
    deliverableEventFilters,
    deliverablePlatformFilters,
    deliverableTypeFilters,
    milestoneStatusFilters,
    saveFiltersToStorage,
  ]);

  // Initialize all filters when data is loaded (simple approach)
  useEffect(() => {
    // Only set filters if they're empty (first time or no saved data)
    if (eventTypeFilters.length === 0 && uniqueEventTypes.length > 0) {
      setEventTypeFilters([...uniqueEventTypes]);
    }
    if (
      deliverableTypeFilters.length === 0 &&
      uniqueDeliverableTypes.length > 0
    ) {
      setDeliverableTypeFilters([...uniqueDeliverableTypes]);
    }
    if (
      deliverablePlatformFilters.length === 0 &&
      uniqueDeliverablePlatforms.length > 0
    ) {
      setDeliverablePlatformFilters([...uniqueDeliverablePlatforms]);
    }
    if (
      deliverableEventFilters.length === 0 &&
      deliverableEventCategories.length > 0
    ) {
      setDeliverableEventFilters([...deliverableEventCategories]);
    }
    if (
      milestoneStatusFilters.length === 0 &&
      milestoneStatusCategories.length > 0
    ) {
      setMilestoneStatusFilters([...milestoneStatusCategories]);
    }
  }, [
    uniqueEventTypes,
    uniqueDeliverableTypes,
    uniqueDeliverablePlatforms,
    eventTypeFilters.length,
    deliverableTypeFilters.length,
    deliverablePlatformFilters.length,
    deliverableEventFilters.length,
    milestoneStatusFilters.length,
  ]);

  // Automatically include newly discovered filter options
  useEffect(() => {
    if (uniqueEventTypes.length > 0) {
      setEventTypeFiltersState((prev) => {
        const missing = uniqueEventTypes.filter((type) => !prev.includes(type));
        return missing.length > 0 ? [...prev, ...missing] : prev;
      });
    }
  }, [uniqueEventTypes]);

  // Clean up invalid filter values (simplified approach)
  useEffect(() => {
    // Remove any filter values that no longer exist in the current data
    if (eventTypeFilters.length > 0 && uniqueEventTypes.length > 0) {
      const validEventTypes = eventTypeFilters.filter((type) =>
        uniqueEventTypes.includes(type as any)
      );
      if (validEventTypes.length !== eventTypeFilters.length) {
        setEventTypeFilters(validEventTypes);
      }
    }

    if (
      deliverableTypeFilters.length > 0 &&
      uniqueDeliverableTypes.length > 0
    ) {
      const validDeliverableTypes = deliverableTypeFilters.filter((type) =>
        uniqueDeliverableTypes.includes(type as any)
      );
      if (validDeliverableTypes.length !== deliverableTypeFilters.length) {
        setDeliverableTypeFilters(validDeliverableTypes);
      }
    }

    if (
      deliverablePlatformFilters.length > 0 &&
      uniqueDeliverablePlatforms.length > 0
    ) {
      const validPlatforms = deliverablePlatformFilters.filter((platform) =>
        uniqueDeliverablePlatforms.includes(platform as any)
      );
      if (validPlatforms.length !== deliverablePlatformFilters.length) {
        setDeliverablePlatformFilters(validPlatforms);
      }
    }
  }, [
    uniqueEventTypes,
    uniqueDeliverableTypes,
    uniqueDeliverablePlatforms,
    eventTypeFilters,
    deliverableTypeFilters,
    deliverablePlatformFilters,
    setEventTypeFilters,
    setDeliverableTypeFilters,
    setDeliverablePlatformFilters,
  ]);

  // Helper function to format event title for project calendar

  const formatEventTitle = useCallback(
    (
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
        const carInfo = `${event.car.year ? `${event.car.year} ` : ""}${event.car.make} ${event.car.model}`;

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
    },
    [projectId]
  );

  // FIXED: Move useMemo hooks BEFORE early return to fix hooks ordering issue
  const calendarEvents = useMemo(() => {
    // Return empty array if API is not ready yet
    if (!api) return [];

    const eventItems: MotiveCalendarEvent[] = showEvents
      ? eventsWithCars
          .filter(
            (event) =>
              // Only filter if we explicitly have filters set, otherwise show everything
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
          .filter((deliverable) => {
            // Filter by scheduled status
            if (showOnlyScheduled && !deliverable.scheduled) {
              return false;
            }

            // Filter by deliverable type
            if (
              deliverableTypeFilters.length > 0 &&
              !deliverableTypeFilters.includes(deliverable.type)
            ) {
              return false;
            }

            // Filter by deliverable platform (handle both legacy and new platform systems)
            if (deliverablePlatformFilters.length > 0) {
              let platformMatches = false;

              // Check legacy platform field
              if (
                deliverable.platform &&
                deliverablePlatformFilters.includes(deliverable.platform)
              ) {
                platformMatches = true;
              }

              // Check new platforms array field
              if (deliverable.platforms && deliverable.platforms.length > 0) {
                const platformNames = deliverable.platforms.map(
                  (platformId) => {
                    const platform = availablePlatforms.find(
                      (p) => p._id === platformId
                    );
                    return platform ? platform.name : platformId;
                  }
                );

                if (
                  platformNames.some((name) =>
                    deliverablePlatformFilters.includes(name)
                  )
                ) {
                  platformMatches = true;
                }
              }

              if (!platformMatches) {
                return false;
              }
            }

            return true;
          })
          .flatMap((deliverable): MotiveCalendarEvent[] => {
            const items: MotiveCalendarEvent[] = [];

            if (
              deliverableEventFilters.length === 0 ||
              deliverableEventFilters.includes("deadline")
            ) {
              // Format title with car info if available
              const carData = deliverable.car_id
                ? deliverableCarCache.get(deliverable.car_id.toString())
                : undefined;
              const carInfo = carData
                ? `${carData.year ? `${carData.year} ` : ""}${carData.make} ${carData.model}`
                : "";
              const title = carInfo
                ? `${carInfo} | ${deliverable.scheduled ? "🗓️ " : ""}${deliverable.title} (Edit Deadline)`
                : `${deliverable.scheduled ? "🗓️ " : ""}${deliverable.title} (Edit Deadline)`;

              const deadlineEvent: MotiveCalendarEvent = {
                id: `${deliverable._id?.toString()}-deadline`,
                title: title,
                start: new Date(deliverable.edit_deadline),
                end: new Date(deliverable.edit_deadline),
                type: "deliverable",
                resource: {
                  ...deliverable,
                  eventType: "deadline",
                  car: carData,
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
                // Format title with car info if available
                const carData = deliverable.car_id
                  ? deliverableCarCache.get(deliverable.car_id.toString())
                  : undefined;
                const carInfo = carData
                  ? `${carData.year ? `${carData.year} ` : ""}${carData.make} ${carData.model}`
                  : "";
                const title = carInfo
                  ? `${carInfo} | ${deliverable.scheduled ? "🗓️ " : ""}${deliverable.title} (Release)`
                  : `${deliverable.scheduled ? "🗓️ " : ""}${deliverable.title} (Release)`;

                const releaseEvent: MotiveCalendarEvent = {
                  id: `${deliverable._id?.toString()}-release`,
                  title: title,
                  start: new Date(deliverable.release_date),
                  end: new Date(deliverable.release_date),
                  type: "deliverable",
                  resource: {
                    ...deliverable,
                    eventType: "release",
                    car: carData,
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
    api, // Add api dependency
    eventsWithCars,
    deliverables,
    deliverableCarCache, // Add deliverable car cache dependency
    milestones,
    eventTypeFilters,
    deliverableEventFilters,
    deliverablePlatformFilters,
    deliverableTypeFilters,
    milestoneStatusFilters,
    showEvents,
    showDeliverables,
    showMilestones,
    showOnlyScheduled,
    formatEventTitle,
  ]);

  // FIXED: Early return AFTER all hooks - this fixes the hooks ordering issue
  if (!api) return <LoadingSpinner size="sm" />;

  // Event style getter
  const eventPropGetter = (event: MotiveCalendarEvent) => {
    if (event.type === "event") {
      const eventResource = event.resource as Event;
      // Use event type for primary color grouping with null safety
      const eventType = eventResource?.type || "default";
      const backgroundColor = `hsl(var(--event-${eventType.toLowerCase()}))`;

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
      const deliverableType = deliverableResource?.type || "default";
      let backgroundColor = `hsl(var(--deliverable-${deliverableType
        .toLowerCase()
        .replace(/\s+/g, "-")}))`;

      // Use event type (deadline/release) as a secondary indicator
      if (deliverableResource?.eventType === "deadline") {
        backgroundColor = deliverableResource.scheduled
          ? `hsl(var(--deliverable-deadline-scheduled))`
          : `hsl(var(--deliverable-deadline))`;
      } else if (deliverableResource?.eventType === "release") {
        backgroundColor = deliverableResource.scheduled
          ? `hsl(var(--deliverable-release-scheduled))`
          : `hsl(var(--deliverable-release))`;
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
          <DeliverableTooltip
            deliverable={event.resource as Deliverable}
            onDeliverableUpdated={() => {
              // Call the parent's update callback instead of full page refresh
              onDeliverableUpdate?.();
            }}
          >
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
          <React.Fragment key="visibility-controls">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOnlyScheduled(!showOnlyScheduled)}
                disabled={!showDeliverables}
                className={cn(
                  "flex items-center gap-2",
                  showOnlyScheduled &&
                    "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))]"
                )}
              >
                {showOnlyScheduled ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Scheduled Only
              </Button>
            </div>
          </React.Fragment>
        )}

        {showFilterControls && (
          <React.Fragment key="filter-controls">
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
                  <React.Fragment key="event-types-section">
                    <DropdownMenuLabel>Event Types</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      {uniqueEventTypes.map((type) => (
                        <DropdownMenuCheckboxItem
                          key={`event-type-${type}`}
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
                  </React.Fragment>
                )}

                {showDeliverables && (
                  <React.Fragment key="deliverables-section">
                    {showEvents && uniqueEventTypes.length > 0 && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuLabel>Deliverable Types</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      {uniqueDeliverableTypes.map((type) => (
                        <DropdownMenuCheckboxItem
                          key={`deliverable-type-${type}`}
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
                          key={`deliverable-platform-${platform}`}
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
                          key={`deliverable-category-${category}`}
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
                  </React.Fragment>
                )}

                {showMilestones && milestones.length > 0 && (
                  <React.Fragment key="milestones-section">
                    {(showEvents && uniqueEventTypes.length > 0) ||
                    showDeliverables ? (
                      <DropdownMenuSeparator />
                    ) : null}
                    <DropdownMenuLabel>Milestone Status</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      {milestoneStatusCategories.map((status) => (
                        <DropdownMenuCheckboxItem
                          key={`milestone-status-${status}`}
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
                  </React.Fragment>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </React.Fragment>
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
        if (!isEventEditingEnabled) {
          toast.error("Event updates are disabled in this view");
          if (onEventDrop) {
            onEventDrop(args);
          }
          return;
        }

        const eventResource = event.resource as Event | undefined;
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
          const originalStart = new Date(eventResource?.start || start);
          const originalEnd = eventResource?.end
            ? new Date(eventResource.end)
            : new Date(eventResource?.start || start);
          const originalDuration =
            originalEnd.getTime() - originalStart.getTime();
          adjustedEnd = new Date(start.getTime() + originalDuration);
        }

        const basePath = getEventsApiBasePath(eventResource);
        if (!basePath) {
          toast.error("Unable to determine event context for updates");
          if (onEventDrop) {
            onEventDrop(args);
          }
          return;
        }

        const sanitizedBasePath = basePath.endsWith("/")
          ? basePath.slice(0, -1)
          : basePath;

        await api.put(`${sanitizedBasePath}/${event.id}`, {
          start: start.toISOString(),
          end: adjustedEnd.toISOString(),
          isAllDay: isAllDay,
        });

        toast.success("Event updated successfully");
      } else if (event.type === "deliverable") {
        const deliverableId = event.id.split("-")[0];
        const isDeadline = event.id.endsWith("-deadline");

        if (!deliverableId) {
          throw new Error("Deliverable ID is missing");
        }

        // Use centralized deliverable endpoint
        const apiEndpoint = `/api/deliverables/${deliverableId}`;

        await api.put(
          apiEndpoint,
          isDeadline
            ? {
                edit_deadline: start.toISOString(),
              }
            : {
                release_date: start.toISOString(),
              }
        );

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
        if (!isEventEditingEnabled) {
          toast.error("Event updates are disabled in this view");
          if (onEventResize) {
            onEventResize(args);
          }
          return;
        }

        const eventResource = event.resource as Event | undefined;
        const basePath = getEventsApiBasePath(eventResource);

        if (!basePath) {
          toast.error("Unable to determine event context for updates");
          if (onEventResize) {
            onEventResize(args);
          }
          return;
        }

        const sanitizedBasePath = basePath.endsWith("/")
          ? basePath.slice(0, -1)
          : basePath;

        await api.put(`${sanitizedBasePath}/${event.id}`, {
          start: start.toISOString(),
          end: end.toISOString(),
        });

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
      popup={false} // Show all events inline, no popup
      popupOffset={200} // Massive increase to force more events per date cell
      showAllEvents={true} // FORCE all events to display - override drag/drop limitation
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
      currentDate={currentDate}
      currentView={currentView}
      onNavigate={onNavigate}
      onViewChange={onViewChange}
    />
  );
}
