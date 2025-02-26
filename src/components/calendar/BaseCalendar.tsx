"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  View,
  Views,
  Components,
  EventProps,
  ViewsProps,
  DayLayoutAlgorithm,
  DayLayoutFunction,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
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
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Type for string or Date
type StringOrDate = string | Date;

// Define EventInteractionArgs interface
interface EventInteractionArgs<TEvent> {
  event: TEvent;
  start: Date;
  end: Date;
  isAllDay?: boolean;
}

// Base calendar event interface
export interface BaseCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: string;
  allDay?: boolean;
  resource?: any;
}

// Define filter options interface
export interface FilterOptions {
  eventTypes?: string[];
  deliverableTypes?: string[];
  deliverablePlatforms?: string[];
  deliverableEventCategories?: string[];
  showEvents?: boolean;
  showDeliverables?: boolean;
  eventTypeFilters?: string[];
  deliverableTypeFilters?: string[];
  deliverablePlatformFilters?: string[];
  deliverableEventFilters?: string[];
  setShowEvents?: (show: boolean) => void;
  setShowDeliverables?: (show: boolean) => void;
  setEventTypeFilters?: (filters: string[]) => void;
  setDeliverableTypeFilters?: (filters: string[]) => void;
  setDeliverablePlatformFilters?: (filters: string[]) => void;
  setDeliverableEventFilters?: (filters: string[]) => void;
}

// Props for the BaseCalendar component
export interface BaseCalendarProps<T extends BaseCalendarEvent> {
  events: T[];
  onEventDrop?: (args: EventInteractionArgs<T>) => void;
  onEventResize?: (args: EventInteractionArgs<T>) => void;
  onSelectEvent?: (event: T) => void;
  onSelectSlot?: (slotInfo: {
    start: Date;
    end: Date;
    slots: Date[];
    action: "select" | "click" | "doubleClick";
  }) => void;
  eventPropGetter?: (event: T) => { style?: React.CSSProperties };
  dayPropGetter?: (date: Date) => {
    className?: string;
    style?: React.CSSProperties;
  };
  components?: Components<T, object>;
  defaultView?: View;
  views?: ViewsProps<T, object>;
  formats?: any;
  messages?: any;
  toolbar?: boolean;
  customToolbar?: (toolbarProps: any) => ReactNode;
  fullscreenButton?: boolean;
  className?: string;
  style?: React.CSSProperties;
  min?: Date;
  max?: Date;
  step?: number;
  timeslots?: number;
  scrollToTime?: Date;
  popup?: boolean;
  selectable?: boolean;
  resizable?: boolean;
  draggable?: boolean;
  longPressThreshold?: number;
  dayLayoutAlgorithm?: DayLayoutAlgorithm | DayLayoutFunction<T>;
  showFilterControls?: boolean;
  showVisibilityControls?: boolean;
  filterOptions?: FilterOptions;
}

// Locales for the calendar
const locales = {
  "en-US": enUS,
};

// Create a localizer for the calendar
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Create a DnD Calendar with proper typing
const DragAndDropCalendar = withDragAndDrop<any, object>(Calendar as any);

