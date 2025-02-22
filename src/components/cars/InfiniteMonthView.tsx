import React, { useRef, useEffect, useState } from "react";
import { FixedSizeList as List } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  getDay,
  addDays,
  subDays,
  differenceInCalendarMonths,
  isWithinInterval,
  parseISO,
  startOfDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import EventTooltip from "../events/EventTooltip";
import DeliverableTooltip from "../deliverables/DeliverableTooltip";

interface InfiniteMonthViewProps {
  date: Date;
  events: any[];
  onNavigate: (date: Date) => void;
  className?: string;
}

const TOTAL_MONTHS = 120;
const MONTH_HEIGHT = 850;
const BUFFER_MONTHS = 3;
const MAX_EVENTS_PER_DAY = 3;

export default function InfiniteMonthView({
  date,
  events,
  onNavigate,
  className,
}: InfiniteMonthViewProps) {
  const [monthDates, setMonthDates] = useState<Date[]>([]);
  const [visibleMonthDate, setVisibleMonthDate] = useState(date);
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(800);

  // Update container height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.offsetHeight);
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Initialize month dates
  useEffect(() => {
    const centerDate = startOfMonth(date);
    const halfMonths = Math.floor(TOTAL_MONTHS / 2);

    // Generate array of months centered on the current date
    const months: Date[] = [];
    for (let i = -halfMonths; i < halfMonths; i++) {
      months.push(addMonths(centerDate, i));
    }

    setMonthDates(months);

    // Scroll to center month
    if (listRef.current) {
      listRef.current.scrollToItem(halfMonths, "center");
    }
  }, [date]);

  const handleScroll = ({ scrollOffset }: { scrollOffset: number }) => {
    const visibleIndex = Math.floor(scrollOffset / MONTH_HEIGHT);
    if (visibleIndex >= 0 && visibleIndex < monthDates.length) {
      const newVisibleMonth = monthDates[visibleIndex];
      if (newVisibleMonth && !isSameMonth(newVisibleMonth, visibleMonthDate)) {
        setVisibleMonthDate(newVisibleMonth);
        onNavigate(newVisibleMonth);
      }
    }
  };

  const renderMonth = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const currentMonth = monthDates[index];
    if (!currentMonth) return null;

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startWeekDay = getDay(monthStart);

    // Calculate days for the current month only
    const calendarDays = eachDayOfInterval({
      start: monthStart,
      end: monthEnd,
    });

    // Calculate the height needed for this month's grid
    const totalRows = Math.ceil((calendarDays.length + startWeekDay) / 7);
    const monthHeight = totalRows * 140; // 140px is our row height

    // Adjust the style to use dynamic height and remove bottom padding
    const adjustedStyle = {
      ...style,
      height: monthHeight,
      marginBottom: 0,
      paddingBottom: 0,
    };

    return (
      <div style={adjustedStyle} className="month-container">
        <div className="grid grid-cols-7 h-full">
          {/* Add empty cells for the start offset */}
          {Array.from({ length: startWeekDay }).map((_, index) => (
            <div
              key={`empty-start-${index}`}
              className="h-[140px] p-2 border-r border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[var(--background-primary)]"
            />
          ))}

          {/* Render current month days */}
          {calendarDays.map((day) => {
            // Filter events for this day with timezone-safe comparison
            const dayEvents = events
              .filter((event) => {
                const eventDate =
                  event.type === "deliverable"
                    ? startOfDay(
                        event.start instanceof Date
                          ? event.start
                          : new Date(event.start)
                      )
                    : new Date(event.start);
                return (
                  format(eventDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
                );
              })
              .sort(
                (a, b) =>
                  new Date(a.start).getTime() - new Date(b.start).getTime()
              );

            const isToday =
              format(new Date(), "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
            const hasMoreEvents = dayEvents.length > MAX_EVENTS_PER_DAY;
            const visibleEvents = hasMoreEvents
              ? dayEvents.slice(0, MAX_EVENTS_PER_DAY)
              : dayEvents;

            return (
              <div
                key={format(day, "yyyy-MM-dd")}
                className={cn(
                  "h-[140px] p-2 border-r border-b border-zinc-200 dark:border-zinc-800",
                  isToday && "bg-slate-100 dark:bg-slate-800/25"
                )}
              >
                <div
                  className={cn(
                    "text-sm mb-1",
                    isToday
                      ? "text-slate-600 dark:text-slate-300 font-medium"
                      : "text-zinc-900 dark:text-zinc-100"
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {visibleEvents.map((event, idx) =>
                    event.type === "event" ? (
                      <EventTooltip
                        key={event.id || idx}
                        event={event.resource}
                      >
                        <div
                          className={cn(
                            "text-xs p-1 rounded text-white truncate transition-colors cursor-pointer",
                            "bg-slate-500/90 hover:bg-slate-500 dark:bg-slate-600/90 dark:hover:bg-slate-600"
                          )}
                        >
                          {event.title}
                        </div>
                      </EventTooltip>
                    ) : (
                      <DeliverableTooltip
                        key={event.id || idx}
                        deliverable={{
                          ...event.resource,
                          // Override display-related fields
                          car: null,
                          car_id: null,
                          release_date: null,
                          edit_deadline: null,
                          isDeadline: event.resource.eventType === "deadline",
                          // Hide the title from the header since it's redundant
                          hideTitle: true,
                          // Hide dates since they're visible in the calendar
                          hideDates: true,
                        }}
                      >
                        <div
                          className={cn(
                            "text-xs p-1 rounded text-white truncate transition-colors cursor-pointer",
                            "bg-stone-400/90 hover:bg-stone-400 dark:bg-stone-500/90 dark:hover:bg-stone-500"
                          )}
                        >
                          {event.title}
                        </div>
                      </DeliverableTooltip>
                    )
                  )}
                  {hasMoreEvents && (
                    <div className="text-xs px-1 py-0.5 text-zinc-600 dark:text-zinc-400 font-medium">
                      {dayEvents.length - MAX_EVENTS_PER_DAY} more...
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add empty cells for the end offset */}
          {Array.from({
            length: totalRows * 7 - (calendarDays.length + startWeekDay),
          }).map((_, index) => (
            <div
              key={`empty-end-${index}`}
              className="h-[140px] p-2 border-r border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[var(--background-primary)]"
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={cn("h-full relative", className)}>
      <div className="sticky top-0 z-20 bg-white dark:bg-[var(--background-primary)]">
        <div className="py-2 px-4 border-b border-l border-r border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {format(visibleMonthDate, "MMMM yyyy")}
          </h2>
        </div>
        <div className="grid grid-cols-7 border-b border-l border-r border-zinc-200 dark:border-zinc-800">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium py-2 border-r border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
            >
              {day}
            </div>
          ))}
        </div>
      </div>
      <div className="border-l border-zinc-200 dark:border-zinc-800">
        <List
          ref={listRef}
          height={containerHeight - 84}
          itemCount={monthDates.length}
          itemSize={MONTH_HEIGHT}
          width="100%"
          overscanCount={BUFFER_MONTHS}
          className="no-scrollbar"
          onScroll={handleScroll}
          style={{ overflowY: "scroll" }}
        >
          {renderMonth}
        </List>
      </div>
    </div>
  );
}
