"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, addHours } from "date-fns";
import { enUS } from "date-fns/locale";
import { Deliverable } from "@/types/deliverable";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import DeliverableTooltip from "./DeliverableTooltip";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./calendar.css";

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
  resource: DeliverableWithCar;
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

  const fetchDeliverables = async () => {
    try {
      const response = await fetch("/api/deliverables");
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
  }, []);

  const events = useMemo(() => {
    return deliverables.map((deliverable) => {
      const deadline = new Date(deliverable.edit_deadline);

      // For month view, show as all-day events
      if (view === "month") {
        return {
          id: deliverable._id?.toString() || "",
          title: `${
            deliverable.car
              ? `${deliverable.car.year} ${deliverable.car.make} ${deliverable.car.model} - `
              : ""
          }${deliverable.title}`,
          start: deadline,
          end: deadline,
          resource: deliverable,
          allDay: true,
        };
      }

      // For week/day views, create time-based events
      const start = new Date(deadline);
      start.setHours(9, 0, 0); // Start at 9 AM
      const end = new Date(deadline);
      end.setHours(17, 0, 0); // End at 5 PM

      // If it's a video, use the duration to calculate end time
      if (deliverable.type !== "photo_gallery" && deliverable.duration) {
        const durationInHours = deliverable.duration / 3600; // Convert seconds to hours
        end.setTime(start.getTime() + durationInHours * 60 * 60 * 1000);
      }

      return {
        id: deliverable._id?.toString() || "",
        title: `${
          deliverable.car
            ? `${deliverable.car.year} ${deliverable.car.make} ${deliverable.car.model} - `
            : ""
        }${deliverable.title}`,
        start,
        end,
        resource: deliverable,
        allDay: false,
      };
    });
  }, [deliverables, view]);

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "";
    let className = "";
    const status = event.resource.status;

    switch (status) {
      case "not_started":
        backgroundColor = "#ef4444";
        className = "not-started-event";
        break;
      case "in_progress":
        backgroundColor = "#f59e0b";
        className = "in-progress-event";
        break;
      case "done":
        backgroundColor = "#22c55e";
        className = "done-event";
        break;
      default:
        backgroundColor = "#6b7280";
        className = "default-event";
    }

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
        <DeliverableTooltip deliverable={event.resource}>
          <div
            style={{
              ...props.style,
              backgroundColor: eventStyleGetter(event).style.backgroundColor,
            }}
            className={eventStyleGetter(event).className}
          >
            {props.title}
          </div>
        </DeliverableTooltip>
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
    <div className="h-[calc(100vh-12rem)] calendar-container">
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
        className="deliverables-calendar"
        onEventDrop={handleEventDrop}
        draggableAccessor={() => true}
      />
    </div>
  );
}
