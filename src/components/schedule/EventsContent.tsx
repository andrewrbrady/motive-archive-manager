"use client";

import { useState, useEffect } from "react";
import { Event, EventStatus, EventType } from "@/types/event";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import EventBatchTemplates from "@/components/events/EventBatchTemplates";
import EventBatchManager from "@/components/events/EventBatchManager";
import { LoadingSpinner } from "@/components/ui/loading";

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

interface EventWithCar extends Event {
  car?: Car;
  _id?: string;
  start_date?: string;
  end_date?: string;
}

export default function EventsContent() {
  const [events, setEvents] = useState<EventWithCar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    from: "",
    to: "",
  });

  const formatEventType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "-";
      }
      return format(date, "PPp");
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "-";
    }
  };

  const getCarId = (eventId: string) => {
    try {
      // First try to split by "-" and get first part
      const parts = eventId.split("-");
      if (parts.length > 0) return parts[0];
      return eventId; // If no "-" found, return the whole ID
    } catch (error) {
      return eventId; // If any error occurs, return the original ID
    }
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append("status", filters.status);
      if (filters.type) queryParams.append("type", filters.type);
      if (filters.from) queryParams.append("from", filters.from);
      if (filters.to) queryParams.append("to", filters.to);

      const response = await fetch(`/api/events?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();

      // Performance optimization: Group events by car_id to reduce API calls
      const carIdToEvents = new Map<string, Event[]>();
      const eventsWithoutCarId: Event[] = [];

      // Group events by car_id
      data.forEach((event: Event) => {
        if (event.car_id) {
          if (!carIdToEvents.has(event.car_id)) {
            carIdToEvents.set(event.car_id, []);
          }
          const events = carIdToEvents.get(event.car_id);
          if (events) {
            events.push(event);
          }
        } else {
          eventsWithoutCarId.push(event);
        }
      });

      // Fetch car information in parallel
      const carPromises = Array.from(carIdToEvents.keys()).map(
        async (carId) => {
          try {
            const carResponse = await fetch(`/api/cars/${carId}`);
            if (!carResponse.ok)
              throw new Error(`Failed to fetch car ${carId}`);
            const car = await carResponse.json();
            return { carId, car };
          } catch (error) {
            console.error(`Error fetching car ${carId}:`, error);
            return { carId, car: null };
          }
        }
      );

      // Wait for all car fetches to complete
      const carsResults = await Promise.all(carPromises);

      // Create a map of car_id to car data
      const carIdToCarData = new Map();
      carsResults.forEach(({ carId, car }) => {
        carIdToCarData.set(carId, car);
      });

      // Combine events with their car data
      const eventsWithCars: EventWithCar[] = [];
      carIdToEvents.forEach((events, carId) => {
        const car = carIdToCarData.get(carId);
        events.forEach((event: Event) => {
          eventsWithCars.push({ ...event, car });
        });
      });

      // Add events without car_id
      eventsWithoutCarId.forEach((event: Event) => {
        eventsWithCars.push(event);
      });

      setEvents(eventsWithCars);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const handleUpdateStatus = async (
    eventId: string | undefined,
    carId: string | undefined,
    newStatus: EventStatus
  ) => {
    try {
      if (!eventId) {
        toast.error("Event ID is missing");
        return;
      }

      if (!carId) {
        toast.error("Car ID is missing");
        return;
      }

      const response = await fetch(`/api/cars/${carId}/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update event");
      }

      await fetchEvents();
      toast.success("Event status updated");
    } catch (error) {
      toast.error("Failed to update event status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center gap-2">
        <EventBatchManager />
        <EventBatchTemplates
          carId={events[0]?.car_id || ""}
          onEventsCreated={fetchEvents}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({ ...filters, status: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            {Object.values(EventStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {status
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.type}
          onValueChange={(value) => setFilters({ ...filters, type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            {Object.values(EventType).map((type) => (
              <SelectItem key={type} value={type}>
                {formatEventType(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          placeholder="From Date"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          className="bg-background"
        />

        <Input
          type="date"
          placeholder="To Date"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          className="bg-background"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Car</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event._id}>
                  <TableCell>
                    {event.car ? (
                      <Link
                        href={`/cars/${getCarId(event._id || "")}`}
                        className="hover:underline"
                      >
                        {event.car.year} {event.car.make} {event.car.model}
                      </Link>
                    ) : (
                      "Unknown Car"
                    )}
                  </TableCell>
                  <TableCell>{formatEventType(event.type)}</TableCell>
                  <TableCell>
                    <Select
                      value={event.status}
                      onValueChange={(value) =>
                        handleUpdateStatus(
                          event._id,
                          event.car_id,
                          value as EventStatus
                        )
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(EventStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status
                              .split("_")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                              )
                              .join(" ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{formatDate(event.start_date)}</TableCell>
                  <TableCell>{formatDate(event.end_date)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/cars/${getCarId(event._id || "")}/events/${
                        event._id
                      }`}
                    >
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