export default function BaseCalendar<T extends BaseCalendarEvent>({
  events,
  onEventDrop,
  onEventResize,
  onSelectEvent,
  onSelectSlot,
  eventPropGetter,
  dayPropGetter,
  components: customComponents,
  defaultView = "month",
  views = {
    month: true,
    week: true,
    work_week: true,
    agenda: true,
  },
  formats,
  messages,
  toolbar = true,
  customToolbar,
  fullscreenButton = true,
  className,
  style,
  min = new Date(0, 0, 0, 8, 0, 0),
  max = new Date(0, 0, 0, 20, 0, 0),
  step = 30,
  timeslots = 2,
  scrollToTime = new Date(0, 0, 0, 8, 0, 0),
  popup = true,
  selectable = true,
  resizable = true,
  draggable = true,
  longPressThreshold = 10,
  dayLayoutAlgorithm = "no-overlap",
  showFilterControls = false,
  showVisibilityControls = false,
  filterOptions,
}: BaseCalendarProps<T>) {
  const [view, setView] = useState<View>(defaultView as View);
  const [date, setDate] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      calendarRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Default toolbar component
  const defaultToolbar = (toolbarProps: any) => (
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
              "flex items-center justify-center gap-2 px-3 py-1",
              (toolbarProps.view as string) === "month" && "rbc-active"
            )}
            title="Month view"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Month</span>
          </button>
          <button
            type="button"
            onClick={() => toolbarProps.onView("week" as View)}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-1",
              (toolbarProps.view as string) === "week" && "rbc-active"
            )}
            title="Week view"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Week</span>
          </button>
          <button
            type="button"
            onClick={() => toolbarProps.onView("work_week" as View)}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-1",
              (toolbarProps.view as string) === "work_week" && "rbc-active"
            )}
            title="Work Week view"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Work Week</span>
          </button>
          <button
            type="button"
            onClick={() => toolbarProps.onView("agenda" as View)}
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-1",
              (toolbarProps.view as string) === "agenda" && "rbc-active"
            )}
            title="List view"
          >
            <List className="h-4 w-4" />
            <span>Agenda</span>
          </button>
        </div>

        {(showVisibilityControls || showFilterControls) && filterOptions && (
          <>
            <Separator orientation="vertical" className="h-6" />

            <div className="flex items-center gap-2">
              {showVisibilityControls && (
                <>
                  {filterOptions.setShowEvents && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        filterOptions.setShowEvents?.(!filterOptions.showEvents)
                      }
                      className={cn(
                        "flex items-center gap-2",
                        filterOptions.showEvents &&
                          "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))]"
                      )}
                    >
                      {filterOptions.showEvents ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      Events
                    </Button>
                  )}

                  {filterOptions.setShowDeliverables && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        filterOptions.setShowDeliverables?.(
                          !filterOptions.showDeliverables
                        )
                      }
                      className={cn(
                        "flex items-center gap-2",
                        filterOptions.showDeliverables &&
                          "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))]"
                      )}
                    >
                      {filterOptions.showDeliverables ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      Deliverables
                    </Button>
                  )}
                </>
              )}

              {showFilterControls && (
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
                    {filterOptions.showEvents &&
                      filterOptions.eventTypes &&
                      filterOptions.eventTypes.length > 0 && (
                        <>
                          <DropdownMenuLabel>Event Types</DropdownMenuLabel>
                          <DropdownMenuGroup>
                            {filterOptions.eventTypes.map((type) => (
                              <DropdownMenuCheckboxItem
                                key={type}
                                checked={filterOptions.eventTypeFilters?.includes(
                                  type
                                )}
                                onCheckedChange={(checked) => {
                                  filterOptions.setEventTypeFilters?.(
                                    checked
                                      ? [
                                          ...(filterOptions.eventTypeFilters ||
                                            []),
                                          type,
                                        ]
                                      : (
                                          filterOptions.eventTypeFilters || []
                                        ).filter((t) => t !== type)
                                  );
                                }}
                              >
                                {type.replace(/_/g, " ")}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuGroup>
                        </>
                      )}

                    {filterOptions.showDeliverables && (
                      <>
                        {filterOptions.showEvents &&
                          filterOptions.eventTypes &&
                          filterOptions.eventTypes.length > 0 && (
                            <DropdownMenuSeparator />
                          )}
                        <DropdownMenuLabel>Deliverable Types</DropdownMenuLabel>
                        <DropdownMenuGroup>
                          {filterOptions.deliverableTypes?.map((type) => (
                            <DropdownMenuCheckboxItem
                              key={type}
                              checked={filterOptions.deliverableTypeFilters?.includes(
                                type
                              )}
                              onCheckedChange={(checked) => {
                                filterOptions.setDeliverableTypeFilters?.(
                                  checked
                                    ? [
                                        ...(filterOptions.deliverableTypeFilters ||
                                          []),
                                        type,
                                      ]
                                    : (
                                        filterOptions.deliverableTypeFilters ||
                                        []
                                      ).filter((t) => t !== type)
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
                          {filterOptions.deliverablePlatforms?.map(
                            (platform) => (
                              <DropdownMenuCheckboxItem
                                key={platform}
                                checked={filterOptions.deliverablePlatformFilters?.includes(
                                  platform
                                )}
                                onCheckedChange={(checked) => {
                                  filterOptions.setDeliverablePlatformFilters?.(
                                    checked
                                      ? [
                                          ...(filterOptions.deliverablePlatformFilters ||
                                            []),
                                          platform,
                                        ]
                                      : (
                                          filterOptions.deliverablePlatformFilters ||
                                          []
                                        ).filter((p) => p !== platform)
                                  );
                                }}
                              >
                                {platform}
                              </DropdownMenuCheckboxItem>
                            )
                          )}
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Event Categories</DropdownMenuLabel>
                        <DropdownMenuGroup>
                          {filterOptions.deliverableEventCategories?.map(
                            (category) => (
                              <DropdownMenuCheckboxItem
                                key={category}
                                checked={filterOptions.deliverableEventFilters?.includes(
                                  category
                                )}
                                onCheckedChange={(checked) => {
                                  filterOptions.setDeliverableEventFilters?.(
                                    checked
                                      ? [
                                          ...(filterOptions.deliverableEventFilters ||
                                            []),
                                          category,
                                        ]
                                      : (
                                          filterOptions.deliverableEventFilters ||
                                          []
                                        ).filter((c) => c !== category)
                                  );
                                }}
                              >
                                {category.charAt(0).toUpperCase() +
                                  category.slice(1)}
                              </DropdownMenuCheckboxItem>
                            )
                          )}
                        </DropdownMenuGroup>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </>
        )}

        <Separator orientation="vertical" className="h-6" />

        {fullscreenButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="flex items-center gap-2"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
            {isFullscreen ? <span>Exit</span> : <span>Fullscreen</span>}
          </Button>
        )}
      </div>
    </div>
  );

  // Combine custom components with default components
  const components = {
    toolbar: customToolbar || defaultToolbar,
    ...customComponents,
  };

  // Default formats
  const defaultFormats = {
    timeGutterFormat: (date: Date) => {
      return format(date, "h aa").toLowerCase();
    },
    agendaDateFormat: "MMM d, yyyy",
    agendaTimeFormat: "h:mm a",
    agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) => {
      if (start.getDate() === end.getDate()) {
        return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
      }
      return `${format(start, "MMM d h:mm a")} - ${format(
        end,
        "MMM d h:mm a"
      )}`;
    },
  };

  // Default messages
  const defaultMessages = {
    allDay: "All Day",
    date: "Date",
    time: "Time",
    event: "Event",
    noEventsInRange: "No events in this range.",
    showMore: (total: number) => `+${total} more`,
    tomorrow: "Tomorrow",
    today: "Today",
    agenda: "List",
  };

  return (
    <div
      ref={calendarRef}
      className={cn(
        "flex-1 overflow-hidden rounded-lg border border-[hsl(var(--border))] border-opacity-10 dark:border-opacity-20 bg-background shadow-sm",
        isFullscreen && "h-screen w-screen",
        className
      )}
      style={{
        ...style,
        minHeight: isFullscreen ? "100vh" : "700px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DragAndDropCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        eventPropGetter={eventPropGetter}
        dayPropGetter={dayPropGetter}
        views={views as any}
        view={view}
        date={date}
        onView={(newView: View) => setView(newView)}
        onNavigate={(newDate: Date) => setDate(newDate)}
        min={min}
        max={max}
        components={components}
        className={cn(
          "events-calendar h-full",
          isFullscreen && "fullscreen-calendar"
        )}
        onEventDrop={onEventDrop as any}
        onEventResize={onEventResize as any}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        resizable={resizable}
        selectable={selectable}
        draggableAccessor={() => draggable}
        resizableAccessor={(event) => resizable && !(event as T).allDay}
        showMultiDayTimes
        popup={popup}
        timeslots={timeslots}
        step={step}
        defaultView={defaultView}
        dayLayoutAlgorithm={dayLayoutAlgorithm as any}
        scrollToTime={scrollToTime}
        longPressThreshold={longPressThreshold}
        formats={{ ...defaultFormats, ...formats }}
        messages={{ ...defaultMessages, ...messages }}
      />
    </div>
  );
}
