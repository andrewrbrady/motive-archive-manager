import { useState, useEffect, useRef } from "react";
import { EventType } from "@/types/event";
import { addDays, format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { GripVertical } from "lucide-react";

interface EventTemplate {
  type: EventType;
  description: string;
  daysFromStart: number;
  hasEndDate?: boolean;
  daysUntilEnd?: number;
  isAllDay?: boolean;
}

interface BatchTemplate {
  name: string;
  events: EventTemplate[];
}

interface EventTemplateGanttProps {
  template: BatchTemplate;
  onEventUpdate: (index: number, updates: Partial<EventTemplate>) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  [EventType.AUCTION_SUBMISSION]: "#EF4444", // Red
  [EventType.AUCTION_LISTING]: "#F59E0B", // Amber
  [EventType.AUCTION_END]: "#10B981", // Emerald
  [EventType.INSPECTION]: "#3B82F6", // Blue
  [EventType.DETAIL]: "#8B5CF6", // Purple
  [EventType.PRODUCTION]: "#EC4899", // Pink
  [EventType.POST_PRODUCTION]: "#6366F1", // Indigo
  [EventType.MARKETING]: "#14B8A6", // Teal
  [EventType.PICKUP]: "#F43F5E", // Rose
  [EventType.DELIVERY]: "#0EA5E9", // Sky
  [EventType.OTHER]: "#6B7280", // Gray
};

const formatEventType = (type: string) => {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function EventTemplateGantt({
  template,
  onEventUpdate,
  onReorder,
}: EventTemplateGanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [draggingEvent, setDraggingEvent] = useState<number | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [initialDaysFromStart, setInitialDaysFromStart] = useState<number>(0);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);

  // Calculate the total duration needed based on events
  const calculateTotalDays = () => {
    let maxDays = 14; // Minimum of 14 days
    template.events.forEach((event) => {
      const eventEndDay = event.daysFromStart + (event.daysUntilEnd || 1);
      maxDays = Math.max(maxDays, eventEndDay + 2); // Add 2 days of padding
    });
    return maxDays;
  };

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width - 48); // Subtract padding
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener("resize", updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const totalDays = calculateTotalDays();
  const dayWidth = Math.max(50, Math.floor((containerWidth - 48) / totalDays)); // Reduced minimum to 50px
  const timelineWidth = totalDays * dayWidth;

  const handleDragStart = (
    event: React.DragEvent,
    index: number,
    daysFromStart: number,
    isVerticalDrag: boolean = false
  ) => {
    event.stopPropagation();
    setDraggingEvent(index);
    setIsDraggingVertical(isVerticalDrag);

    if (!isVerticalDrag) {
      setDragStartX(event.clientX);
      setInitialDaysFromStart(daysFromStart);
    }

    event.dataTransfer.setData("text/plain", index.toString());
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDrag = (event: React.DragEvent) => {
    if (draggingEvent === null || !event.clientX || isDraggingVertical) return;

    const deltaX = event.clientX - dragStartX;
    const deltaDays = Math.round(deltaX / dayWidth);
    const newDaysFromStart = Math.max(0, initialDaysFromStart + deltaDays);

    onEventUpdate(draggingEvent, {
      daysFromStart: newDaysFromStart,
    });
  };

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDrop = (event: React.DragEvent, toIndex: number) => {
    event.preventDefault();
    const fromIndex = parseInt(event.dataTransfer.getData("text/plain"));

    if (fromIndex !== toIndex && onReorder) {
      onReorder(fromIndex, toIndex);
    }

    setDraggingEvent(null);
    setDragOverIndex(null);
    setIsDraggingVertical(false);
  };

  const handleDragEnd = () => {
    setDraggingEvent(null);
    setDragOverIndex(null);
    setIsDraggingVertical(false);
  };

  return (
    <div className="space-y-4" ref={containerRef}>
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(EVENT_TYPE_COLORS).map(([type, color]) => (
          <Badge
            key={type}
            variant="outline"
            className="bg-background hover:bg-background"
            style={{
              borderColor: color,
              color: color,
            }}
          >
            {formatEventType(type)}
          </Badge>
        ))}
      </div>

      <Card className="relative">
        <ScrollArea className="w-full">
          <div className="p-4">
            <div className="relative" style={{ width: timelineWidth }}>
              {/* Timeline grid */}
              <div className="absolute top-0 left-0 w-full h-full">
                {Array.from({ length: totalDays + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "absolute top-0 h-full border-l",
                      i === 0
                        ? "border-primary/50"
                        : "border-muted-foreground/20"
                    )}
                    style={{ left: `${i * dayWidth + dayWidth / 2}px` }}
                  >
                    <div className="text-xs text-muted-foreground -ml-3 bg-background px-1 rounded">
                      Day {i}
                    </div>
                  </div>
                ))}
              </div>

              {/* Events */}
              <div className="relative pt-6" style={{ minHeight: "200px" }}>
                <TooltipProvider>
                  {template.events.map((event, index) => {
                    const duration = event.hasEndDate
                      ? event.daysUntilEnd || 1
                      : 1;
                    const width = duration * dayWidth;
                    const left = event.daysFromStart * dayWidth + dayWidth / 2;

                    return (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "absolute group",
                              draggingEvent === index && "z-50",
                              dragOverIndex === index && "translate-y-[-2px]",
                              "transition-transform duration-200"
                            )}
                            style={{
                              left: `${left}px`,
                              width: `${width}px`,
                              top: `${index * 36 + 20}px`,
                            }}
                            draggable
                            onDragStart={(e) =>
                              handleDragStart(e, index, event.daysFromStart)
                            }
                            onDrag={handleDrag}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                          >
                            <div
                              className={cn(
                                "rounded-md text-white text-sm transition-all",
                                "hover:ring-2 hover:ring-offset-2 hover:ring-offset-background",
                                "active:ring-2 active:ring-offset-2 active:ring-offset-background",
                                "ring-[var(--event-color)] flex items-center gap-2",
                                dragOverIndex === index && "scale-[1.02]",
                                "px-2 h-7"
                              )}
                              style={
                                {
                                  backgroundColor:
                                    EVENT_TYPE_COLORS[event.type],
                                  width: "100%",
                                  "--event-color":
                                    EVENT_TYPE_COLORS[event.type],
                                } as React.CSSProperties
                              }
                            >
                              <div
                                className="cursor-move opacity-50 hover:opacity-100"
                                draggable
                                onDragStart={(e) => {
                                  handleDragStart(
                                    e,
                                    index,
                                    event.daysFromStart,
                                    true
                                  );
                                }}
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>
                              <div className="truncate flex-1">
                                {formatEventType(event.type)} -{" "}
                                {event.description}
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {formatEventType(event.type)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {event.description}
                            </div>
                            <div className="text-xs">
                              Starts on day {event.daysFromStart}
                              {event.hasEndDate &&
                                ` (${event.daysUntilEnd} day${
                                  event.daysUntilEnd === 1 ? "" : "s"
                                } duration)`}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Card>

      <div className="text-sm text-muted-foreground">
        Drag events horizontally to adjust their timing, or use the grip handle
        to reorder events vertically. The timeline shows {totalDays} days from
        the template start date.
      </div>
    </div>
  );
}
