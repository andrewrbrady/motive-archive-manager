import { useState, useEffect, useRef } from "react";
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
import { GripVertical, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Define batch interfaces locally
interface DeliverableTemplate {
  title: string;
  platform_id?: string;
  platform?: string; // Legacy field
  mediaTypeId?: string;
  type?: string; // Legacy field
  duration?: number;
  aspect_ratio: string;
  daysUntilDeadline?: number;
  daysUntilRelease?: number;
}

interface BatchTemplate {
  name: string;
  templates: DeliverableTemplate[];
}

const PLATFORM_COLORS: Record<string, string> = {
  "Instagram Reels": "var(--accent-hover)",
  "Instagram Post": "var(--accent-primary)",
  "Instagram Story": "#60a5fa",
  YouTube: "var(--error-secondary)",
  "YouTube Shorts": "var(--error-primary)",
  TikTok: "#171717",
  "Bring a Trailer": "#0f766e",
  Facebook: "var(--accent-secondary)",
  Other: "#6B7280",
};

const statusColors = {
  draft: "var(--zinc-600)",
  pending: "var(--info)",
  approved: "var(--success)",
  in_progress: "var(--warning)",
  rejected: "var(--destructive)",
  completed: "var(--success)",
  cancelled: "var(--destructive)",
  default: "var(--zinc-500)",
};

const getPillContent = (
  deliverable: DeliverableTemplate,
  type: "deadline" | "release"
) => {
  if (type === "deadline") {
    return `${deliverable.title || "Untitled"} - ${deliverable.platform}${
      deliverable.duration ? ` (${deliverable.duration}s)` : ""
    }`;
  }
  return `Release - ${deliverable.platform}`;
};

interface DeliverableTemplateGanttProps {
  template: BatchTemplate;
  onTemplateUpdate: (
    index: number,
    updates: Partial<DeliverableTemplate>
  ) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export default function DeliverableTemplateGantt({
  template,
  onTemplateUpdate,
  onReorder,
}: DeliverableTemplateGanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dragging, setDragging] = useState<{
    index: number;
    type: "deadline" | "release";
    startX: number;
    startDays: number;
  } | null>(null);

  // Calculate the total duration needed based on templates
  const calculateTotalDays = () => {
    let maxDays = 14; // Minimum of 14 days
    template.templates.forEach((template) => {
      const totalDays = Math.max(
        template.daysUntilDeadline || 0,
        template.daysUntilRelease || 0
      );
      maxDays = Math.max(maxDays, totalDays + 7); // Add 7 days of padding
    });
    return maxDays;
  };

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.max(800, rect.width - 48); // Ensure minimum width and subtract padding
        setContainerWidth(width);
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
  const baseWidth = Math.max(50, Math.floor(containerWidth / totalDays));
  const dayWidth = baseWidth * zoomLevel;
  const timelineWidth = Math.max(800, totalDays * dayWidth);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;

      const deltaX = e.clientX - dragging.startX;
      const deltaDays = Math.round(deltaX / dayWidth);
      const newDays = Math.max(0, dragging.startDays + deltaDays);

      onTemplateUpdate(dragging.index, {
        [dragging.type === "release"
          ? "daysUntilRelease"
          : "daysUntilDeadline"]: newDays,
      });
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, dayWidth, onTemplateUpdate]);

  const handleMouseDown = (
    event: React.MouseEvent,
    index: number,
    days: number,
    type: "deadline" | "release"
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setDragging({
      index,
      type,
      startX: event.clientX,
      startDays: days,
    });
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  return (
    <div className="space-y-4" ref={containerRef}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-wrap gap-2">
          {Object.entries(PLATFORM_COLORS).map(([platform, color]) => (
            <Badge
              key={platform}
              variant="outline"
              className="bg-background hover:bg-background"
              style={{
                borderColor: color,
                color: color,
              }}
            >
              {platform}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">
            Zoom: {Math.round(zoomLevel * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            className="h-8 w-8"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="relative">
        <ScrollArea className="w-full">
          <div className="p-4">
            <div className="relative" style={{ width: `${timelineWidth}px` }}>
              {/* Timeline grid */}
              <div className="absolute top-0 left-0 w-full h-full">
                {Array.from({ length: totalDays + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "absolute top-0 h-full border-l transition-colors",
                      i === 0
                        ? "border-primary/50"
                        : i % 7 === 0
                          ? "border-muted-foreground/30"
                          : zoomLevel >= 1.5
                            ? "border-muted-foreground/20"
                            : "border-transparent"
                    )}
                    style={{ left: `${i * dayWidth + dayWidth / 2}px` }}
                  >
                    <div className="text-xs text-muted-foreground -ml-3 bg-background px-1 rounded">
                      {i === 0
                        ? "Start"
                        : zoomLevel >= 0.75
                          ? `Day ${i}`
                          : i % 7 === 0
                            ? `Day ${i}`
                            : ""}
                    </div>
                  </div>
                ))}
              </div>

              {/* Deliverables */}
              <div
                className="relative pt-6 pb-8"
                style={{ minHeight: "200px" }}
              >
                <TooltipProvider>
                  {template.templates.map((deliverable, index) => {
                    const deadlineX =
                      (deliverable.daysUntilDeadline || 0) * dayWidth +
                      dayWidth / 2;
                    const releaseX =
                      (deliverable.daysUntilRelease || 0) * dayWidth +
                      dayWidth / 2;

                    return (
                      <div
                        key={index}
                        className="relative"
                        style={{
                          height: "64px", // Increased height for two rows
                          marginTop: index === 0 ? 0 : "16px",
                        }}
                      >
                        {/* Deadline Pill - Top Row */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute group cursor-move",
                                dragging?.index === index &&
                                  dragging?.type === "deadline" &&
                                  "z-50"
                              )}
                              style={{
                                left: `${deadlineX}px`,
                                top: "0px", // Position in top row
                                minWidth: "200px",
                                maxWidth: "400px",
                                height: "28px",
                                touchAction: "none",
                              }}
                              onMouseDown={(e) =>
                                handleMouseDown(
                                  e,
                                  index,
                                  deliverable.daysUntilDeadline || 0,
                                  "deadline"
                                )
                              }
                            >
                              <div
                                className="rounded-md pl-1.5 pr-3 py-1 text-white text-sm transition-all hover:ring-2 hover:ring-offset-2 hover:ring-offset-background flex items-center gap-2 h-full whitespace-nowrap"
                                style={{
                                  backgroundColor:
                                    PLATFORM_COLORS[deliverable.platform],
                                  width: "100%",
                                }}
                              >
                                <div className="cursor-move opacity-50 hover:opacity-100 shrink-0">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="font-medium">Deadline:</span>
                                  <span className="truncate">
                                    {deliverable.title || "Untitled"}
                                  </span>
                                  <span className="text-xs opacity-90 shrink-0 font-medium">
                                    Day {deliverable.daysUntilDeadline || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {deliverable.title || "Untitled"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Platform: {deliverable.platform}
                                <br />
                                Type: {deliverable.type}
                                {deliverable.duration && (
                                  <>
                                    <br />
                                    Duration: {deliverable.duration}s
                                  </>
                                )}
                                <br />
                                Deadline: Day{" "}
                                {deliverable.daysUntilDeadline || 0}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>

                        {/* Release Pill - Bottom Row */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute group cursor-move",
                                dragging?.index === index &&
                                  dragging?.type === "release" &&
                                  "z-50"
                              )}
                              style={{
                                left: `${releaseX}px`,
                                top: "36px", // Position in bottom row
                                minWidth: "150px",
                                maxWidth: "300px",
                                height: "28px",
                                touchAction: "none",
                              }}
                              onMouseDown={(e) =>
                                handleMouseDown(
                                  e,
                                  index,
                                  deliverable.daysUntilRelease || 0,
                                  "release"
                                )
                              }
                            >
                              <div
                                className="rounded-md pl-1.5 pr-3 py-1 text-white text-sm transition-all hover:ring-2 hover:ring-offset-2 hover:ring-offset-background flex items-center gap-2 h-full whitespace-nowrap"
                                style={{
                                  backgroundColor:
                                    PLATFORM_COLORS[deliverable.platform],
                                  opacity: 0.6,
                                  width: "100%",
                                }}
                              >
                                <div className="cursor-move opacity-50 hover:opacity-100 shrink-0">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="font-medium">Release:</span>
                                  <span className="truncate">
                                    {deliverable.title || "Untitled"}
                                  </span>
                                  <span className="text-xs opacity-90 shrink-0 font-medium">
                                    Day {deliverable.daysUntilRelease || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {deliverable.title || "Untitled"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Platform: {deliverable.platform}
                                <br />
                                Type: {deliverable.type}
                                {deliverable.duration && (
                                  <>
                                    <br />
                                    Duration: {deliverable.duration}s
                                  </>
                                )}
                                <br />
                                Release: Day {deliverable.daysUntilRelease || 0}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Card>

      <div className="text-sm text-muted-foreground flex items-center justify-between">
        <span>
          Drag the pills horizontally to adjust their timing. The timeline shows{" "}
          {totalDays} days from the template start date.
        </span>
        <span className="text-xs">
          Use the zoom controls to adjust the timeline view
        </span>
      </div>
    </div>
  );
}
