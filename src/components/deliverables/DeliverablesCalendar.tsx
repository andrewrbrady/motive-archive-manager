"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, addHours } from "date-fns";
import { enUS } from "date-fns/locale";
import { Deliverable } from "@/types/deliverable";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import DeliverableTooltip from "./DeliverableTooltip";
import {
  Clock,
  CalendarClock,
  Maximize2,
  Minimize2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./calendar.css";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAPI } from "@/hooks/useAPI";
import { useAPIQuery } from "@/hooks/useAPIQuery";

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

interface DeliverableWithCar extends Deliverable {
  car?: Car;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: DeliverableWithCar & { isDeadline: boolean };
  allDay?: boolean;
}

interface CarsResponse {
  cars: Car[];
}

interface DeliverablesResponse {
  deliverables: DeliverableWithCar[];
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

const DragAndDropCalendar = withDragAndDrop(Calendar);

const statusColors = {
  not_started: "var(--destructive)",
  in_progress: "var(--warning)",
  completed: "var(--success)",
  default: "var(--zinc-500)",
};

export default function DeliverablesCalendar() {
  const api = useAPI();

  // Non-blocking state for UI interactions
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [type, setType] = useState("");
  const [editor, setEditor] = useState("");
  const [selectedCar, setSelectedCar] = useState("");
  const [creativeRole, setCreativeRole] = useState("");

  const CREATIVE_ROLES = [
    "video_editor",
    "photographer",
    "content_writer",
    "social_media_manager",
    "cinematographer",
    "sound_engineer",
    "graphic_designer",
    "storyboard_artist",
  ];

  // FIXED: Use non-blocking useAPIQuery for cars data
  const {
    data: carsData,
    isLoading: isLoadingCars,
    error: carsError,
  } = useAPIQuery<CarsResponse>("cars", {
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // FIXED: Use non-blocking useAPIQuery for users data
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useAPIQuery<
    { _id: string; name: string; creativeRoles: string[]; status: string }[]
  >("users", {
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Build deliverables query params
  const deliverableParams = useMemo(() => {
    const params = new URLSearchParams({
      sortField: "edit_deadline",
      sortDirection: "asc",
    });

    if (search) params.append("search", search);
    if (status && status !== "all") params.append("status", status);
    if (platform && platform !== "all") params.append("platform", platform);
    if (type && type !== "all") params.append("type", type);
    if (editor && editor !== "all") params.append("editor", editor);
    if (selectedCar && selectedCar !== "all")
      params.append("car_id", selectedCar);
    if (creativeRole && creativeRole !== "all")
      params.append("creative_role", creativeRole);

    return params.toString();
  }, [search, status, platform, type, editor, selectedCar, creativeRole]);

  // FIXED: Use non-blocking useAPIQuery for deliverables data
  const {
    data: deliverablesData,
    isLoading: isLoadingDeliverables,
    error: deliverablesError,
    refetch: refetchDeliverables,
  } = useAPIQuery<DeliverablesResponse>(`deliverables?${deliverableParams}`, {
    staleTime: 2 * 60 * 1000, // 2 minutes cache for deliverables
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Process data safely
  const cars = carsData?.cars || [];
  const users =
    usersData?.filter(
      (user) =>
        user.status === "active" &&
        user.creativeRoles &&
        user.creativeRoles.length > 0
    ) || [];
  const deliverables = deliverablesData?.deliverables || [];

  // Determine overall loading state - only for essential data
  const isLoading = isLoadingCars || isLoadingUsers || isLoadingDeliverables;

  const filteredUsers = useMemo(() => {
    if (!creativeRole || creativeRole === "all") return users;
    return users.filter((user) => user.creativeRoles.includes(creativeRole));
  }, [users, creativeRole]);

  // Reset editor if current editor doesn't have the selected role
  useEffect(() => {
    if (creativeRole && creativeRole !== "all" && editor && editor !== "all") {
      const currentEditor = users.find((user) => user.name === editor);
      if (
        currentEditor &&
        !currentEditor.creativeRoles.includes(creativeRole)
      ) {
        setEditor("all");
      }
    }
  }, [creativeRole, editor, users]);

  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    deliverables.forEach((deliverable) => {
      const deadline = new Date(deliverable.edit_deadline);
      const releaseDate = deliverable.release_date
        ? new Date(deliverable.release_date)
        : deadline;
      const baseTitle = `${
        deliverable.car
          ? `${deliverable.car.year} ${deliverable.car.make} ${deliverable.car.model} - `
          : ""
      }${deliverable.title}`;

      // Add deadline event
      allEvents.push({
        id: `${deliverable._id?.toString()}-deadline`,
        title: `⏰ ${baseTitle}`,
        start: deadline,
        end: deadline,
        resource: { ...deliverable, isDeadline: true },
        allDay: view === "month",
      });

      // Add release date event
      allEvents.push({
        id: `${deliverable._id?.toString()}-release`,
        title: `📅 ${baseTitle}`,
        start: releaseDate,
        end: releaseDate,
        resource: { ...deliverable, isDeadline: false },
        allDay: view === "month",
      });

      if (view !== "month") {
        // For week/day views, set time-based events
        const deadlineStart = new Date(deadline);
        deadlineStart.setHours(9, 0, 0);
        const deadlineEnd = new Date(deadline);
        deadlineEnd.setHours(17, 0, 0);

        const releaseStart = new Date(releaseDate);
        releaseStart.setHours(9, 0, 0);
        const releaseEnd = new Date(releaseDate);
        releaseEnd.setHours(17, 0, 0);

        if (deliverable.type !== "Photo Gallery" && deliverable.duration) {
          const durationInHours = deliverable.duration / 3600;
          deadlineEnd.setTime(
            deadlineStart.getTime() + durationInHours * 60 * 60 * 1000
          );
        }

        allEvents[allEvents.length - 2].start = deadlineStart;
        allEvents[allEvents.length - 2].end = deadlineEnd;
        allEvents[allEvents.length - 1].start = releaseStart;
        allEvents[allEvents.length - 1].end = releaseEnd;
      }
    });

    return allEvents;
  }, [deliverables, view]);

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "";
    let className = "";
    const deliverable = event.resource as Deliverable;
    const status = deliverable.status;
    const isDeadline = event.title.includes("Deadline");

    // Base color based on status
    let baseColor = "";
    switch (status) {
      case "not_started":
        baseColor = isDeadline ? "var(--error-primary)" : "#f87171";
        break;
      case "in_progress":
        baseColor = isDeadline ? "#f59e0b" : "#fbbf24";
        break;
      case "done":
        baseColor = isDeadline ? "var(--success-primary)" : "#4ade80";
        break;
      default:
        baseColor = isDeadline ? "#6b7280" : "#9ca3af";
    }

    backgroundColor = baseColor;
    className = `${status}-event ${
      isDeadline ? "deadline-event" : "release-event"
    }`;

    return {
      style: {
        backgroundColor,
        color: "white",
        border: "none",
        borderRadius: "4px",
        opacity: 0.9,
        display: "block",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontSize: "0.875rem",
        padding: "2px 4px",
      },
      className: cn(
        "hover:opacity-100 transition-opacity cursor-pointer",
        className
      ),
    };
  };

  const dayPropGetter = (date: Date) => {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    return {
      className: cn(
        "transition-colors",
        isToday &&
          "today-cell bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))]"
      ),
    };
  };

  const components = {
    event: (props: any) => {
      const event = props.event as CalendarEvent;
      return (
        <div style={{ position: "relative" }}>
          <DeliverableTooltip deliverable={event.resource}>
            <div
              style={{
                ...props.style,
                backgroundColor: eventStyleGetter(event).style.backgroundColor,
                position: "relative",
                zIndex: 1,
              }}
              className={eventStyleGetter(event).className}
              aria-label={props.title}
              role="button"
              title=""
            >
              <span>{props.title}</span>
            </div>
          </DeliverableTooltip>
        </div>
      );
    },
    toolbar: (toolbarProps: any) => {
      return (
        <div className="rbc-toolbar">
          <span className="rbc-btn-group">
            <button
              type="button"
              onClick={() => toolbarProps.onNavigate("PREV")}
            >
              Previous Month
            </button>
            <button
              type="button"
              onClick={() => {
                const newDate = new Date(date);
                newDate.setDate(date.getDate() - 7);
                toolbarProps.onNavigate("DATE", newDate);
              }}
              className="px-2"
            >
              Previous Week
            </button>
            <button
              type="button"
              onClick={() => toolbarProps.onNavigate("TODAY")}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const newDate = new Date(date);
                newDate.setDate(date.getDate() + 7);
                toolbarProps.onNavigate("DATE", newDate);
              }}
              className="px-2"
            >
              Next Week
            </button>
            <button
              type="button"
              onClick={() => toolbarProps.onNavigate("NEXT")}
            >
              Next Month
            </button>
          </span>
          <span className="rbc-toolbar-label">{toolbarProps.label}</span>
          <div className="flex items-center gap-2">
            <span className="rbc-btn-group">
              {toolbarProps.views.map((name: string) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toolbarProps.onView(name)}
                  className={cn(toolbarProps.view === name && "rbc-active")}
                >
                  {name}
                </button>
              ))}
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
            </span>
          </div>
        </div>
      );
    },
  };

  const handleEventDrop = async ({ event, start, end }: any) => {
    if (!api) return;
    try {
      const deliverable = event.resource;
      await api.put(
        `cars/${deliverable.car_id}/deliverables/${deliverable._id}`,
        {
          edit_deadline: format(start, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
          updated_at: new Date(),
        }
      );

      toast.success("Deadline updated successfully");
      refetchDeliverables();
    } catch (error) {
      console.error("Error updating deliverable date:", error);
      toast.error("Failed to update deadline");
    }
  };

  const handleEventResize = async ({ event, start, end }: any) => {
    if (event.resource.type === "photo_gallery" || !api) return;

    try {
      const deliverable = event.resource;
      const durationInSeconds = Math.floor(
        (end.getTime() - start.getTime()) / 1000
      );

      await api.put(
        `cars/${deliverable.car_id}/deliverables/${deliverable._id}`,
        {
          duration: durationInSeconds,
          updated_at: new Date(),
        }
      );

      toast.success("Duration updated successfully");
      refetchDeliverables();
    } catch (error) {
      console.error("Error updating deliverable duration:", error);
      toast.error("Failed to update duration");
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

  // FIXED: Commented out blocking loading condition to prevent UI blocking
  // if (isLoading) {
  //   return (
  //     <div className="flex justify-center py-8">
  //       <div className="animate-pulse text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
  //         Loading calendar...
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div
      ref={calendarRef}
      className={cn(
        "relative calendar-container",
        isFullscreen ? "h-screen" : "h-[calc(100vh-12rem)]",
        "bg-[var(--background-primary)] dark:bg-[hsl(var(--background))]"
      )}
    >
      {/* Non-blocking loading indicator */}
      {isLoading && (
        <div className="bg-muted/30 border border-muted rounded-md p-3 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">
              Loading calendar data...
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Calendar interface is ready - data loading in background
          </p>
        </div>
      )}

      <div className="mb-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deliverables..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Select value={selectedCar} onValueChange={setSelectedCar}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by car" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cars</SelectItem>
              {cars.map((car) => (
                <SelectItem key={car._id} value={car._id}>
                  {`${car.year} ${car.make} ${car.model}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="Instagram Reels">Instagram Reels</SelectItem>
              <SelectItem value="Instagram Post">Instagram Post</SelectItem>
              <SelectItem value="Instagram Story">Instagram Story</SelectItem>
              <SelectItem value="YouTube">YouTube</SelectItem>
              <SelectItem value="YouTube Shorts">YouTube Shorts</SelectItem>
              <SelectItem value="TikTok">TikTok</SelectItem>
              <SelectItem value="Facebook">Facebook</SelectItem>
              <SelectItem value="Bring a Trailer">Bring a Trailer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Photo Gallery">Photo Gallery</SelectItem>
              <SelectItem value="Video">Video</SelectItem>
              <SelectItem value="Mixed Gallery">Mixed Gallery</SelectItem>
              <SelectItem value="Video Gallery">Video Gallery</SelectItem>
              <SelectItem value="Still">Still</SelectItem>
              <SelectItem value="Graphic">Graphic</SelectItem>
            </SelectContent>
          </Select>
          <Select value={creativeRole} onValueChange={setCreativeRole}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by creative role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {CREATIVE_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role
                    .split("_")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={editor} onValueChange={setEditor}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by editor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Editors</SelectItem>
              {filteredUsers.map((user) => (
                <SelectItem key={user._id} value={user.name}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DragAndDropCalendar
        localizer={localizer}
        events={events}
        startAccessor={(event) => (event as CalendarEvent).start}
        endAccessor={(event) => (event as CalendarEvent).end}
        eventPropGetter={(event) => eventStyleGetter(event as CalendarEvent)}
        dayPropGetter={dayPropGetter}
        views={["month", "week", "day"]}
        view={view}
        date={date}
        onView={(newView: View) => setView(newView)}
        onNavigate={(newDate: Date) => setDate(newDate)}
        min={new Date(0, 0, 0, 8, 0, 0)}
        max={new Date(0, 0, 0, 20, 0, 0)}
        components={components}
        className={cn(
          "deliverables-calendar",
          isFullscreen && "fullscreen-calendar",
          "dark:dark"
        )}
        onEventDrop={handleEventDrop}
        draggableAccessor={() => true}
        popup={true}
        selectable={true}
      />
    </div>
  );
}
