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

export default function DeliverablesCalendar() {
  const [deliverables, setDeliverables] = useState<DeliverableWithCar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [type, setType] = useState("");
  const [editor, setEditor] = useState("");
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState("");
  const [creativeRole, setCreativeRole] = useState("");
  const [users, setUsers] = useState<
    { _id: string; name: string; creativeRoles: string[] }[]
  >([]);

  const filteredUsers = useMemo(() => {
    if (!creativeRole || creativeRole === "all") return users;
    return users.filter((user) => user.creativeRoles.includes(creativeRole));
  }, [users, creativeRole]);

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

  const fetchCars = async () => {
    try {
      const response = await fetch("/api/cars");
      if (!response.ok) throw new Error("Failed to fetch cars");
      const data = await response.json();
      setCars(data.cars);
    } catch (error) {
      console.error("Error fetching cars:", error);
      toast.error("Failed to fetch cars");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(
        data.filter(
          (user: any) =>
            user.status === "active" && user.creativeRoles.length > 0
        )
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    }
  };

  useEffect(() => {
    fetchCars();
    fetchUsers();
  }, []);

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

  const fetchDeliverables = async () => {
    try {
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

      const response = await fetch(`/api/deliverables?${params}`);
      if (!response.ok) throw new Error("Failed to fetch deliverables");
      const data = await response.json();
      setDeliverables(data.deliverables);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      toast.error("Failed to fetch deliverables");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliverables();
  }, [search, status, platform, type, editor, selectedCar]);

  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    deliverables.forEach((deliverable) => {
      const deadline = new Date(deliverable.edit_deadline);
      const releaseDate = new Date(deliverable.release_date);
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
    const status = event.resource.status;
    const isDeadline = event.resource.isDeadline;

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
        isToday && "today-cell bg-zinc-50 dark:bg-zinc-900"
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
    try {
      const deliverable = event.resource;
      const response = await fetch(
        `/api/cars/${deliverable.car_id}/deliverables/${deliverable._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            edit_deadline: format(start, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
            updated_at: new Date(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update deliverable date");
      }

      toast.success("Deadline updated successfully");
      fetchDeliverables();
    } catch (error) {
      console.error("Error updating deliverable date:", error);
      toast.error("Failed to update deadline");
    }
  };

  const handleEventResize = async ({ event, start, end }: any) => {
    if (event.resource.type === "photo_gallery") return;

    try {
      const deliverable = event.resource;
      const durationInSeconds = Math.floor(
        (end.getTime() - start.getTime()) / 1000
      );

      const response = await fetch(
        `/api/cars/${deliverable.car_id}/deliverables/${deliverable._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            duration: durationInSeconds,
            updated_at: new Date(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update deliverable duration");
      }

      toast.success("Duration updated successfully");
      fetchDeliverables();
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-pulse text-zinc-500 dark:text-zinc-400">
          Loading calendar...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={calendarRef}
      className={cn(
        "relative calendar-container",
        isFullscreen ? "h-screen" : "h-[calc(100vh-12rem)]",
        "bg-white dark:bg-zinc-950"
      )}
    >
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
        startAccessor={(event: any) => event.start}
        endAccessor={(event: any) => event.end}
        eventPropGetter={eventStyleGetter}
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
